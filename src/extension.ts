/**
 * 文件说明：VSCode 插件主入口
 * 作用：插件生命周期管理、命令注册、定时更新等
 */

import * as vscode from 'vscode';
import { initializeLogging, log, logError } from './utils/logger';
import {
  createStatusBarItem,
  updateStatusBar,
  showErrorStatus,
  showLoadingStatus,
  showConfigPrompt,
} from './handlers/statusBar';
import {
  fetchRelayStatsWithRetry,
  validateApiConfig,
  getApiIdFromKey,
} from './services/api';
import { StatusBarConfig } from './interfaces/types';
import { initializeI18n, t, setOnLanguageChangeCallback } from './utils/i18n';
import { readClaudeSettings } from './utils/claudeSettingsReader';

// 全局变量
let statusBarItem: vscode.StatusBarItem;
let refreshTimer: NodeJS.Timeout | undefined;
let isWindowFocused: boolean = true;

// 记录上次从 Claude Code settings 读取的配置（用于检测变更）
let lastClaudeSettings: { apiUrl?: string; apiKey?: string } | null = null;
// 标记是否完全使用 Claude settings（用户未手动配置任何内容）
let isUsingClaudeSettings: boolean = false;

/**
 * 插件激活时调用
 * @param context - VSCode 扩展上下文
 */
export async function activate(context: vscode.ExtensionContext) {
  try {
    // ⚠️ 关键修改：必须首先初始化日志系统，然后才能调用 log()
    initializeLogging(context);

    // 初始化国际化系统（在日志之后、其他初始化之前）
    initializeI18n();

    // 设置语言变更回调
    setOnLanguageChangeCallback((newLanguage: string, languageLabel: string) => {
      log(t('logs.languageChanged', { language: newLanguage }));
      // 刷新状态栏显示
      if (statusBarItem) {
        updateStats(); // 重新加载数据以更新显示
      }
    });

    log(t('logs.activating'));

    // 创建状态栏项
    statusBarItem = createStatusBarItem();
    context.subscriptions.push(statusBarItem);

    // ⚠️ 关键：立即显示状态栏项，确保用户能看到
    // 即使配置无效，状态栏也应该显示提示
    statusBarItem.text = `$(sync~spin) ${t('statusBar.initializing')}`;
    statusBarItem.show();
    log(t('logs.statusBarCreated'));

    // 注册命令
    registerCommands(context);

    // 监听配置变更
    registerConfigurationListener(context);

    // 监听窗口焦点变化
    registerWindowFocusListener(context);

    // 获取配置并验证
    const config = getConfiguration();
    log(`[配置] API URL: ${config.apiUrl ? '已配置' : '未配置'}, API ID: ${config.apiId ? '已配置' : '未配置'}, API Key: ${config.apiKey ? '已配置' : '未配置'}`);

    const validation = validateApiConfig(config.apiUrl, config.apiId, config.apiKey);

    if (!validation.valid) {
      // 配置无效，显示配置提示
      log(t('logs.configInvalid', { message: validation.message || '' }));

      // ⚠️ 关键：显示配置提示状态栏（这会确保状态栏可见）
      showConfigPrompt(statusBarItem, validation.missingConfig);

      // 显示更友好的首次配置提示
      vscode.window
        .showWarningMessage(
          t('notifications.configInvalid', { message: validation.message || '' }),
          t('commands.configureNow'),
          t('commands.later')
        )
        .then((selection) => {
          if (selection === t('commands.configureNow')) {
            vscode.commands.executeCommand('claude-relay-meter.openSettings');
          }
        });
    } else {
      // 配置有效，开始更新数据
      log(t('logs.configValid'));

      // 显示加载状态
      showLoadingStatus(statusBarItem);

      // 执行首次更新
      await updateStats();

      // 启动定时刷新
      startRefreshTimer();
    }

    log(t('logs.activationComplete'));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError('[激活] ✗ 插件激活失败', error as Error);

    // 确保错误显示给用户
    vscode.window.showErrorMessage(
      t('errors.activationFailed', { error: errorMessage })
    );

    // 重新抛出错误以便 VSCode 知道激活失败
    throw error;
  }
}

/**
 * 插件停用时调用
 */
export function deactivate() {
  log('[停用] 插件开始停用...');

  // 清理定时器
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = undefined;
    log('[停用] 已清理定时器');
  }

  log('[停用] 插件停用完成');
}

