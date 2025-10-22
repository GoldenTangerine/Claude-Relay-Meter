/**
 * 文件说明：Claude Settings 文件监听器
 * 作用：监听 ~/.claude/settings.json 文件变更，自动检测配置变更并提示用户
 * @author sm
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { log } from './logger';
import { readClaudeSettings } from './claudeSettingsReader';
import * as ConfigManager from './configManager';
import { t } from './i18n';

/**
 * 文件监听器实例
 */
let fileWatcher: fs.FSWatcher | undefined;

/**
 * 防抖定时器
 */
let debounceTimer: NodeJS.Timeout | undefined;

/**
 * 防抖延迟（毫秒）
 */
const DEBOUNCE_DELAY = 300;

/**
 * 扩展上下文
 */
let extensionContext: vscode.ExtensionContext | undefined;

/**
 * 刷新回调函数（用于刷新数据）
 */
let refreshCallback: (() => Promise<void>) | undefined;

/**
 * 获取 Claude Settings 文件路径
 * @returns settings.json 的完整路径
 */
function getClaudeSettingsPath(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'settings.json');
}

/**
 * 启动文件监听
 * @param context - VSCode 扩展上下文
 * @param onRefresh - 配置更新后的刷新回调函数（可选）
 */
export function startWatching(context: vscode.ExtensionContext, onRefresh?: () => Promise<void>): void {
  // 保存上下文和回调
  extensionContext = context;
  refreshCallback = onRefresh;

  // 如果已经在监听，先停止
  if (fileWatcher) {
    stopWatching();
  }

  const settingsPath = getClaudeSettingsPath();

  // 检查文件是否存在
  if (!fs.existsSync(settingsPath)) {
    log(`[Settings Watcher] Claude Settings 文件不存在，无法启动监听: ${settingsPath}`);
    return;
  }

  try {
    // 启动文件监听
    fileWatcher = fs.watch(settingsPath, (eventType, filename) => {
      if (eventType === 'change') {
        log('[Settings Watcher] 检测到文件变更');
        handleFileChange();
      }
    });

    log('[Settings Watcher] 文件监听已启动');
  } catch (error) {
    if (error instanceof Error) {
      log(`[Settings Watcher] 启动文件监听失败: ${error.message}`, true);
    }
  }
}

/**
 * 停止文件监听
 */
export function stopWatching(): void {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = undefined;
    log('[Settings Watcher] 文件监听已停止');
  }

  // 清理防抖定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = undefined;
  }
}

/**
 * 文件变更处理（防抖）
 */
function handleFileChange(): void {
  // 清除之前的定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // 设置新的定时器
  debounceTimer = setTimeout(() => {
    checkAndHandleConfigChange();
  }, DEBOUNCE_DELAY);
}

/**
 * 检查并处理配置变更
 */
async function checkAndHandleConfigChange(): Promise<void> {
  try {
    log('[Settings Watcher] 开始检查配置变更...');

    // 1. 读取新配置
    const newConfig = readClaudeSettings();

    if (!newConfig.apiKey || !newConfig.apiUrl) {
      log('[Settings Watcher] 新配置无效，跳过处理');
      return;
    }

    // 类型转换：此时我们确定 apiKey 和 apiUrl 存在
    const validNewConfig: ConfigManager.RuntimeConfig = {
      apiKey: newConfig.apiKey,
      apiUrl: newConfig.apiUrl
    };

    // 2. 获取已跳过配置
    const skippedConfig = ConfigManager.getSkippedConfig();

    // 3. 比对新配置与已跳过配置
    if (skippedConfig && ConfigManager.compareConfigs(validNewConfig, skippedConfig)) {
      log('[Settings Watcher] 新配置与已跳过配置相同，跳过提示');
      return;
    }

    // 4. 配置不同，提示用户选择
    log('[Settings Watcher] 检测到新的配置变更，准备提示用户');

    const currentConfig = ConfigManager.getRuntimeConfig();
    await promptUserChoice(validNewConfig, currentConfig);

  } catch (error) {
    if (error instanceof Error) {
      log(`[Settings Watcher] 处理配置变更失败: ${error.message}`, true);
    }
  }
}

