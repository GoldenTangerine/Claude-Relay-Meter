/**
 * 文件说明：状态栏处理器
 * 作用：负责创建和更新 VSCode 状态栏显示
 */

import * as vscode from 'vscode';
import { RelayApiResponse, CostStats } from '../interfaces/types';
import { formatCost, formatPercentage, formatTooltipLine, formatLargeNumber, formatRemainingTime, formatExpiryDate } from '../utils/formatter';
import { getStatusBarColor } from '../utils/colorHelper';
import { log } from '../utils/logger';
import { t } from '../utils/i18n';
import * as ConfigManager from '../utils/configManager';

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
 * @param apiUrl - API 基础地址
 * @param apiId - API 标识符
 */
export function updateStatusBar(
  statusBarItem: vscode.StatusBarItem,
  data: RelayApiResponse,
  apiUrl: string,
  apiId: string
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

    // 检测是否有周限制（rate limit window）
    const hasWindowLimit = limits.currentWindowCost > 0 && limits.rateLimitCost > 0;

    // 根据是否有周限制决定状态栏显示格式
    if (hasWindowLimit) {
      // 计算周限制统计
      const windowStats = calculateCostStats(
        limits.currentWindowCost,
        limits.rateLimitCost
      );

      // 有周限制时，显示：$(graph) 日:$X/$Y Z% | 周:$A/$B C%
      statusBarItem.text = `$(graph) ${t('statusBar.daily')}:${dailyStats.formattedUsed}/${dailyStats.formattedLimit} ${dailyStats.formattedPercentage}% | ${t('statusBar.window')}:${windowStats.formattedUsed}/${windowStats.formattedLimit} ${windowStats.formattedPercentage}%`;

      // 使用周限制的百分比来设置颜色（周限制优先级更高）
      statusBarItem.color = getStatusBarColor(windowStats.percentage);

      log(
        `[状态栏] 状态栏更新成功 - 每日: ${dailyStats.formattedUsed}/${dailyStats.formattedLimit} (${dailyStats.formattedPercentage}%), 周限制: ${windowStats.formattedUsed}/${windowStats.formattedLimit} (${windowStats.formattedPercentage}%)`
      );
    } else {
      // 无周限制时，保持原格式：$(graph) $X/$Y Z%
      statusBarItem.text = `$(graph) ${dailyStats.formattedUsed}/${dailyStats.formattedLimit} ${dailyStats.formattedPercentage}%`;

      // 设置状态栏颜色
      statusBarItem.color = getStatusBarColor(dailyStats.percentage);

      log(
        `[状态栏] 状态栏更新成功 - 每日: ${dailyStats.formattedUsed}/${dailyStats.formattedLimit} (${dailyStats.formattedPercentage}%)`
      );
    }

    // 创建并设置悬停提示
    const tooltip = createTooltip(data, apiUrl, apiId);
    statusBarItem.tooltip = tooltip;

    // 显示状态栏项
    statusBarItem.show();
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
 * @param apiUrl - API 基础地址
 * @param apiId - API 标识符
 * @returns Markdown 格式的提示文本
 */
function createTooltip(data: RelayApiResponse, apiUrl: string, apiId: string): vscode.MarkdownString {
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

  // 标题和用户信息
  tooltip.appendMarkdown(`## ${t('tooltips.title')}\n`);
  tooltip.appendMarkdown(`**${t('tooltips.user')}：** ${data.data.name}\n\n`);

  // 过期时间显示
  const expiresAt = data.data.expiresAt;
  const formattedExpiry = formatExpiryDate(expiresAt, t);

  // 判断是否已过期（检查格式化结果中是否包含"已过期"）
  const isExpired = formattedExpiry.includes(t('tooltips.expiredOn'));

  if (isExpired) {
    // 已过期：红色警告样式
    tooltip.appendMarkdown(`⚠️ **${t('tooltips.expiresAt')}：** <span style="color: #FF6600">${formattedExpiry}</span>\n\n`);
  } else {
    // 未过期或永久有效：普通样式
    tooltip.appendMarkdown(`**${t('tooltips.expiresAt')}：** ${formattedExpiry}\n\n`);
  }

  // 每日费用限制
  tooltip.appendMarkdown(`### 📊 ${t('tooltips.dailyCostLimit')}\n`);
  tooltip.appendMarkdown(
    `**${t('tooltips.usageStatus')}：** ${dailyStats.formattedUsed} / ${dailyStats.formattedLimit}  ${getColoredPercentage(dailyStats)}\n\n`
  );

  // 总费用限制
  if (totalStats.limit > 0) {
    tooltip.appendMarkdown(`### 💰 ${t('tooltips.totalCostLimit')}\n`);
    tooltip.appendMarkdown(
      `**${t('tooltips.usageStatus')}：** ${totalStats.formattedUsed} / ${totalStats.formattedLimit}  ${getColoredPercentage(totalStats)}\n\n`
    );
  }

  // 费率限制（包括 Opus 周费用和周限制）
  if (opusStats.limit > 0) {
    tooltip.appendMarkdown(`### 🚀 ${t('tooltips.rateLimitTitle')}\n`);

    // Opus 模型周费用
    tooltip.appendMarkdown(
      `**${t('tooltips.opusLabel')}：** ${opusStats.formattedUsed} / ${opusStats.formattedLimit}  ${getColoredPercentage(opusStats)}\n\n`
    );

    // 检测是否有周限制（rate limit window）
    const hasWindowLimit = limits.currentWindowCost > 0 && limits.rateLimitCost > 0;
    if (hasWindowLimit) {
      // 计算周限制统计
      const windowStats = calculateCostStats(limits.currentWindowCost, limits.rateLimitCost);

      // 周限制显示
      tooltip.appendMarkdown(
        `**${t('tooltips.windowLimit')}：** ${windowStats.formattedUsed} / ${windowStats.formattedLimit}  ${getColoredPercentage(windowStats)}\n\n`
      );
    }

    // 窗口重置时间独立显示，只要有值就显示
    if (limits.windowRemainingSeconds !== null && limits.windowRemainingSeconds > 0) {
      const remainingTime = formatRemainingTime(limits.windowRemainingSeconds, t);
      tooltip.appendMarkdown(
        `**${t('tooltips.resetTime')}：** ${t('tooltips.resetsIn', { time: remainingTime })}\n\n`
      );
    }

    tooltip.appendMarkdown('\n');
  }

  // 其他统计信息（合并到一行，无标题）
  tooltip.appendMarkdown(
    `**${t('tooltips.totalRequests')}：** ${formatLargeNumber(data.data.usage.total.requests)} | ` +
    `**Token：** ${formatLargeNumber(data.data.usage.total.allTokens)} | ` +
    `**${t('tooltips.totalCost')}：** ${data.data.usage.total.formattedCost}\n\n`
  );

  // 操作区域
  tooltip.appendMarkdown('---\n');

  // 构建网页仪表板地址
  const webDashboardUrl = `${apiUrl}/admin-next/api-stats?apiId=${apiId}`;
  const webDashboardArgs = encodeURIComponent(JSON.stringify({ url: webDashboardUrl }));

  // 提示和操作按钮（合并到两行）
  tooltip.appendMarkdown(`💡 **${t('tooltips.tip')}：** ${t('tooltips.clickToRefresh')}\n`);
  tooltip.appendMarkdown(
    `[${t('commands.openSettings')}](command:claude-relay-meter.openSettings) | ` +
    `[${t('tooltips.openWebDashboard')}](command:claude-relay-meter.openWebDashboard?${webDashboardArgs}) | ` +
    `[${t('tooltips.reloadConfig')}](command:claude-relay-meter.manualReloadConfig)\n\n`
  );

  // 监听状态提示
  const watchEnabled = ConfigManager.isWatchEnabled();
  if (!watchEnabled) {
    tooltip.appendMarkdown(`⚠️ ${t('tooltips.watchDisabled')}\n\n`);
  }

  // 更新时间
  const now = new Date().toLocaleString();
  tooltip.appendMarkdown(`🕐 ${t('tooltips.updateTime')}：${now}`);

  return tooltip;
}

/**
 * 获取带颜色的百分比文本
 * @param stats - 费用统计对象
 * @returns 格式化的百分比文本（使用 HTML 颜色和 Emoji 指示器）
 */
function getColoredPercentage(stats: CostStats): string {
  const percentage = stats.percentage;

  // 获取配置
  const config = vscode.workspace.getConfiguration('relayMeter');
  const enableColors = config.get<boolean>('enableStatusBarColors', true);
  const thresholds = config.get<{ low: number; medium: number }>('colorThresholds', {
    low: 50,
    medium: 80,
  });
  const customColors = config.get<{ low: string; medium: string; high: string }>('customColors', {
    low: '#66BB6A',
    medium: '#FFD700',
    high: '#FF6600',
  });

  // 如果未启用颜色，使用默认灰色和白色圆形
  if (!enableColors) {
    const defaultColor = '#CCCCCC';
    return `⚪ <span style="color: ${defaultColor}; font-size: 1.1em;"><strong>${stats.formattedPercentage}%</strong></span>`;
  }

  // 根据阈值确定颜色和 Emoji 指示器
  let color: string;
  let indicator: string;

  if (percentage < thresholds.low) {
    // 低使用率：绿色
    color = customColors.low;
    indicator = '🟢';
  } else if (percentage < thresholds.medium) {
    // 中使用率：黄色
    color = customColors.medium;
    indicator = '🟡';
  } else {
    // 高使用率：红色/橙色
    color = customColors.high;
    indicator = '🔴';
  }

  // 使用 HTML span 标签设置颜色，增大字体并加粗
  return `${indicator} <span style="color: ${color}; font-size: 1.1em;"><strong>${stats.formattedPercentage}%</strong></span>`;
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

/**
 * 创建重载配置按钮
 * @returns VSCode 状态栏项实例
 */
export function createReloadButton(): vscode.StatusBarItem {
  log('[状态栏] 创建重载配置按钮...');

  // 创建状态栏项，显示在右侧，优先级为 99（在主状态栏项右侧）
  const reloadButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    99
  );

  // 设置图标和文本
  reloadButton.text = '$(sync)';
  reloadButton.tooltip = t('tooltips.reloadClaudeConfig');
  reloadButton.command = 'claude-relay-meter.reloadClaudeConfig';

  log('[状态栏] 重载配置按钮创建成功');
  return reloadButton;
}
