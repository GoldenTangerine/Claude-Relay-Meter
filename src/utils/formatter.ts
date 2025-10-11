/**
 * 文件说明：数字和百分比格式化工具
 * 作用：提供统一的数字格式化方法，确保显示符合要求
 */

/**
 * 格式化数字，最多保留 4 位小数，自动去除末尾的零
 * @param num - 需要格式化的数字
 * @returns 格式化后的字符串
 *
 * 示例：
 * formatNumber(3.9647) => "3.9647"
 * formatNumber(10.5000) => "10.5"
 * formatNumber(100.0000) => "100"
 */
export function formatNumber(num: number): string {
  // 保留最多 4 位小数
  const rounded = Math.round(num * 10000) / 10000;
  // 转换为字符串并去除末尾的零
  return Number(rounded.toFixed(4)).toString();
}

/**
 * 格式化百分比，最多保留 2 位小数，自动去除末尾的零
 * @param value - 当前值
 * @param total - 总值
 * @returns 格式化后的百分比字符串（不含 % 符号）
 *
 * 示例：
 * formatPercentage(3.96, 100) => "3.96"
 * formatPercentage(50.50, 100) => "50.5"
 * formatPercentage(100, 100) => "100"
 */
export function formatPercentage(value: number, total: number): string {
  if (total === 0) {
    return '0';
  }

  // 计算百分比
  const percentage = (value / total) * 100;

  // 限制在 0-100 之间
  const clamped = Math.max(0, Math.min(100, percentage));

  // 保留最多 2 位小数
  const rounded = Math.round(clamped * 100) / 100;

  // 转换为字符串并去除末尾的零
  return Number(rounded.toFixed(2)).toString();
}

/**
 * 格式化费用，添加美元符号，最多保留 4 位小数
 * @param amount - 费用金额
 * @returns 格式化后的费用字符串
 *
 * 示例：
 * formatCost(3.9647) => "$3.9647"
 * formatCost(10.50) => "$10.5"
 * formatCost(100) => "$100"
 */
export function formatCost(amount: number): string {
  return `$${formatNumber(amount)}`;
}

/**
 * 格式化状态栏文本
 * @param used - 已使用金额
 * @param limit - 限额
 * @param percentage - 百分比（可选，如果不提供则自动计算）
 * @returns 格式化后的状态栏文本
 *
 * 示例：
 * formatStatusBarText(3.96, 100) => "$3.96/$100 3.96%"
 */
export function formatStatusBarText(
  used: number,
  limit: number,
  percentage?: number
): string {
  const formattedUsed = formatCost(used);
  const formattedLimit = formatCost(limit);
  const percentValue =
    percentage !== undefined ? percentage : parseFloat(formatPercentage(used, limit));
  const formattedPercent = formatPercentage(used, limit);

  return `${formattedUsed}/${formattedLimit} ${formattedPercent}%`;
}

/**
 * 格式化悬停提示中的费用行
 * @param label - 标签文本
 * @param used - 已使用金额
 * @param limit - 限额
 * @returns 格式化后的提示文本
 *
 * 示例：
 * formatTooltipLine("每日费用", 3.96, 100) => "每日费用: $3.96/$100 (3.96%)"
 */
export function formatTooltipLine(
  label: string,
  used: number,
  limit: number
): string {
  const formattedUsed = formatCost(used);
  const formattedLimit = formatCost(limit);
  const percentage = formatPercentage(used, limit);

  return `${label}: ${formattedUsed}/${formattedLimit} (${percentage}%)`;
}

/**
 * 将数字转换为千分位格式（可选功能）
 * @param num - 需要格式化的数字
 * @returns 带千分位分隔符的字符串
 *
 * 示例：
 * formatWithThousandsSeparator(1000) => "1,000"
 * formatWithThousandsSeparator(1000000) => "1,000,000"
 */
export function formatWithThousandsSeparator(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
