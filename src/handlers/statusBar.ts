/**
 * 文件说明：状态栏处理器
 * 作用：负责创建和更新 VSCode 状态栏显示
 */

import * as vscode from 'vscode';
import { RelayApiResponse, CostStats } from '../interfaces/types';
import { formatCost, formatPercentage, formatTooltipLine } from '../utils/formatter';
import { getStatusBarColor } from '../utils/colorHelper';
import { log } from '../utils/logger';
import { t } from '../utils/i18n';

/**
 * 创建状态栏项
 * @returns VSCode 状态栏项实例
 */
export function createStatusBarItem(): vscode.StatusBarItem {
  log('[状态栏] 创建状态栏项...');

  // 创建状态栏项，显示在右侧，优先级为 100
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  // 设置点击命令（点击状态栏项时执行刷新）
  statusBarItem.command = 'claude-relay-meter.refreshStats';

  log('[状态栏] 状态栏项创建成功');
  return statusBarItem;
}

/**
 * 更新状态栏显示
 * @param statusBarItem - 状态栏项实例
 * @param data - API 响应数据
 */
export function updateStatusBar(
  statusBarItem: vscode.StatusBarItem,
  data: RelayApiResponse
): void {
  try {
    log('[状态栏] 开始更新状态栏显示...');

    // 提取限制数据
    const limits = data.data.limits;

    // 计算每日费用统计
    const dailyStats = calculateCostStats(
      limits.currentDailyCost,
      limits.dailyCostLimit
    );

    // 设置状态栏文本：$(graph) $使用量/$限额 百分比%
    statusBarItem.text = `$(graph) ${dailyStats.formattedUsed}/${dailyStats.formattedLimit} ${dailyStats.formattedPercentage}%`;

    // 设置状态栏颜色
    statusBarItem.color = getStatusBarColor(dailyStats.percentage);

    // 创建并设置悬停提示
    const tooltip = createTooltip(data);
    statusBarItem.tooltip = tooltip;

    // 显示状态栏项
    statusBarItem.show();

    log(
      `[状态栏] 状态栏更新成功 - 每日: ${dailyStats.formattedUsed}/${dailyStats.formattedLimit} (${dailyStats.formattedPercentage}%)`
    );
  } catch (error) {
    log(`[状态栏] 更新状态栏失败：${error}`, true);
    throw error;
  }
}

/**
 * 显示错误状态
 * @param statusBarItem - 状态栏项实例
 * @param errorMessage - 错误消息
 */
export function showErrorStatus(
  statusBarItem: vscode.StatusBarItem,
  errorMessage: string
): void {
  log(`[状态栏] 显示错误状态：${errorMessage}`);

  // 显示错误图标和消息
  statusBarItem.text = `$(alert) ${errorMessage}`;
  statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
  statusBarItem.tooltip = new vscode.MarkdownString(
    `## ⚠️ ${t('tooltips.title')}\n\n**${t('errors.apiError')}：** ${errorMessage}\n\n${t('tooltips.clickToRefresh')}`
  );
  statusBarItem.show();
}

/**
 * 显示加载状态
 * @param statusBarItem - 状态栏项实例
 */
export function showLoadingStatus(statusBarItem: vscode.StatusBarItem): void {
  log('[状态栏] 显示加载状态');
  statusBarItem.text = `$(sync~spin) ${t('statusBar.loading')}`;
  statusBarItem.color = new vscode.ThemeColor('statusBarItem.foreground');
  statusBarItem.tooltip = new vscode.MarkdownString(t('statusBar.loading'));
  statusBarItem.show();
}

/**
 * 计算费用统计信息
 * @param used - 已使用金额
 * @param limit - 限额
 * @returns 费用统计对象
 */
function calculateCostStats(used: number, limit: number): CostStats {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return {
    used,
    limit,
    percentage: clampedPercentage,
    formattedUsed: formatCost(used),
    formattedLimit: formatCost(limit),
    formattedPercentage: formatPercentage(used, limit),
  };
}

/**
 * 创建悬停提示
 * @param data - API 响应数据
 * @returns Markdown 格式的提示文本
 */
