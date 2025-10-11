/**
 * 文件说明：国际化 (i18n) 工具
 * 作用：提供统一的翻译接口，支持多语言切换
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { log } from './logger';
import { LanguagePack } from '../interfaces/i18n';

// 语言包存储
const languagePacks: { [key: string]: LanguagePack } = {};

let currentLanguage = 'zh';
let currentLanguagePack: LanguagePack;
let onLanguageChangeCallback: ((newLanguage: string, languageLabel: string) => void) | null = null;

/**
 * 初始化国际化系统
 */
export function initializeI18n(): void {
  loadLanguagePacks();

  // 设置初始语言包
  if (!currentLanguagePack) {
    const config = vscode.workspace.getConfiguration('relayMeter');
    const language = config.get<string>('language', 'zh');
    currentLanguagePack = languagePacks[language] || languagePacks['zh'];
    currentLanguage = language;

    if (!currentLanguagePack) {
      log('[I18n] 严重错误：没有可用的语言包！扩展可能无法正常工作。', true);
    }
  }

  updateCurrentLanguage();

  // 监听语言设置变化
  vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
    if (e.affectsConfiguration('relayMeter.language')) {
      updateCurrentLanguage();
      log('[I18n] 语言设置已变更，重新加载语言包');
    }
  });
}

/**
 * 从文件加载语言包
 */
function loadLanguagePackFromFile(languageCode: string): LanguagePack | null {
  try {
    // 获取扩展根目录路径
    const extensionPath = vscode.extensions.getExtension('claude-relay-meter.claude-relay-meter')?.extensionPath;
    if (!extensionPath) {
      log(`[I18n] 扩展路径未找到`, true);
      return null;
    }

    // 尝试多个路径以处理开发和生产场景
    const possiblePaths = [
      // 生产路径（扩展打包后）
      path.join(extensionPath, 'src', 'locales', `${languageCode}.json`),
      // 备用生产路径
      path.join(extensionPath, 'locales', `${languageCode}.json`),
      // 开发路径
      path.join(extensionPath, 'out', 'locales', `${languageCode}.json`),
    ];

    let localesPath: string | null = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        localesPath = testPath;
        break;
      }
    }

    if (!localesPath) {
      log(`[I18n] 在以下路径中均未找到语言文件: ${possiblePaths.join(', ')}`, true);
      return null;
    }

    const fileContent = fs.readFileSync(localesPath, 'utf8');
    const languagePack = JSON.parse(fileContent) as LanguagePack;

    log(`[I18n] 已加载语言包: ${languageCode} 从 ${localesPath}`);
    return languagePack;
  } catch (error) {
    log(
      `[I18n] 加载语言包失败 ${languageCode}: ${error instanceof Error ? error.message : String(error)}`,
      true,
    );
    return null;
  }
}

/**
 * 加载所有语言包
 */
function loadLanguagePacks(): void {
  const supportedLanguages = ['zh', 'en'];

  for (const lang of supportedLanguages) {
    const pack = loadLanguagePackFromFile(lang);
    if (pack) {
      languagePacks[lang] = pack;
    }
  }

  // 确保中文语言包已加载（必需的默认语言）
  if (!languagePacks['zh']) {
    log(
      '[I18n] 严重错误：中文语言包未加载！扩展可能无法正常工作。',
      true,
    );
  }

  log('[I18n] 语言包已加载');
}

/**
 * 更新当前语言
 */
function updateCurrentLanguage(): void {
  const config = vscode.workspace.getConfiguration('relayMeter');
  const newLanguage = config.get<string>('language', 'zh');

  if (newLanguage !== currentLanguage) {
    const oldLanguage = currentLanguage;
    currentLanguage = newLanguage;

    // 获取语言包，如果不可用则回退到中文
    const languagePack = languagePacks[newLanguage] || languagePacks['zh'];
    if (languagePack) {
      currentLanguagePack = languagePack;
      log(`[I18n] 语言已切换为: ${newLanguage}`);

      // 触发语言变更回调
      if (onLanguageChangeCallback && oldLanguage !== 'zh') {
        // 避免初始化时触发
        const languageLabels: { [key: string]: string } = {
          zh: '中文',
          en: 'English',
        };
        onLanguageChangeCallback(newLanguage, languageLabels[newLanguage] || newLanguage);
      }
    } else {
      log(`[I18n] 警告: 没有找到 ${newLanguage} 或中文的语言包`, true);
    }
  }
}

/**
 * 获取翻译文本（支持回退机制）
 * @param key 翻译键（支持嵌套，例如 'statusBar.loading'）
 * @param params 替换参数
 */
export function t(key: string, params?: { [key: string]: string | number }): string {
  let value = getTranslationValue(key, currentLanguagePack);

  // 如果当前语言中未找到翻译且当前语言不是中文，尝试中文回退
  if (value === null && currentLanguage !== 'zh' && languagePacks['zh']) {
    log(`[I18n] 在 ${currentLanguage} 中未找到翻译键 '${key}'，回退到中文`);
    value = getTranslationValue(key, languagePacks['zh']);
  }

  // 如果仍然没有找到翻译，返回键本身
  if (value === null) {
    log(`[I18n] 在任何语言包中都未找到翻译键: ${key}`, true);
    return key;
  }

  if (typeof value !== 'string') {
    log(`[I18n] 翻译值不是字符串: ${key}`, true);
    return key;
  }

  // 替换参数
  if (params) {
    Object.keys(params).forEach((param) => {
      value = value.replace(new RegExp(`{${param}}`, 'g'), params[param].toString());
    });
  }

  return value;
}

/**
 * 辅助函数：从语言包中获取翻译值
 * @param key 翻译键
 * @param languagePack 要搜索的语言包
 * @returns 翻译值或 null（如果未找到）
 */
function getTranslationValue(key: string, languagePack: LanguagePack): any {
  if (!languagePack) {
    return null;
  }

  const keys = key.split('.');
  let value: any = languagePack;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return null; // 键未找到
    }
  }

  return value;
}

/**
 * 获取当前语言
 */
export function getCurrentLanguage(): string {
  return currentLanguage;
}

/**
 * 获取当前语言包
 */
export function getCurrentLanguagePack(): LanguagePack {
  return currentLanguagePack;
}

/**
 * 设置语言变更回调函数
 */
export function setOnLanguageChangeCallback(
  callback: (newLanguage: string, languageLabel: string) => void,
): void {
  onLanguageChangeCallback = callback;
}
