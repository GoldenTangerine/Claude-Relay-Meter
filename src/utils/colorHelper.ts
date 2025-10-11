/**
 * 文件说明：颜色辅助工具
 * 作用：根据使用百分比返回相应的颜色
 */

import * as vscode from 'vscode';
import { ColorThresholds, CustomColors } from '../interfaces/types';

/**
 * 根据使用百分比获取状态栏颜色
 * @param percentage - 使用百分比（0-100）
 * @returns VSCode 主题颜色或十六进制颜色字符串
 *
 * 颜色规则：
 * - < 50%: 绿色（低使用率）
 * - 50-80%: 黄色（中使用率）
 * - > 80%: 红色（高使用率）
 */
export function getStatusBarColor(percentage: number): vscode.ThemeColor | string {
  // 获取配置
  const config = vscode.workspace.getConfiguration('relayMeter');
  const enableColors = config.get<boolean>('enableStatusBarColors', true);

  // 如果未启用颜色，返回默认颜色
  if (!enableColors) {
    return new vscode.ThemeColor('statusBarItem.foreground');
  }

  // 获取颜色阈值配置
  const thresholds = config.get<ColorThresholds>('colorThresholds', {
    low: 50,
    medium: 80,
  });

  // 获取自定义颜色配置
  const colors = config.get<CustomColors>('customColors', {
    low: '#66BB6A',
    medium: '#FFD700',
    high: '#FF6600',
  });

  // 根据百分比和阈值返回相应颜色
  if (percentage < thresholds.low) {
    // 低使用率：绿色
    return colors.low;
  } else if (percentage < thresholds.medium) {
    // 中使用率：黄色
    return colors.medium;
  } else {
    // 高使用率：红色
    return colors.high;
  }
}

/**
 * 获取百分比对应的颜色描述文本
 * @param percentage - 使用百分比（0-100）
 * @returns 颜色描述文本（用于日志或提示）
 */
export function getColorDescription(percentage: number): string {
  const config = vscode.workspace.getConfiguration('relayMeter');
  const thresholds = config.get<ColorThresholds>('colorThresholds', {
    low: 50,
    medium: 80,
  });

  if (percentage < thresholds.low) {
    return '绿色（低使用率）';
  } else if (percentage < thresholds.medium) {
    return '黄色（中使用率）';
  } else {
    return '红色（高使用率）';
  }
}

/**
 * 验证颜色代码是否有效
 * @param color - 十六进制颜色代码
 * @returns 是否为有效的颜色代码
 */
export function isValidHexColor(color: string): boolean {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
}

/**
 * 获取默认颜色配置
 * @returns 默认的颜色阈值和自定义颜色配置
 */
export function getDefaultColorConfig(): {
  thresholds: ColorThresholds;
  colors: CustomColors;
} {
  return {
    thresholds: {
      low: 50,
      medium: 80,
    },
    colors: {
      low: '#66BB6A',
      medium: '#FFD700',
      high: '#FF6600',
    },
  };
}

/**
 * 将百分比映射到渐变色（可选功能，用于更细腻的颜色过渡）
 * @param percentage - 使用百分比（0-100）
 * @returns 十六进制颜色代码
 *
 * 说明：
 * - 0-50%: 从深绿到浅绿
 * - 50-80%: 从黄到橙
 * - 80-100%: 从橙到红
 */
export function getGradientColor(percentage: number): string {
  // 确保百分比在 0-100 范围内
  const p = Math.max(0, Math.min(100, percentage));

  if (p < 50) {
    // 绿色渐变（0-50%）
    const ratio = p / 50;
    return interpolateColor('#4CAF50', '#66BB6A', ratio);
  } else if (p < 80) {
    // 黄色到橙色渐变（50-80%）
    const ratio = (p - 50) / 30;
    return interpolateColor('#FFD700', '#FF8C00', ratio);
  } else {
    // 橙色到红色渐变（80-100%）
    const ratio = (p - 80) / 20;
    return interpolateColor('#FF6600', '#FF0000', ratio);
  }
}

/**
 * 在两个颜色之间插值
 * @param color1 - 起始颜色（十六进制）
 * @param color2 - 结束颜色（十六进制）
 * @param ratio - 插值比例（0-1）
 * @returns 插值后的颜色（十六进制）
 */
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const r = Math.round(
    parseInt(color1.substring(1, 3), 16) * (1 - ratio) +
      parseInt(color2.substring(1, 3), 16) * ratio
  );
  const g = Math.round(
    parseInt(color1.substring(3, 5), 16) * (1 - ratio) +
      parseInt(color2.substring(3, 5), 16) * ratio
  );
  const b = Math.round(
    parseInt(color1.substring(5, 7), 16) * (1 - ratio) +
      parseInt(color2.substring(5, 7), 16) * ratio
  );

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