function createTooltip(data: RelayApiResponse): vscode.MarkdownString {
  const limits = data.data.limits;

  // 计算三种费用统计
  const dailyStats = calculateCostStats(limits.currentDailyCost, limits.dailyCostLimit);
  const totalStats = calculateCostStats(limits.currentTotalCost, limits.totalCostLimit);
  const opusStats = calculateCostStats(limits.weeklyOpusCost, limits.weeklyOpusCostLimit);

  // 创建 Markdown 提示
  const tooltip = new vscode.MarkdownString();
  tooltip.isTrusted = true;
  tooltip.supportHtml = true;
  tooltip.supportThemeIcons = true;

  // 标题
  tooltip.appendMarkdown(`## ${t('tooltips.title')}\n\n`);

  // 用户信息
  tooltip.appendMarkdown(`**${t('tooltips.user')}：** ${data.data.name}\n\n`);

  // 每日费用限制
  tooltip.appendMarkdown('---\n\n');
  tooltip.appendMarkdown(`### ${t('tooltips.dailyCostLimit')}\n\n`);
  tooltip.appendMarkdown(
    `**${t('tooltips.usageStatus')}：** ${dailyStats.formattedUsed} / ${dailyStats.formattedLimit}\n\n`
  );
  tooltip.appendMarkdown(`**${t('tooltips.percentage')}：** ${getColoredPercentage(dailyStats)}\n\n`);

  // 总费用限制
  if (totalStats.limit > 0) {
    tooltip.appendMarkdown('---\n\n');
    tooltip.appendMarkdown(`### ${t('tooltips.totalCostLimit')}\n\n`);
    tooltip.appendMarkdown(
      `**${t('tooltips.usageStatus')}：** ${totalStats.formattedUsed} / ${totalStats.formattedLimit}\n\n`
    );
    tooltip.appendMarkdown(`**${t('tooltips.percentage')}：** ${getColoredPercentage(totalStats)}\n\n`);
  }

  // Opus 模型周费用限制
  if (opusStats.limit > 0) {
    tooltip.appendMarkdown('---\n\n');
    tooltip.appendMarkdown(`### ${t('tooltips.opusWeeklyCostLimit')}\n\n`);
    tooltip.appendMarkdown(
      `**${t('tooltips.usageStatus')}：** ${opusStats.formattedUsed} / ${opusStats.formattedLimit}\n\n`
    );
    tooltip.appendMarkdown(`**${t('tooltips.percentage')}：** ${getColoredPercentage(opusStats)}\n\n`);
  }

  // 其他信息
  tooltip.appendMarkdown('---\n\n');
  tooltip.appendMarkdown(`### ${t('tooltips.otherStats')}\n\n`);
  tooltip.appendMarkdown(`**${t('tooltips.totalRequests')}：** ${data.data.usage.total.requests.toLocaleString()}\n\n`);
  tooltip.appendMarkdown(`**${t('tooltips.totalTokens')}：** ${data.data.usage.total.allTokens.toLocaleString()}\n\n`);

  // 操作按钮
  tooltip.appendMarkdown('---\n\n');
  tooltip.appendMarkdown(
    `${t('tooltips.tip')} **：** ${t('tooltips.clickToRefresh')} | [${t('commands.openSettings')}](command:claude-relay-meter.openSettings)\n\n`
  );

  // 更新时间
  const now = new Date().toLocaleString();
  tooltip.appendMarkdown(`${t('tooltips.updateTime')} **：** ${now}\n\n`);

  return tooltip;
}

/**
 * 获取带颜色的百分比文本
 * @param stats - 费用统计对象
 * @returns 格式化的百分比文本
 */
function getColoredPercentage(stats: CostStats): string {
  const percentage = stats.percentage;
  let emoji = '🟢'; // 绿色

  if (percentage >= 80) {
    emoji = '🔴'; // 红色
  } else if (percentage >= 50) {
    emoji = '🟡'; // 黄色
  }

  return `${emoji} **${stats.formattedPercentage}%**`;
}

/**
 * 显示配置提示
 * @param statusBarItem - 状态栏项实例
 * @param missingConfig - 缺失的配置项类型
 */
export function showConfigPrompt(
  statusBarItem: vscode.StatusBarItem,
  missingConfig?: 'apiUrl' | 'apiId' | 'both'
): void {
  log(`[状态栏] 显示配置提示，缺失配置：${missingConfig || 'both'}`);

  // 根据缺失的配置项设置不同的文本
  let statusText = '';
  let tooltipMessage = '';

  if (missingConfig === 'apiUrl') {
    statusText = `$(gear) ${t('statusBar.notConfiguredApiUrl')}`;
    tooltipMessage = t('tooltips.pleaseConfigureApiUrl');
  } else if (missingConfig === 'apiId') {
    statusText = `$(gear) ${t('statusBar.notConfiguredApiId')}`;
    tooltipMessage = t('tooltips.pleaseConfigureApiIdOrKey');
  } else {
    statusText = `$(gear) ${t('statusBar.notConfigured')}`;
    tooltipMessage = t('tooltips.pleaseConfigureFirst');
  }

  statusBarItem.text = statusText;
  statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');

  const tooltip = new vscode.MarkdownString();
  tooltip.isTrusted = true;
  tooltip.appendMarkdown(t('tooltips.needConfiguration', { message: tooltipMessage }));
  tooltip.appendMarkdown(`\n\n[${t('tooltips.clickToConfigure')}](command:claude-relay-meter.openSettings)\n\n`);
  statusBarItem.tooltip = tooltip;

  statusBarItem.command = 'claude-relay-meter.openSettings';

  // 确保状态栏项可见
  statusBarItem.show();

  log(`[状态栏] 配置提示已设置：${statusText}`);
}
