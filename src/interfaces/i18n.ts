/**
 * 文件说明：国际化语言包接口定义
 * 作用：定义所有翻译键的类型结构
 */

// 语言包接口
export interface LanguagePack {
  // 状态栏相关
  statusBar: {
    loading: string;
    error: string;
    notConfigured: string;
    notConfiguredApiUrl: string;
    notConfiguredApiId: string;
    title: string;
    initializing: string;
    refreshData: string;
  };

  // 命令相关
  commands: {
    refreshStats: string;
    openSettings: string;
    selectLanguage: string;
    configureNow: string;
    later: string;
    languageChanged: string;
    selectLanguagePrompt: string;
  };

  // 通知消息
  notifications: {
    configInvalid: string;
    dataRefreshed: string;
    errorOccurred: string;
    retryOption: string;
    openSettingsOption: string;
  };

  // 工具提示
  tooltips: {
    title: string;
    user: string;
    dailyCostLimit: string;
    totalCostLimit: string;
    opusWeeklyCostLimit: string;
    otherStats: string;
    usageStatus: string;
    usedAmount: string;
    limitAmount: string;
    percentage: string;
    totalRequests: string;
    totalTokens: string;
    clickToRefresh: string;
    clickToConfigure: string;
    tip: string;
    updateTime: string;
    needConfiguration: string;
    pleaseConfigureFirst: string;
    pleaseConfigureApiUrl: string;
    pleaseConfigureApiIdOrKey: string;
  };

  // 错误消息
  errors: {
    invalidApiUrl: string;
    invalidApiId: string;
    invalidUuid: string;
    networkError: string;
    apiError: string;
    requestFailed: string;
    activationFailed: string;
    cannotGetApiIdFromKey: string;
  };

  // 日志消息
  logs: {
    activating: string;
    activationComplete: string;
    statusBarCreated: string;
    configInvalid: string;
    configValid: string;
    fetchingData: string;
    dataFetched: string;
    windowFocused: string;
    configChanged: string;
    manualRefresh: string;
    openingSettings: string;
    timerStarted: string;
    i18nInitialized: string;
    languageChanged: string;
  };

  // API 相关
  api: {
    requestingUserStats: string;
    requestSuccess: string;
    requestFailed: string;
    retrying: string;
    retryAttempt: string;
    validatingConfig: string;
    gettingApiIdFromKey: string;
  };

  // 设置相关
  settings: {
    apiUrl: string;
    apiId: string;
    apiKey: string;
    refreshInterval: string;
    enableStatusBarColors: string;
    colorThresholds: string;
    customColors: string;
    enableLogging: string;
    language: string;
  };
}
