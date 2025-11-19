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

/**
 * 格式化大数字，自动转换为带单位的形式（K/M/B）
 * @param num - 需要格式化的数字
 * @returns 格式化后的字符串
 *
 * 示例：
 * formatLargeNumber(999) => "999"
 * formatLargeNumber(4042) => "4K"
 * formatLargeNumber(171659455) => "171.7M"
 * formatLargeNumber(1500000000) => "1.5B"
 */
export function formatLargeNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  }

  const units = [
    { threshold: 1e9, suffix: 'B' },  // Billion
    { threshold: 1e6, suffix: 'M' },  // Million
    { threshold: 1e3, suffix: 'K' }   // Thousand
  ];

  for (const { threshold, suffix } of units) {
    if (num >= threshold) {
      const value = num / threshold;
      // 数值 < 10 时保留2位小数，>= 10 时保留1位小数
      const decimals = value < 10 ? 2 : 1;
      const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
      // 去除末尾的零
      const formatted = Number(rounded.toFixed(decimals)).toString();
      return `${formatted}${suffix}`;
    }
  }

  return num.toString();
}

/**
 * 格式化剩余时间，将秒数转换为易读的时间格式
 * @param seconds - 剩余秒数
 * @param t - 国际化翻译函数
 * @returns 格式化后的时间字符串
 *
 * 示例：
 * formatRemainingTime(90061, t) => "1天1小时1分1秒"（中文）
 * formatRemainingTime(90061, t) => "1d 1h 1m 1s"（英文）
 * formatRemainingTime(3661, t) => "1小时1分1秒"（中文）
 * formatRemainingTime(0, t) => "已过期"（中文）/ "Expired"（英文）
 */
export function formatRemainingTime(seconds: number, t: (key: string) => string): string {
  // 如果时间已过期或为负数
  if (seconds <= 0) {
    return t('time.expired');
  }

  // 计算各个时间单位
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  // 构建时间部分
  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}${t('time.days')}`);
  }
  if (hours > 0) {
    parts.push(`${hours}${t('time.hours')}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}${t('time.minutes')}`);
  }
  // 如果所有部分都是 0，至少显示秒数
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}${t('time.seconds')}`);
  }

  // 根据语言选择合适的分隔符
  // 中文不需要空格，英文需要空格
  const separator = t('time.separator');
  return parts.join(separator);
}

/**
 * 格式化过期时间，显示日期和剩余天数
 * @param expiresAt - ISO 8601 格式的过期时间字符串 (例如: "2025-09-29T11:24:19.439Z")
 * @param t - 国际化翻译函数
 * @returns 格式化后的过期时间字符串，如果为空则返回"永久有效"
 *
 * 示例：
 * formatExpiryDate("2025-09-29T11:24:19.439Z", t) => "2025/09/29 11:24:19 (120天 后过期)"（未过期）
 * formatExpiryDate("2024-01-15T08:30:00.000Z", t) => "2024/01/15 08:30:00 (已过期)"（已过期）
 * formatExpiryDate("", t) => "永久有效"（空字符串）
 */
export function formatExpiryDate(expiresAt: string, t: (key: string, params?: any) => string): string {
  // 如果 expiresAt 为空，返回"永久有效"
  if (!expiresAt || expiresAt.trim() === '') {
    return t('tooltips.permanent');
  }

  try {
    // 解析 ISO 8601 日期字符串
    const expiryDate = new Date(expiresAt);

    // 检查日期是否有效
    if (isNaN(expiryDate.getTime())) {
      return t('tooltips.permanent'); // 无效日期，显示永久有效
    }

    // 格式化日期为 yyyy/MM/DD hh:mm:ss
    const year = expiryDate.getFullYear();
    const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
    const day = String(expiryDate.getDate()).padStart(2, '0');
    const hours = String(expiryDate.getHours()).padStart(2, '0');
    const minutes = String(expiryDate.getMinutes()).padStart(2, '0');
    const seconds = String(expiryDate.getSeconds()).padStart(2, '0');

    const formattedDate = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;

    // 计算距离过期的时间差（精确到秒）
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    // 根据是否过期返回不同的格式
    if (diffSeconds < 0) {
      // 已过期
      return `${formattedDate} (${t('tooltips.expiredOn')})`;
    } else {
      // 未过期，计算完整的时间差（天、小时、分钟、秒）
      const days = Math.floor(diffSeconds / 86400);
      const hours = Math.floor((diffSeconds % 86400) / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      const seconds = diffSeconds % 60;

      // 构建时间部分（复用 formatRemainingTime 的逻辑）
      const parts: string[] = [];
      if (days > 0) {
        parts.push(`${days}${t('time.days')}`);
      }
      if (hours > 0) {
        parts.push(`${hours}${t('time.hours')}`);
      }
      if (minutes > 0) {
        parts.push(`${minutes}${t('time.minutes')}`);
      }
      // 如果所有部分都是 0，至少显示秒数
      if (seconds > 0 || parts.length === 0) {
        parts.push(`${seconds}${t('time.seconds')}`);
      }

      // 根据语言选择合适的分隔符（中文无空格，英文有空格）
      const separator = t('time.separator');
      const timeStr = parts.join(separator);

      return `${formattedDate} (${t('tooltips.expiresInDetail', { time: timeStr })})`;
    }
  } catch (error) {
    // 解析失败，返回永久有效
    return t('tooltips.permanent');
  }
}
