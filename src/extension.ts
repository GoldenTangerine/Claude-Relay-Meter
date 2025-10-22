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
import * as ConfigManager from './utils/configManager';
import * as ClaudeSettingsWatcher from './utils/claudeSettingsWatcher';
import { readClaudeSettings } from './utils/claudeSettingsReader';

// 全局变量
let statusBarItem: vscode.StatusBarItem;
let refreshTimer: NodeJS.Timeout | undefined;
let isWindowFocused: boolean = true;

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

    // 初始化配置:如果设置为空,自动从 Claude Settings 读取并填入
    await initializeConfigFromClaudeSettings();

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

    // 启动文件监听器（检查监听开关是否启用）
    if (ConfigManager.isWatchEnabled()) {
      ClaudeSettingsWatcher.startWatching(updateStats);
      log('[激活] 文件监听已启动');
    } else {
      log('[激活] 文件监听已禁用');
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

  // 停止文件监听
  ClaudeSettingsWatcher.stopWatching();

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

        // 检查是否是监听开关变更
        if (event.affectsConfiguration('relayMeter.watchClaudeSettings')) {
          const watchEnabled = ConfigManager.isWatchEnabled();
          if (watchEnabled) {
            // 开启监听
            ClaudeSettingsWatcher.startWatching(updateStats);
            log('[配置变更] 文件监听已开启');
          } else {
            // 关闭监听
            ClaudeSettingsWatcher.stopWatching();
            log('[配置变更] 文件监听已关闭');
          }
        }

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
 * 更新统计数据
 */
async function updateStats(): Promise<void> {
  try {
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

  // 直接从 VSCode 设置读取配置
  const apiUrl = config.get<string>('apiUrl', '');
  const apiId = config.get<string>('apiId', '');
  const apiKey = config.get<string>('apiKey', '');

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

/**
 * 初始化配置:如果设置为空,自动从 Claude Settings 读取并填入
 */
async function initializeConfigFromClaudeSettings(): Promise<void> {
  // 检查当前是否已有配置
  if (ConfigManager.hasConfig()) {
    log('[初始化] 已有配置,跳过从 Claude Settings 初始化');
    return;
  }

  // 从 Claude Settings 读取配置
  const claudeSettings = readClaudeSettings();

  if (!claudeSettings.apiKey || !claudeSettings.apiUrl) {
    log('[初始化] Claude Settings 中没有有效配置');
    return;
  }

  // 写入 VSCode 设置
  try {
    await ConfigManager.updateVSCodeConfig(claudeSettings.apiKey, claudeSettings.apiUrl);
    log('[初始化] 从 Claude Settings 自动填入配置成功');
  } catch (error) {
    if (error instanceof Error) {
      log(`[初始化] 从 Claude Settings 填入配置失败: ${error.message}`, true);
    }
  }
}