/**
 * 注册命令
 * @param context - VSCode 扩展上下文
 */
function registerCommands(context: vscode.ExtensionContext): void {
  // 刷新统计命令
  const refreshCommand = vscode.commands.registerCommand(
    'claude-relay-meter.refreshStats',
    async () => {
      log(t('logs.manualRefresh'));
      await updateStats();
    }
  );

  // 打开设置命令
  const openSettingsCommand = vscode.commands.registerCommand(
    'claude-relay-meter.openSettings',
    () => {
      log(t('logs.openingSettings'));
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'relayMeter'
      );
    }
  );

  // 语言选择命令
  const selectLanguageCommand = vscode.commands.registerCommand(
    'claude-relay-meter.selectLanguage',
    async () => {
      const languages = [
        { label: '中文', value: 'zh' },
        { label: 'English', value: 'en' }
      ];
      const selected = await vscode.window.showQuickPick(languages, {
        placeHolder: t('commands.selectLanguagePrompt')
      });
      if (selected) {
        await vscode.workspace.getConfiguration('relayMeter')
          .update('language', selected.value, true);
        vscode.window.showInformationMessage(
          t('commands.languageChanged', { language: selected.label })
        );
      }
    }
  );

  // 打开网页仪表板命令
  const openWebDashboardCommand = vscode.commands.registerCommand(
    'claude-relay-meter.openWebDashboard',
    async (args?: { url: string }) => {
      if (args && args.url) {
        log(`[命令] 打开网页仪表板：${args.url}`);
        await vscode.env.openExternal(vscode.Uri.parse(args.url));
      }
    }
  );

  context.subscriptions.push(refreshCommand, openSettingsCommand, selectLanguageCommand, openWebDashboardCommand);
}

/**
 * 注册配置变更监听器
 * @param context - VSCode 扩展上下文
 */
function registerConfigurationListener(context: vscode.ExtensionContext): void {
  const configListener = vscode.workspace.onDidChangeConfiguration(
    async (event) => {
      // 检查是否是插件相关的配置变更
      if (event.affectsConfiguration('relayMeter')) {
        log(t('logs.configChanged'));

        // 重启定时器
        startRefreshTimer();

        // 立即刷新数据
        await updateStats();
      }
    }
  );

  context.subscriptions.push(configListener);
}

/**
 * 注册窗口焦点监听器
 * @param context - VSCode 扩展上下文
 */
function registerWindowFocusListener(context: vscode.ExtensionContext): void {
  const focusListener = vscode.window.onDidChangeWindowState((state) => {
    const wasFocused = isWindowFocused;
    isWindowFocused = state.focused;

    if (isWindowFocused && !wasFocused) {
      // 窗口重新获得焦点，刷新数据
      log(t('logs.windowFocused'));
      updateStats();
      startRefreshTimer();
    }
  });

  context.subscriptions.push(focusListener);
}

/**
 * 检查 Claude Code settings 是否有变更
 * @returns 如果有变更返回新的配置，否则返回 null
 */
function checkClaudeSettingsChange(): { apiUrl?: string; apiKey?: string } | null {
  // 只有在完全使用 Claude settings 时才检测变更
  if (!isUsingClaudeSettings || !lastClaudeSettings) {
    return null;
  }

  // 读取当前 Claude settings
  const currentSettings = readClaudeSettings();

  // 如果当前 settings 为空，说明配置文件可能被删除了
  if (Object.keys(currentSettings).length === 0) {
    log('[配置变更检测] Claude Code 配置文件不存在或为空');
    return null;
  }

  // 比较是否有变化
  const urlChanged = currentSettings.apiUrl !== lastClaudeSettings.apiUrl;
  const keyChanged = currentSettings.apiKey !== lastClaudeSettings.apiKey;
  const hasChange = urlChanged || keyChanged;

  if (hasChange) {
    log('[配置变更检测] 检测到 Claude Code 配置已变更');
    if (urlChanged) {
      log(`[配置变更检测] API URL 变更: ${lastClaudeSettings.apiUrl} -> ${currentSettings.apiUrl}`);
    }
    if (keyChanged) {
      const oldKeyPreview = lastClaudeSettings.apiKey ? lastClaudeSettings.apiKey.substring(0, 10) + '...' : 'N/A';
      const newKeyPreview = currentSettings.apiKey ? currentSettings.apiKey.substring(0, 10) + '...' : 'N/A';
      log(`[配置变更检测] API Key 变更: ${oldKeyPreview} -> ${newKeyPreview}`);
    }
    return currentSettings;
  }

  return null;
}

