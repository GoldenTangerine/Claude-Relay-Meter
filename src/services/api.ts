/**
 * 文件说明：API 请求服务
 * 作用：负责与 Claude Relay Service 后端通信，获取用量数据
 */

import axios, { AxiosError } from 'axios';
import { RelayApiResponse, ApiKeyResponse } from '../interfaces/types';
import { log, logError } from '../utils/logger';

/**
 * 获取 Claude Relay 用量统计数据
 * @param apiUrl - API 基础地址（例如：https://text.com）
 * @param apiId - API 标识符
 * @returns API 响应数据
 * @throws 当请求失败时抛出错误
 *
 * 请求说明：
 * - 方法：POST
 * - 地址：{apiUrl}/apiStats/api/user-stats
 * - 请求体：{ "apiId": "..." }
 */
export async function fetchRelayStats(
  apiUrl: string,
  apiId: string
): Promise<RelayApiResponse> {
  try {
    log(`[API] 开始请求用量数据，URL: ${apiUrl}/apiStats/api/user-stats`);

    // 构建完整的 API 地址
    const fullUrl = `${apiUrl}/apiStats/api/user-stats`;

    // 发送 POST 请求
    const response = await axios.post<RelayApiResponse>(
      fullUrl,
      {
        apiId: apiId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        timeout: 10000, // 10 秒超时
      }
    );

    // 检查响应状态
    if (response.status !== 200) {
      throw new Error(`API 请求失败，状态码：${response.status}`);
    }

    // 检查响应数据
    if (!response.data || !response.data.success) {
      throw new Error('API 返回数据无效或请求失败');
    }

    log('[API] 用量数据获取成功');
    return response.data;
  } catch (error) {
    // 处理不同类型的错误
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // 服务器返回了错误响应
        logError(
          `[API] 服务器错误，状态码：${axiosError.response.status}`,
          error as Error
        );
        throw new Error(
          `API 请求失败：服务器返回 ${axiosError.response.status} 错误`
        );
      } else if (axiosError.request) {
        // 请求已发送但没有收到响应
        logError('[API] 网络错误，无法连接到服务器', error as Error);
        throw new Error('无法连接到服务器，请检查网络连接和 API 地址');
      } else {
        // 请求配置出错
        logError('[API] 请求配置错误', error as Error);
        throw new Error('请求配置错误：' + axiosError.message);
      }
    } else {
      // 其他类型的错误
      logError('[API] 未知错误', error as Error);
      throw error;
    }
  }
}

/**
 * 验证 API 配置是否有效
 * @param apiUrl - API 基础地址
 * @param apiId - API 标识符
 * @returns 验证结果、错误消息和缺失配置类型
 */
export function validateApiConfig(
  apiUrl: string,
  apiId: string
): { valid: boolean; message?: string; missingConfig?: 'apiUrl' | 'apiId' | 'both' } {
  const urlMissing = !apiUrl || apiUrl.trim() === '';
  const idMissing = !apiId || apiId.trim() === '';

  // 检查是否都缺失
  if (urlMissing && idMissing) {
    return {
      valid: false,
      message: 'API URL 和 API ID 都未配置，请在设置中配置',
      missingConfig: 'both',
    };
  }

  // 检查 API URL 是否为空
  if (urlMissing) {
    return {
      valid: false,
      message: 'API URL 不能为空，请在设置中配置',
      missingConfig: 'apiUrl',
    };
  }

  // 检查 API URL 格式
  try {
    const url = new URL(apiUrl);
    if (!url.protocol.startsWith('http')) {
      return {
        valid: false,
        message: 'API URL 必须是有效的 HTTP 或 HTTPS 地址',
        missingConfig: 'apiUrl',
      };
    }
  } catch (error) {
    return {
      valid: false,
      message: 'API URL 格式无效',
      missingConfig: 'apiUrl',
    };
  }

  // 检查 API ID 是否为空
  if (idMissing) {
    return {
      valid: false,
      message: 'API ID 不能为空，请在设置中配置',
      missingConfig: 'apiId',
    };
  }

  // 检查 API ID 格式（UUID 格式）
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(apiId)) {
    return {
      valid: false,
      message: 'API ID 格式无效，应为 UUID 格式（例如：34arr92a-cb42-58op-56op-ggy15rt9878c）',
      missingConfig: 'apiId',
    };
  }

  return { valid: true };
}

