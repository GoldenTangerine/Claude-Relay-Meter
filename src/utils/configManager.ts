/**
 * 文件说明：配置管理器
 * 作用：统一管理手动配置、运行时配置和已跳过配置
 * @author sm
 */

import * as vscode from 'vscode';
import { log } from './logger';
import { readClaudeSettings, ClaudeSettingsResult } from './claudeSettingsReader';

/**
 * 运行时配置接口（从 Claude Settings 读取并实际使用的配置）
 */
export interface RuntimeConfig {
  apiKey: string;
  apiUrl: string;
}

/**
 * globalState 存储的键名
 */
const RUNTIME_CONFIG_KEY = 'claude-relay-meter.runtimeConfig';
const SKIPPED_CONFIG_KEY = 'claude-relay-meter.skippedConfig';

/**
 * 扩展上下文（用于访问 globalState）
 */
let extensionContext: vscode.ExtensionContext | undefined;

/**
 * 初始化配置管理器
 * @param context - VSCode 扩展上下文
 */
export function initialize(context: vscode.ExtensionContext): void {
  extensionContext = context;
  log('[Config Manager] 配置管理器已初始化');
}

/**
 * 确保扩展上下文已初始化
 */
function ensureInitialized(): vscode.ExtensionContext {
  if (!extensionContext) {
    throw new Error('配置管理器未初始化，请先调用 initialize()');
  }
  return extensionContext;
}

/**
 * 检查是否有手动配置
 * @returns 如果配置了 apiKey 或 apiId 则返回 true
 */
export function hasManualConfig(): boolean {
  const config = vscode.workspace.getConfiguration('relayMeter');
  const apiKey = config.get<string>('apiKey');
  const apiId = config.get<string>('apiId');
  const apiUrl = config.get<string>('apiUrl');

  // 只要有 URL 和 (Key 或 ID) 中的任一个，就认为有手动配置
  const hasManual = !!(apiUrl && (apiKey || apiId));

  log(`[Config Manager] 检查手动配置: ${hasManual ? '存在' : '不存在'}`);
  return hasManual;
}

/**
 * 获取手动配置
 * @returns 手动配置或 null
 */
export function getManualConfig(): RuntimeConfig | null {
  const config = vscode.workspace.getConfiguration('relayMeter');
  const apiKey = config.get<string>('apiKey');
  const apiId = config.get<string>('apiId');
  const apiUrl = config.get<string>('apiUrl');

  // 如果有手动配置的 URL
  if (apiUrl) {
    // 优先使用 apiId，如果没有则使用 apiKey
    const effectiveKey = apiId || apiKey || '';

    if (effectiveKey) {
      log('[Config Manager] 返回手动配置');
      return {
        apiKey: effectiveKey,
        apiUrl: apiUrl
      };
    }
  }

  return null;
}

/**
 * 获取运行时配置（从 globalState）
 * @returns 运行时配置或 null
 */
export function getRuntimeConfig(): RuntimeConfig | null {
  const context = ensureInitialized();
  const config = context.globalState.get<RuntimeConfig>(RUNTIME_CONFIG_KEY);

  if (config) {
    log('[Config Manager] 从 globalState 读取运行时配置');
  }

  return config || null;
}

/**
 * 设置运行时配置（保存到 globalState）
 * @param config - 运行时配置
 */
export async function setRuntimeConfig(config: RuntimeConfig): Promise<void> {
  const context = ensureInitialized();
  await context.globalState.update(RUNTIME_CONFIG_KEY, config);
  log(`[Config Manager] 运行时配置已保存: URL=${config.apiUrl}, Key=${maskApiKey(config.apiKey)}`);
}

/**
 * 清除运行时配置
 */
export async function clearRuntimeConfig(): Promise<void> {
  const context = ensureInitialized();
  await context.globalState.update(RUNTIME_CONFIG_KEY, undefined);
  log('[Config Manager] 运行时配置已清除');
}

/**
 * 获取已跳过的配置（从 globalState）
 * @returns 已跳过的配置或 null
 */
export function getSkippedConfig(): RuntimeConfig | null {
  const context = ensureInitialized();
  const config = context.globalState.get<RuntimeConfig>(SKIPPED_CONFIG_KEY);

  if (config) {
    log('[Config Manager] 从 globalState 读取已跳过配置');
  }

  return config || null;
}

