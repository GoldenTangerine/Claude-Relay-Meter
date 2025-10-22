/**
 * 文件说明:Claude Settings 文件监听器
 * 作用:监听 ~/.claude/settings.json 文件变更,自动检测配置变更并提示用户
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
 * 防抖延迟(毫秒)
 */
const DEBOUNCE_DELAY = 300;

/**
 * 刷新回调函数(用于刷新数据)
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
 * @param onRefresh - 配置更新后的刷新回调函数(可选)
 */
export function startWatching(onRefresh?: () => Promise<void>): void {
  // 保存刷新回调
  refreshCallback = onRefresh;

  // 如果已经在监听,先停止
  if (fileWatcher) {
    stopWatching();
  }

  const settingsPath = getClaudeSettingsPath();

  // 检查文件是否存在
  if (!fs.existsSync(settingsPath)) {
    log(`[Settings Watcher] Claude Settings 文件不存在,无法启动监听: ${settingsPath}`);
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
 * 文件变更处理(防抖)
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

    // 1. 读取 Claude Settings 新配置
    const claudeSettings = readClaudeSettings();

    if (!claudeSettings.apiKey || !claudeSettings.apiUrl) {
      log('[Settings Watcher] Claude Settings 中没有有效配置,跳过处理');
      return;
    }

    const newConfig: ConfigManager.Config = {
      apiKey: claudeSettings.apiKey,
      apiUrl: claudeSettings.apiUrl
    };

    // 2. 获取当前 VSCode 设置中的配置
    const currentConfig = ConfigManager.getVSCodeConfig();

    // 3. 比对新配置与当前配置
    if (ConfigManager.compareConfigs(newConfig, currentConfig)) {
      log('[Settings Watcher] 新配置与当前配置相同,跳过提示');
      return;
    }

    // 4. 配置不同,提示用户选择
    log('[Settings Watcher] 检测到新的配置变更,准备提示用户');
    await promptUserChoice(newConfig, currentConfig);

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
  newConfig: ConfigManager.Config,
  currentConfig: ConfigManager.Config | null
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

  // 显示提示(立即弹出,不等待)
  const choice = await vscode.window.showInformationMessage(
    message,
    { modal: false },
    useNewConfigButton,
    keepCurrentConfigButton,
    openSettingsButton
  );

  // 处理用户选择
  if (choice === useNewConfigButton) {
    // 选择"使用新配置"
    log('[Settings Watcher] 用户选择:使用新配置');
    await applyNewConfig(newConfig);
  } else if (!choice || choice === keepCurrentConfigButton) {
    // 用户关闭了提示框(Esc 或点击 X),或选择"保持当前配置"
    log('[Settings Watcher] 用户选择:保持当前配置并关闭监听');
    await disableWatching();
  } else if (choice === openSettingsButton) {
    // 打开设置
    log('[Settings Watcher] 用户选择:打开设置');
    vscode.commands.executeCommand('workbench.action.openSettings', 'relayMeter');
  }
}

/**
 * 应用新配置
 * @param newConfig - 新配置
 */
async function applyNewConfig(newConfig: ConfigManager.Config): Promise<void> {
  try {
    // 1. 更新 VSCode 设置
    await ConfigManager.updateVSCodeConfig(newConfig.apiKey, newConfig.apiUrl);

    // 2. 显示成功提示
    vscode.window.showInformationMessage(t('notifications.configUpdated'));

    log('[Settings Watcher] 新配置已应用');

    // 3. 触发刷新回调
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
 * 关闭监听功能
 */
async function disableWatching(): Promise<void> {
  try {
    // 1. 关闭监听开关
    await ConfigManager.setWatchEnabled(false);

    // 2. 停止文件监听
    stopWatching();

    // 3. 显示提示
    vscode.window.showInformationMessage(t('notifications.watchDisabled'));

    log('[Settings Watcher] 监听已关闭');
  } catch (error) {
    if (error instanceof Error) {
      log(`[Settings Watcher] 关闭监听失败: ${error.message}`, true);
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