/**
 * 测试 API 连接
 * @param apiUrl - API 基础地址
 * @param apiId - API 标识符
 * @returns 测试是否成功
 */
export async function testApiConnection(
  apiUrl: string,
  apiId: string
): Promise<boolean> {
  try {
    log('[API] 开始测试 API 连接...');

    // 验证配置
    const validation = validateApiConfig(apiUrl, apiId);
    if (!validation.valid) {
      logError(`[API] 配置验证失败：${validation.message}`);
      return false;
    }

    // 尝试获取数据
    await fetchRelayStats(apiUrl, apiId);
    log('[API] API 连接测试成功');
    return true;
  } catch (error) {
    logError('[API] API 连接测试失败', error as Error);
    return false;
  }
}

/**
 * 通过 API Key 获取 API ID
 * @param apiUrl - API 基础地址
 * @param apiKey - API Key
 * @returns API ID
 * @throws 当请求失败时抛出错误
 *
 * 请求说明：
 * - 方法：POST
 * - 地址：{apiUrl}/api/get-key-id
 * - 请求体：{ "apiKey": "..." }
 */
export async function getApiIdFromKey(
  apiUrl: string,
  apiKey: string
): Promise<string> {
  try {
    log(`[API] 开始通过 API Key 获取 API ID，URL: ${apiUrl}/api/get-key-id`);

    // 构建完整的 API 地址
    const fullUrl = `${apiUrl}/api/get-key-id`;

    // 发送 POST 请求
    const response = await axios.post<ApiKeyResponse>(
      fullUrl,
      {
        apiKey: apiKey,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        timeout: 10000, // 10 秒超时
      }
    );

    // 检查响应状态
    if (response.status !== 200) {
      throw new Error(`API Key 转换请求失败，状态码：${response.status}`);
    }

    // 检查响应数据
    if (!response.data || !response.data.success || !response.data.data?.apiId) {
      throw new Error('API Key 转换失败或返回数据无效');
    }

    log(`[API] API ID 获取成功：${response.data.data.apiId}`);
    return response.data.data.apiId;
  } catch (error) {
    // 处理不同类型的错误
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // 服务器返回了错误响应
        logError(
          `[API] API Key 转换服务器错误，状态码：${axiosError.response.status}`,
          error as Error
        );
        throw new Error(
          `API Key 转换失败：服务器返回 ${axiosError.response.status} 错误`
        );
      } else if (axiosError.request) {
        // 请求已发送但没有收到响应
        logError('[API] API Key 转换网络错误', error as Error);
        throw new Error('无法连接到服务器，请检查网络连接和 API 地址');
      } else {
        // 请求配置出错
        logError('[API] API Key 转换请求配置错误', error as Error);
        throw new Error('请求配置错误：' + axiosError.message);
      }
    } else {
      // 其他类型的错误
      logError('[API] API Key 转换未知错误', error as Error);
      throw error;
    }
  }
}

/**
 * 带重试机制的 API 请求
 * @param apiUrl - API 基础地址
 * @param apiId - API 标识符
 * @param maxRetries - 最大重试次数，默认为 3
 * @param retryDelay - 重试延迟（毫秒），默认为 1000
 * @returns API 响应数据
 */
export async function fetchRelayStatsWithRetry(
  apiUrl: string,
  apiId: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<RelayApiResponse> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`[API] 尝试请求数据（第 ${attempt}/${maxRetries} 次）`);
      return await fetchRelayStats(apiUrl, apiId);
    } catch (error) {
      lastError = error as Error;
      logError(`[API] 第 ${attempt} 次请求失败`, lastError);

      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        log(`[API] 等待 ${retryDelay}ms 后重试...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        // 指数退避：每次重试延迟翻倍
        retryDelay *= 2;
      }
    }
  }

  // 所有重试都失败
  throw new Error(
    `API 请求失败，已重试 ${maxRetries} 次。最后错误：${lastError?.message}`
  );
}
