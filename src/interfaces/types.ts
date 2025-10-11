/**
 * 文件说明：定义 Claude Relay Service API 的数据接口
 * 作用：提供类型安全和代码提示
 */

/**
 * API 响应的根接口
 */
export interface RelayApiResponse {
  success: boolean;
  data: RelayUserData;
}

/**
 * 用户数据接口
 */
export interface RelayUserData {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
  expirationMode: string;
  isActivated: boolean;
  activationDays: number;
  activatedAt: string;
  permissions: string;
  usage: UsageData;
  limits: LimitsData;
  accounts: AccountsData;
  restrictions: RestrictionsData;
}

/**
 * 使用量数据接口
 */
export interface UsageData {
  total: TotalUsage;
}

/**
 * 总使用量接口
 */
export interface TotalUsage {
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreateTokens: number;
  cacheReadTokens: number;
  allTokens: number;
  requests: number;
  cost: number;
  formattedCost: string;
}

/**
 * 限制数据接口
 */
export interface LimitsData {
  tokenLimit: number;
  concurrencyLimit: number;
  rateLimitWindow: number;
  rateLimitRequests: number;
  rateLimitCost: number;
  dailyCostLimit: number;
  totalCostLimit: number;
  weeklyOpusCostLimit: number;
  currentWindowRequests: number;
  currentWindowTokens: number;
  currentWindowCost: number;
  currentDailyCost: number;
  currentTotalCost: number;
  weeklyOpusCost: number;
  windowStartTime: string | null;
  windowEndTime: string | null;
  windowRemainingSeconds: number | null;
}

/**
 * 账户数据接口
 */
export interface AccountsData {
  claudeAccountId: string | null;
  geminiAccountId: string | null;
  openaiAccountId: string | null;
  details: any | null;
}

/**
 * 限制规则数据接口
 */
export interface RestrictionsData {
  enableModelRestriction: boolean;
  restrictedModels: string[];
  enableClientRestriction: boolean;
  allowedClients: string[];
}

/**
 * 费用统计信息接口（用于状态栏显示）
 */
export interface CostStats {
  used: number;
  limit: number;
  percentage: number;
  formattedUsed: string;
  formattedLimit: string;
  formattedPercentage: string;
}

/**
 * 状态栏显示配置接口
 */
export interface StatusBarConfig {
  apiUrl: string;
  apiId: string;
  apiKey: string;
  refreshInterval: number;
  enableStatusBarColors: boolean;
  colorThresholds: ColorThresholds;
  customColors: CustomColors;
  enableLogging: boolean;
}

/**
 * API Key 转换响应接口
 */
export interface ApiKeyResponse {
  success: boolean;
  data?: {
    apiId: string;
  };
  message?: string;
}

/**
 * 颜色阈值配置接口
 */
export interface ColorThresholds {
  low: number;
  medium: number;
}

/**
 * 自定义颜色配置接口
 */
export interface CustomColors {
  low: string;
  medium: string;
  high: string;
}
