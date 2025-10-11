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
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Claude Relay Meter');
    context.subscriptions.push(outputChannel);
    log('[初始化] 日志系统已初始化');
  }
}

/**
 * 记录日志消息
 * @param message - 日志消息
 * @param isError - 是否为错误日志
 */
export function log(message: string, isError: boolean = false): void {
  // 检查是否启用日志
  const config = vscode.workspace.getConfiguration('relayMeter');
  const enableLogging = config.get<boolean>('enableLogging', true);

  if (!enableLogging && !isError) {
    // 如果未启用日志且不是错误，则跳过
    return;
  }

  const timestamp = new Date().toLocaleString();
  const prefix = isError ? '[错误]' : '[信息]';
  const logMessage = `${timestamp} ${prefix} ${message}`;

  if (outputChannel) {
    outputChannel.appendLine(logMessage);

    // 如果是错误，自动显示输出面板
    if (isError) {
      outputChannel.show(true);
    }
  }

  // 在调试模式下也输出到控制台
  if (isError) {
    console.error(logMessage);
  } else {
    console.log(logMessage);
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
