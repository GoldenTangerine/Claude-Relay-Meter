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
} from './services/api';
import { StatusBarConfig } from './interfaces/types';

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
    log('[激活] 插件开始激活...');

    // 初始化日志系统
    initializeLogging(context);

    // 创建状态栏项
    statusBarItem = createStatusBarItem();
    context.subscriptions.push(statusBarItem);

    // 注册命令
    registerCommands(context);

    // 监听配置变更
    registerConfigurationListener(context);

    // 监听窗口焦点变化
    registerWindowFocusListener(context);

    // 获取配置并验证
    const config = getConfiguration();
    const validation = validateApiConfig(config.apiUrl, config.apiId);

    if (!validation.valid) {
      // 配置无效，显示配置提示
      log(`[激活] 配置无效：${validation.message}`);
      showConfigPrompt(statusBarItem);

      // 显示提示消息
      vscode.window
        .showWarningMessage(
          `Claude Relay Meter: ${validation.message}`,
          '打开设置'
        )
        .then((selection) => {
          if (selection === '打开设置') {
            vscode.commands.executeCommand('claude-relay-meter.openSettings');
          }
        });
    } else {
      // 配置有效，开始更新数据
      log('[激活] 配置有效，开始初始化更新...');

      // 显示加载状态
      showLoadingStatus(statusBarItem);

      // 执行首次更新
      await updateStats();

      // 启动定时刷新
      startRefreshTimer();
    }

    log('[激活] 插件激活成功');
  } catch (error) {
    logError('[激活] 插件激活失败', error as Error);
    vscode.window.showErrorMessage(
      `Claude Relay Meter 激活失败：${(error as Error).message}`
    );
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
  log('[命令] 注册命令...');

  // 刷新统计命令
  const refreshCommand = vscode.commands.registerCommand(
    'claude-relay-meter.refreshStats',
    async () => {
      log('[命令] 手动刷新统计数据');
      await updateStats();
    }
  );

  // 打开设置命令
  const openSettingsCommand = vscode.commands.registerCommand(
    'claude-relay-meter.openSettings',
    () => {
      log('[命令] 打开设置');
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:your-publisher-name.claude-relay-meter'
      );
    }
  );

  context.subscriptions.push(refreshCommand, openSettingsCommand);
  log('[命令] 命令注册完成');
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
        log('[配置] 检测到配置变更');

        // 重启定时器
        startRefreshTimer();

        // 立即刷新数据
        await updateStats();
      }
    }
  );

  context.subscriptions.push(configListener);
  log('[配置] 配置监听器注册完成');
}

/**
 * 注册窗口焦点监听器
 * @param context - VSCode 扩展上下文
 */
function registerWindowFocusListener(context: vscode.ExtensionContext): void {
  const focusListener = vscode.window.onDidChangeWindowState((state) => {
    const wasFocused = isWindowFocused;
    isWindowFocused = state.focused;

    log(`[窗口] 窗口焦点变化：${wasFocused ? '有焦点' : '无焦点'} -> ${isWindowFocused ? '有焦点' : '无焦点'}`);

    if (isWindowFocused && !wasFocused) {
      // 窗口重新获得焦点，刷新数据
      log('[窗口] 窗口重新获得焦点，刷新数据');
      updateStats();
      startRefreshTimer();
    } else if (!isWindowFocused && wasFocused) {
      // 窗口失去焦点，暂停刷新（可选）
      log('[窗口] 窗口失去焦点');
      // 注意：这里不停止定时器，让它继续在后台运行
      // 如果想在失去焦点时暂停，可以取消下面的注释
      // stopRefreshTimer();
    }
  });

  context.subscriptions.push(focusListener);
  log('[窗口] 窗口焦点监听器注册完成');
}

/**
 * 更新统计数据
 */
async function updateStats(): Promise<void> {
  try {
    log('[更新] 开始更新统计数据...');

    // 获取配置
    const config = getConfiguration();

    // 验证配置
    const validation = validateApiConfig(config.apiUrl, config.apiId);
    if (!validation.valid) {
      log(`[更新] 配置无效：${validation.message}`, true);
      showConfigPrompt(statusBarItem);
      return;
    }

    // 显示加载状态
    showLoadingStatus(statusBarItem);

    // 获取数据（带重试）
    const data = await fetchRelayStatsWithRetry(
      config.apiUrl,
      config.apiId,
      3, // 最多重试 3 次
      1000 // 初始延迟 1 秒
    );

    // 更新状态栏
    updateStatusBar(statusBarItem, data);

    log('[更新] 统计数据更新成功');
  } catch (error) {
    logError('[更新] 更新统计数据失败', error as Error);
    showErrorStatus(statusBarItem, '获取数据失败');

    // 显示错误提示（仅在首次失败时显示）
    vscode.window
      .showErrorMessage(
        `Claude Relay Meter: 获取数据失败 - ${(error as Error).message}`,
        '重试',
        '打开设置'
      )
      .then((selection) => {
        if (selection === '重试') {
          updateStats();
        } else if (selection === '打开设置') {
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

  log(`[定时器] 启动定时刷新，间隔：${config.refreshInterval} 秒`);

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

  return {
    apiUrl: config.get<string>('apiUrl', ''),
    apiId: config.get<string>('apiId', ''),
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
