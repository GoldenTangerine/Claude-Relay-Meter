/**
 * 文件说明:配置管理器
 * 作用:统一管理 VSCode 设置中的配置
 * @author sm
 */

import * as vscode from 'vscode';
import { log } from './logger';

/**
 * 配置接口
 */
export interface Config {
  apiKey: string;
  apiUrl: string;
}

/**
 * 获取 VSCode 设置中的配置
 * @returns 配置对象,如果未配置返回 null
 */
export function getVSCodeConfig(): Config | null {
  const config = vscode.workspace.getConfiguration('relayMeter');
  const apiKey = config.get<string>('apiKey') || '';
  const apiId = config.get<string>('apiId') || '';
  const apiUrl = config.get<string>('apiUrl') || '';

  // 优先使用 apiId,如果没有则使用 apiKey
  const effectiveKey = apiId || apiKey;

  if (!apiUrl || !effectiveKey) {
    return null;
  }

  return {
    apiKey: effectiveKey,
    apiUrl: apiUrl
  };
}

/**
 * 更新 VSCode 设置中的配置
 * @param apiKey - API Key 或 API ID
 * @param apiUrl - API URL
 */
export async function updateVSCodeConfig(apiKey: string, apiUrl: string): Promise<void> {
  const config = vscode.workspace.getConfiguration('relayMeter');

  await config.update('apiKey', apiKey, true);
  await config.update('apiUrl', apiUrl, true);

  log(`[Config Manager] VSCode 设置已更新: URL=${apiUrl}, Key=${maskApiKey(apiKey)}`);
}

/**
 * 检查是否有配置
 * @returns 如果配置了 apiKey/apiId 和 apiUrl 则返回 true
 */
export function hasConfig(): boolean {
  return getVSCodeConfig() !== null;
}

/**
 * 检查监听开关是否启用
 * @returns 如果启用返回 true
 */
export function isWatchEnabled(): boolean {
  const config = vscode.workspace.getConfiguration('relayMeter');
  return config.get<boolean>('watchClaudeSettings', true);
}

/**
 * 设置监听开关
 * @param enabled - 是否启用
 */
export async function setWatchEnabled(enabled: boolean): Promise<void> {
  const config = vscode.workspace.getConfiguration('relayMeter');
  await config.update('watchClaudeSettings', enabled, true);
  log(`[Config Manager] 监听开关已${enabled ? '开启' : '关闭'}`);
}

/**
 * 比对两个配置是否相同
 * @param config1 - 配置1
 * @param config2 - 配置2
 * @returns 如果相同返回 true,否则返回 false
 */
export function compareConfigs(config1: Config | null, config2: Config | null): boolean {
  // 如果都为空,视为相同
  if (!config1 && !config2) {
    return true;
  }

  // 如果只有一个为空,则不同
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
 * 示例:
 * cr_b7a7f660529396e18d7a8805510dd3da9eaba1f8403d8c8a2803b123b889b1eb
 * => cr_b7a7***b1eb
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) {
    return '***';
  }

  // 查找下划线位置(如 cr_)
  const underscoreIndex = apiKey.indexOf('_');

  if (underscoreIndex === -1 || underscoreIndex >= apiKey.length - 8) {
    // 没有下划线或下划线位置不合理,使用简单脱敏
    return `${apiKey.substring(0, 4)}***${apiKey.substring(apiKey.length - 4)}`;
  }

  // 保留前缀 + 前4位 + *** + 后4位
  const prefix = apiKey.substring(0, underscoreIndex + 1); // 包含 _
  const start = apiKey.substring(prefix.length, prefix.length + 4);
  const end = apiKey.substring(apiKey.length - 4);

  return `${prefix}${start}***${end}`;
}
