/**
 * 文件说明：日志记录工具
 * 作用：提供统一的日志记录接口，支持调试和错误追踪
 */

import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

/**
 * 初始化日志系统
 * @param context - VSCode 扩展上下文
 */
export function initializeLogging(context: vscode.ExtensionContext): void {
  try {
    if (!outputChannel) {
      outputChannel = vscode.window.createOutputChannel('Claude Relay Meter');
      context.subscriptions.push(outputChannel);
      // 使用 safeLog 避免递归调用问题
      safeLog('[初始化] Claude Relay Meter 日志系统已启动', false);
    }
  } catch (error) {
    // 如果创建失败，至少记录到控制台
    console.error('[Critical] 无法创建输出通道:', error);
    throw new Error('日志系统初始化失败');
  }
}

/**
 * 记录日志消息
 * @param message - 日志消息
 * @param isError - 是否为错误日志
 */
export function log(message: string, isError: boolean = false): void {
  try {
    // 检查是否启用日志
    const config = vscode.workspace.getConfiguration('relayMeter');
    const enableLogging = config.get<boolean>('enableLogging', true);

    // 错误总是记录，或者日志启用时记录
    const shouldLog = isError || enableLogging;

    if (shouldLog) {
      safeLog(message, isError);
    }
  } catch (error) {
    // 如果日志记录失败，至少输出到控制台
    console.error('[日志错误] 无法记录日志:', message, error);
  }
}

/**
 * 安全地记录日志
 * @param message - 日志消息
 * @param isError - 是否为错误日志
 */
function safeLog(message: string, isError: boolean): void {
  const timestamp = new Date().toISOString();
  const logLevel = isError ? 'ERROR' : 'INFO';
  const logMessage = `[${timestamp}] [${logLevel}] ${message}`;

  // 总是先输出到控制台（确保日志可见）
  if (isError) {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }

  // 尝试输出到 Output 通道
  try {
    if (outputChannel) {
      outputChannel.appendLine(logMessage);

      // 如果是错误，自动显示输出面板
      if (isError) {
        outputChannel.show(true);
      }
    } else {
      // 如果 outputChannel 未初始化，输出警告
      console.warn('[警告] Output 通道未初始化，日志仅在控制台显示');
    }
  } catch (error) {
    console.error('[日志错误] 无法写入 Output 通道:', error);
  }
}

/**
 * 记录错误日志
 * @param message - 错误消息
 * @param error - 错误对象（可选）
 */
export function logError(message: string, error?: Error): void {
  let errorMessage = message;

  if (error) {
    errorMessage += `: ${error.message}`;
    if (error.stack) {
      errorMessage += `\n堆栈跟踪：\n${error.stack}`;
    }
  }

  log(errorMessage, true);
}

/**
 * 显示输出面板
 */
export function showOutputChannel(): void {
  if (outputChannel) {
    outputChannel.show();
  }
}

/**
 * 清空输出面板
 */
export function clearOutputChannel(): void {
  if (outputChannel) {
    outputChannel.clear();
  }
}