/**
 * 更新统计数据
 */
async function updateStats(): Promise<void> {
  try {
    // 检查 Claude settings 是否有变更（仅当完全使用 Claude settings 时）
    const newClaudeSettings = checkClaudeSettingsChange();

    if (newClaudeSettings) {
      // 检测到配置变更
      log('[配置变更] 检测到 Claude Code 配置已变更，提示用户');

      // 构建变更信息
      const oldUrl = lastClaudeSettings?.apiUrl || 'N/A';
      const newUrl = newClaudeSettings.apiUrl || 'N/A';

      // 显示提示信息
      const selection = await vscode.window.showInformationMessage(
        t('notifications.claudeSettingsChanged', {
          oldUrl: oldUrl,
          newUrl: newUrl
        }),
        t('notifications.useNewSettings'),
        t('notifications.keepOldSettings')
      );

      if (selection === t('notifications.useNewSettings')) {
        // 用户选择使用新配置
        log('[配置变更] 用户确认使用新的 Claude Code 配置');

        // 更新保存的配置
        lastClaudeSettings = {
          apiUrl: newClaudeSettings.apiUrl,
          apiKey: newClaudeSettings.apiKey
        };

        // 继续刷新（使用新配置）
        // 递归调用 updateStats，此时将使用新配置
        await updateStats();
        return;
      } else {
        // 用户选择保持当前配置或关闭了提示框
        log('[配置变更] 用户选择保持当前配置或未响应');
        // 继续使用旧配置刷新
      }
    }

    log(t('logs.fetchingData'));

    // 获取配置
    const config = getConfiguration();

    // 先验证基础配置（API URL 和 API ID/Key 至少一个存在）
    const validation = validateApiConfig(config.apiUrl, config.apiId, config.apiKey);
    if (!validation.valid) {
      log(t('logs.configInvalid', { message: validation.message || '' }), true);
      showConfigPrompt(statusBarItem, validation.missingConfig);
      return;
    }

    // 获取实际的 API ID（优先使用 apiId，其次使用 apiKey 转换）
    let actualApiId = config.apiId;

    // 如果 apiId 为空但 apiKey 存在，则通过 apiKey 获取 apiId
    if ((!actualApiId || actualApiId.trim() === '') && config.apiKey && config.apiKey.trim() !== '') {
      try {
        log(t('api.gettingApiIdFromKey'));
        actualApiId = await getApiIdFromKey(config.apiUrl, config.apiKey);
        log(`[更新] 通过 API Key 获取到 API ID：${actualApiId}`);
      } catch (error) {
        logError('[更新] 通过 API Key 获取 API ID 失败', error as Error);
        throw new Error(t('errors.cannotGetApiIdFromKey', { error: (error as Error).message }));
      }
    }

    // 显示加载状态
    showLoadingStatus(statusBarItem);

    // 获取数据（带重试）
    const data = await fetchRelayStatsWithRetry(
      config.apiUrl,
      actualApiId,
      3, // 最多重试 3 次
      1000 // 初始延迟 1 秒
    );

    // 更新状态栏
    updateStatusBar(statusBarItem, data, config.apiUrl, actualApiId);

    log(t('logs.dataFetched'));
  } catch (error) {
    logError('[更新] 更新统计数据失败', error as Error);
    showErrorStatus(statusBarItem, t('statusBar.error'));

    // 显示错误提示（仅在首次失败时显示）
    vscode.window
      .showErrorMessage(
        t('notifications.errorOccurred', { error: (error as Error).message }),
        t('notifications.retryOption'),
        t('notifications.openSettingsOption')
      )
      .then((selection) => {
        if (selection === t('notifications.retryOption')) {
          updateStats();
        } else if (selection === t('notifications.openSettingsOption')) {
          vscode.commands.executeCommand('claude-relay-meter.openSettings');
        }
      });
  }
}

/**
 * 启动定时刷新
 */