/**
 * 设置已跳过的配置（保存到 globalState）
 * @param config - 已跳过的配置
 */
export async function setSkippedConfig(config: RuntimeConfig): Promise<void> {
  const context = ensureInitialized();
  await context.globalState.update(SKIPPED_CONFIG_KEY, config);
  log(`[Config Manager] 已跳过配置已保存: URL=${config.apiUrl}, Key=${maskApiKey(config.apiKey)}`);
}

/**
 * 清除已跳过的配置
 */
export async function clearSkippedConfig(): Promise<void> {
  const context = ensureInitialized();
  await context.globalState.update(SKIPPED_CONFIG_KEY, undefined);
  log('[Config Manager] 已跳过配置已清除');
}

/**
 * 获取最终生效的配置
 * 优先级：手动配置 > 运行时配置
 * @returns 有效配置或 null
 */
export function getEffectiveConfig(): RuntimeConfig | null {
  // 优先检查手动配置
  const manualConfig = getManualConfig();
  if (manualConfig) {
    log('[Config Manager] 使用手动配置');
    return manualConfig;
  }

  // 其次使用运行时配置
  const runtimeConfig = getRuntimeConfig();
  if (runtimeConfig) {
    log('[Config Manager] 使用运行时配置');
    return runtimeConfig;
  }

  log('[Config Manager] 没有可用的配置');
  return null;
}

/**
 * 比对两个配置是否相同
 * @param config1 - 配置1
 * @param config2 - 配置2
 * @returns 如果相同返回 true，否则返回 false
 */
export function compareConfigs(config1: RuntimeConfig | null, config2: RuntimeConfig | null): boolean {
  // 如果都为空，视为相同
  if (!config1 && !config2) {
    return true;
  }

  // 如果只有一个为空，则不同
  if (!config1 || !config2) {
    return false;
  }

  // 比对 apiKey 和 apiUrl
  const isSame = config1.apiKey === config2.apiKey && config1.apiUrl === config2.apiUrl;

  log(`[Config Manager] 配置比对结果: ${isSame ? '相同' : '不同'}`);

  return isSame;
}

/**
 * API Key 脱敏显示
 * @param apiKey - API Key
 * @returns 脱敏后的 API Key
 *
 * 示例：
 * cr_b7a7f660529396e18d7a8805510dd3da9eaba1f8403d8c8a2803b123b889b1eb
 * => cr_b7a7***b1eb
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) {
    return '***';
  }

  // 查找下划线位置（如 cr_）
  const underscoreIndex = apiKey.indexOf('_');

  if (underscoreIndex === -1 || underscoreIndex >= apiKey.length - 8) {
    // 没有下划线或下划线位置不合理，使用简单脱敏
    return `${apiKey.substring(0, 4)}***${apiKey.substring(apiKey.length - 4)}`;
  }

  // 保留前缀 + 前4位 + *** + 后4位
  const prefix = apiKey.substring(0, underscoreIndex + 1); // 包含 _
  const start = apiKey.substring(prefix.length, prefix.length + 4);
  const end = apiKey.substring(apiKey.length - 4);

  return `${prefix}${start}***${end}`;
}

/**
 * 从 Claude Settings 初始化运行时配置
 * 仅在没有任何配置时调用
 * @returns 是否成功初始化
 */
export async function initializeFromClaudeSettings(): Promise<boolean> {
  // 如果已有手动配置或运行时配置，不需要初始化
  if (hasManualConfig() || getRuntimeConfig()) {
    log('[Config Manager] 已有配置，跳过从 Claude Settings 初始化');
    return false;
  }

  // 从 Claude Settings 读取
  const claudeSettings = readClaudeSettings();

  if (claudeSettings.apiKey && claudeSettings.apiUrl) {
    await setRuntimeConfig({
      apiKey: claudeSettings.apiKey,
      apiUrl: claudeSettings.apiUrl
    });

    log('[Config Manager] 从 Claude Settings 初始化运行时配置成功');
    return true;
  }

  log('[Config Manager] Claude Settings 中没有有效配置，无法初始化');
  return false;
}

/**
 * 清除所有配置（调试用）
 * 注意：不会清除手动配置，只清除 globalState
 */
export async function clearAllStoredConfigs(): Promise<void> {
  await clearRuntimeConfig();
  await clearSkippedConfig();
  log('[Config Manager] 所有存储的配置已清除');
}