/**
 * 提示用户选择
 * @param newConfig - 新配置
 * @param currentConfig - 当前配置
 */
async function promptUserChoice(
  newConfig: ConfigManager.RuntimeConfig,
  currentConfig: ConfigManager.RuntimeConfig | null
): Promise<void> {
  // 构建提示消息
  const message = t('notifications.claudeConfigChangedDetail', {
    currentUrl: currentConfig?.apiUrl || t('common.none') || '无',
    currentKey: ConfigManager.maskApiKey(currentConfig?.apiKey || ''),
    newUrl: newConfig.apiUrl,
    newKey: ConfigManager.maskApiKey(newConfig.apiKey)
  });

  // 定义按钮
  const useNewConfigButton = t('notifications.useNewConfig');
  const keepCurrentConfigButton = t('notifications.keepCurrentConfig');
  const openSettingsButton = t('commands.openSettings');

  // 显示提示（立即弹出，不等待）
  const choice = await vscode.window.showInformationMessage(
    message,
    { modal: false },
    useNewConfigButton,
    keepCurrentConfigButton,
    openSettingsButton
  );

  // 处理用户选择
  if (!choice) {
    // 用户关闭了提示框（Esc 或点击 X），默认使用新配置
    log('[Settings Watcher] 用户关闭提示框，默认使用新配置');
    await applyNewConfig(newConfig);
  } else if (choice === useNewConfigButton) {
    // 使用新配置
    log('[Settings Watcher] 用户选择：使用新配置');
    await applyNewConfig(newConfig);
  } else if (choice === keepCurrentConfigButton) {
    // 保持当前配置
    log('[Settings Watcher] 用户选择：保持当前配置');
    await keepCurrentConfig(newConfig);
  } else if (choice === openSettingsButton) {
    // 打开设置
    log('[Settings Watcher] 用户选择：打开设置');
    vscode.commands.executeCommand('workbench.action.openSettings', 'relayMeter');
  }
}

/**
 * 应用新配置
 * @param newConfig - 新配置
 */
async function applyNewConfig(newConfig: ConfigManager.RuntimeConfig): Promise<void> {
  try {
    // 1. 清空已跳过配置
    await ConfigManager.clearSkippedConfig();

    // 2. 保存新配置到运行时配置
    await ConfigManager.setRuntimeConfig(newConfig);

    // 3. 显示成功提示
    vscode.window.showInformationMessage(t('notifications.configUpdated'));

    log('[Settings Watcher] 新配置已应用');

    // 4. 触发刷新回调
    if (refreshCallback) {
      await refreshCallback();
    }
  } catch (error) {
    if (error instanceof Error) {
      log(`[Settings Watcher] 应用新配置失败: ${error.message}`, true);
      vscode.window.showErrorMessage(`应用新配置失败: ${error.message}`);
    }
  }
}

/**
 * 保持当前配置
 * @param newConfig - 新配置（将被保存为已跳过配置）
 */
async function keepCurrentConfig(newConfig: ConfigManager.RuntimeConfig): Promise<void> {
  try {
    // 将新配置保存到已跳过配置
    await ConfigManager.setSkippedConfig(newConfig);

    // 显示提示
    vscode.window.showInformationMessage(t('notifications.configKept'));

    log('[Settings Watcher] 已保持当前配置，新配置已标记为跳过');
  } catch (error) {
    if (error instanceof Error) {
      log(`[Settings Watcher] 保存已跳过配置失败: ${error.message}`, true);
    }
  }
}

/**
 * 检查是否正在监听
 * @returns 如果正在监听返回 true
 */
export function isWatching(): boolean {
  return fileWatcher !== undefined;
}
