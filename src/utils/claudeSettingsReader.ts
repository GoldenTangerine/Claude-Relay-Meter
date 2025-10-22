/**
 * 文件说明：Claude Code settings.json 读取工具
 * 作用：从用户的 Claude Code 配置文件中读取 API 凭证信息
 * @author sm
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { log } from './logger';

/**
 * Claude Code settings.json 的接口定义
 */
interface ClaudeSettingsJson {
  env?: {
    ANTHROPIC_AUTH_TOKEN?: string;
    ANTHROPIC_BASE_URL?: string;
  };
}

/**
 * 读取结果接口
 */
export interface ClaudeSettingsResult {
  apiKey?: string;
  apiUrl?: string;
}

/**
 * 规范化 API URL，移除末尾的 /api
 * @param baseUrl - 原始 URL
 * @returns 处理后的 URL
 *
 * 示例：
 * normalizeApiUrl("https://hk1.pincc.ai/api") => "https://hk1.pincc.ai"
 * normalizeApiUrl("https://hk1.pincc.ai/API/") => "https://hk1.pincc.ai"
 * normalizeApiUrl("https://hk1.pincc.ai") => "https://hk1.pincc.ai"
 */
function normalizeApiUrl(baseUrl: string): string {
  if (!baseUrl) {
    return baseUrl;
  }

  // 移除末尾的 /api（不区分大小写，支持多个斜杠）
  // 正则说明：匹配末尾的 /api，可能带多个斜杠，不区分大小写
  return baseUrl.replace(/\/api\/*$/i, '');
}

/**
 * 获取 Claude Code settings.json 文件路径
 * @returns settings.json 的完整路径
 */
function getClaudeSettingsPath(): string {
  // 获取用户主目录
  const homeDir = os.homedir();

  // 构建 settings.json 路径：~/.claude/settings.json
  return path.join(homeDir, '.claude', 'settings.json');
}

/**
 * 从 Claude Code settings.json 读取配置
 * @returns 读取到的配置信息，如果读取失败则返回空对象
 */
export function readClaudeSettings(): ClaudeSettingsResult {
  try {
    const settingsPath = getClaudeSettingsPath();

    // 检查文件是否存在
    if (!fs.existsSync(settingsPath)) {
      log(`[Claude Settings] 配置文件不存在：${settingsPath}`);
      return {};
    }

    // 读取文件内容
    const fileContent = fs.readFileSync(settingsPath, 'utf8');

    // 解析 JSON
    const settings: ClaudeSettingsJson = JSON.parse(fileContent);

    // 提取配置
    const result: ClaudeSettingsResult = {};

    if (settings.env) {
      // 读取 API Key
      if (settings.env.ANTHROPIC_AUTH_TOKEN) {
        result.apiKey = settings.env.ANTHROPIC_AUTH_TOKEN;
        log(`[Claude Settings] 读取到 API Key：${result.apiKey.substring(0, 10)}...`);
      }

      // 读取并处理 API URL
      if (settings.env.ANTHROPIC_BASE_URL) {
        const rawUrl = settings.env.ANTHROPIC_BASE_URL;
        result.apiUrl = normalizeApiUrl(rawUrl);
        log(`[Claude Settings] 读取到 API URL：${rawUrl} -> ${result.apiUrl}`);
      }
    }

    if (Object.keys(result).length === 0) {
      log('[Claude Settings] 配置文件存在但未包含有效的 API 配置');
    } else {
      log(`[Claude Settings] 配置读取成功，获得 ${Object.keys(result).length} 项配置`);
    }

    return result;
  } catch (error) {
    // 处理各种可能的错误
    if (error instanceof SyntaxError) {
      log(`[Claude Settings] JSON 解析失败：${error.message}`, true);
    } else if (error instanceof Error) {
      log(`[Claude Settings] 读取配置失败：${error.message}`, true);
    } else {
      log(`[Claude Settings] 读取配置失败：未知错误`, true);
    }

    return {};
  }
}

/**
 * 检查 Claude Code settings.json 是否存在
 * @returns 如果存在返回 true，否则返回 false
 */
export function hasClaudeSettings(): boolean {
  const settingsPath = getClaudeSettingsPath();
  return fs.existsSync(settingsPath);
}