function startRefreshTimer(): void {
  // 先停止现有的定时器
  stopRefreshTimer();

  // 获取刷新间隔配置
  const config = getConfiguration();
  const intervalMs = config.refreshInterval * 1000;

  log(t('logs.timerStarted', { interval: config.refreshInterval }));

  // 创建新的定时器
  refreshTimer = setInterval(async () => {
    // 只在窗口有焦点时更新（可选）
    if (isWindowFocused) {
      log('[定时器] 执行定时更新...');
      await updateStats();
    } else {
      log('[定时器] 窗口无焦点，跳过此次更新');
    }
  }, intervalMs);
}

/**
 * 停止定时刷新
 */
function stopRefreshTimer(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
    log('[定时器] 已停止定时刷新');
  }
}

/**
 * 获取插件配置
 * @returns 配置对象
 */
function getConfiguration(): StatusBarConfig {
  const config = vscode.workspace.getConfiguration('relayMeter');

  // 读取用户配置
  let apiUrl = config.get<string>('apiUrl', '');
  let apiId = config.get<string>('apiId', '');
  let apiKey = config.get<string>('apiKey', '');

  // 检查用户是否完全未配置（用于判断是否需要监测 Claude settings 变更）
  const userConfigEmpty =
    (!apiUrl || apiUrl.trim() === '') &&
    (!apiId || apiId.trim() === '') &&
    (!apiKey || apiKey.trim() === '');

  // 检查是否需要从 Claude Code settings.json 读取配置
  const needApiUrl = !apiUrl || apiUrl.trim() === '';
  const needApiKey = (!apiId || apiId.trim() === '') && (!apiKey || apiKey.trim() === '');

  // 如果用户未配置 API URL 或 API Key/ID，尝试从 Claude Code 配置读取
  if (needApiUrl || needApiKey) {
    log('[配置] 检测到部分配置缺失，尝试从 Claude Code 配置读取...');

    try {
      const claudeSettings = readClaudeSettings();

      // 如果成功读取到配置
      if (Object.keys(claudeSettings).length > 0) {
        // 优先使用用户手动配置，如果为空则使用 Claude settings
        if (needApiUrl && claudeSettings.apiUrl) {
          apiUrl = claudeSettings.apiUrl;
          log(`[配置] 从 Claude Code 配置读取到 API URL: ${apiUrl}`);
        }

        if (needApiKey && claudeSettings.apiKey) {
          apiKey = claudeSettings.apiKey;
          log(`[配置] 从 Claude Code 配置读取到 API Key: ${apiKey.substring(0, 10)}...`);
        }

        // 如果用户完全未配置，标记为使用 Claude settings，并保存配置用于后续检测变更
        if (userConfigEmpty) {
          isUsingClaudeSettings = true;
          lastClaudeSettings = {
            apiUrl: claudeSettings.apiUrl,
            apiKey: claudeSettings.apiKey
          };
          log('[配置] 用户完全未手动配置，将监测 Claude Code 配置变更');
        } else {
          isUsingClaudeSettings = false;
          log('[配置] 用户部分手动配置，不监测 Claude Code 配置变更');
        }

        log('[配置] Claude Code 配置读取成功');
      } else {
        log('[配置] Claude Code 配置文件未找到或为空');
        isUsingClaudeSettings = false;
      }
    } catch (error) {
      log(`[配置] 从 Claude Code 配置读取失败: ${error instanceof Error ? error.message : String(error)}`, true);
      isUsingClaudeSettings = false;
    }
  } else {
    // 用户已完全配置，不需要从 Claude settings 读取
    isUsingClaudeSettings = false;
  }

  return {
    apiUrl,
    apiId,
    apiKey,
    refreshInterval: Math.max(config.get<number>('refreshInterval', 60), 10),
    enableStatusBarColors: config.get<boolean>('enableStatusBarColors', true),
    colorThresholds: config.get('colorThresholds', { low: 50, medium: 80 }),
    customColors: config.get('customColors', {
      low: '#66BB6A',
      medium: '#FFD700',
      high: '#FF6600',
    }),
    enableLogging: config.get<boolean>('enableLogging', true),
  };
}

/**
 * 获取刷新间隔（毫秒）
 * @returns 刷新间隔（毫秒）
 */
export function getRefreshIntervalMs(): number {
  const config = getConfiguration();
  return config.refreshInterval * 1000;
}
