# Claude Relay Meter - 项目总结

## 项目概述

**Claude Relay Meter** 是一个用于监测 Claude Relay Service 中继服务用量的 VSCode 插件。它可以实时显示 API 使用情况，包括每日费用、总费用和 Opus 模型周费用等详细信息。

## 项目结构

```
Claude-Relay-Meter/
├── .vscode/
│   └── settings.json.example        # 配置示例文件
├── src/
│   ├── extension.ts                 # 插件主入口（激活、命令注册、生命周期管理）
│   ├── interfaces/
│   │   └── types.ts                 # TypeScript 类型定义
│   ├── services/
│   │   └── api.ts                   # API 请求服务（获取数据、重试机制）
│   ├── handlers/
│   │   └── statusBar.ts             # 状态栏处理器（创建、更新、显示）
│   └── utils/
│       ├── logger.ts                # 日志工具（记录、调试）
│       ├── formatter.ts             # 格式化工具（数字、百分比）
│       └── colorHelper.ts           # 颜色辅助（根据百分比返回颜色）
├── out/                             # 编译输出目录
├── node_modules/                    # 依赖包
├── package.json                     # 项目配置和依赖
├── tsconfig.json                    # TypeScript 配置
├── .gitignore                       # Git 忽略规则
├── README.md                        # 项目说明文档
├── QUICKSTART.md                    # 快速开始指南
├── CHANGELOG.md                     # 更新日志
└── plan.md                          # 原始需求文档
```

## 核心功能

### 1. 实时监控
- 自动从 Claude Relay Service API 获取用量数据
- 默认每 60 秒刷新一次（可配置，最小 10 秒）
- 窗口焦点管理（失焦时继续运行）

### 2. 状态栏显示
- 显示格式：`$(graph) $使用量/$限额 百分比%`
- 示例：`$(graph) $3.96/$100.00 3.96%`
- 数字保留最多 4 位小数
- 百分比保留最多 2 位小数

### 3. 智能颜色提示
- **绿色**（`#66BB6A`）：使用率 < 50%
- **黄色**（`#FFD700`）：使用率 50% - 80%
- **红色**（`#FF6600`）：使用率 > 80%
- 支持自定义颜色和阈值

### 4. 详细悬停信息
鼠标悬停在状态栏项上显示：
- 📊 每日费用限制：`$使用量/$限额 (百分比%)`
- 💰 总费用限制：`$使用量/$限额 (百分比%)`
- 🚀 Opus 模型周费用限制：`$使用量/$限额 (百分比%)`
- 📈 其他统计信息（总请求数、总 Token 数）
- 用户信息和更新时间

### 5. 配置管理
- API URL：中继服务地址（必需）
- API ID：用户标识符（必需，UUID 格式）
- 刷新间隔：10-无限秒（默认 60 秒）
- 启用状态栏颜色：开/关
- 颜色阈值：自定义百分比阈值
- 自定义颜色：自定义颜色代码
- 启用日志：开/关

### 6. 命令功能
- **刷新统计数据**：手动触发数据更新
- **打开设置**：快速打开插件设置页面

### 7. 错误处理
- API 配置验证（URL 格式、UUID 格式）
- 网络错误检测和提示
- 自动重试机制（指数退避，最多 3 次）
- 友好的错误消息显示
- 详细的日志记录

## 技术实现

### 技术栈
- **语言**：TypeScript 5.8.3
- **框架**：VSCode Extension API 1.96.0
- **HTTP 客户端**：Axios 1.9.0
- **编译**：TypeScript Compiler
- **代码质量**：ESLint

### 核心技术点

#### 1. API 请求（src/services/api.ts）
```typescript
// POST 请求到 {apiUrl}/api/user-stats
// 请求体：{ "apiId": "..." }
// 带重试机制（指数退避）
export async function fetchRelayStatsWithRetry(
  apiUrl: string,
  apiId: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<RelayApiResponse>
```

#### 2. 状态栏更新（src/handlers/statusBar.ts）
```typescript
// 更新状态栏文本和颜色
export function updateStatusBar(
  statusBarItem: vscode.StatusBarItem,
  data: RelayApiResponse
): void
```

#### 3. 数字格式化（src/utils/formatter.ts）
```typescript
// 最多保留 4 位小数，自动去除末尾零
export function formatNumber(num: number): string

// 最多保留 2 位小数，自动去除末尾零
export function formatPercentage(value: number, total: number): string
```

#### 4. 颜色管理（src/utils/colorHelper.ts）
```typescript
// 根据百分比返回相应颜色
export function getStatusBarColor(percentage: number): vscode.ThemeColor | string
```

#### 5. 定时刷新（src/extension.ts）
```typescript
// 启动定时器，定期更新数据
function startRefreshTimer(): void {
  const intervalMs = config.refreshInterval * 1000;
  refreshTimer = setInterval(async () => {
    if (isWindowFocused) {
      await updateStats();
    }
  }, intervalMs);
}
```

### 设计模式

#### 1. 模块化设计
- **interfaces/**：类型定义和接口
- **services/**：业务逻辑（API 请求）
- **handlers/**：UI 处理（状态栏）
- **utils/**：工具函数（日志、格式化、颜色）

#### 2. 关注点分离
- API 层：负责数据获取
- 处理器层：负责 UI 展示
- 工具层：提供通用功能
- 主入口：协调各层

#### 3. 错误处理策略
- 输入验证（配置验证）
- 网络错误处理（重试机制）
- 用户友好提示（错误消息）
- 详细日志记录（调试支持）

## 配置选项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `relayMeter.apiUrl` | string | `""` | API 基础地址 |
| `relayMeter.apiId` | string | `""` | API 标识符 |
| `relayMeter.refreshInterval` | number | `60` | 刷新间隔（秒） |
| `relayMeter.enableStatusBarColors` | boolean | `true` | 启用颜色 |
| `relayMeter.colorThresholds.low` | number | `50` | 低阈值 |
| `relayMeter.colorThresholds.medium` | number | `80` | 中阈值 |
| `relayMeter.customColors.low` | string | `"#66BB6A"` | 低使用率颜色 |
| `relayMeter.customColors.medium` | string | `"#FFD700"` | 中使用率颜色 |
| `relayMeter.customColors.high` | string | `"#FF6600"` | 高使用率颜色 |
| `relayMeter.enableLogging` | boolean | `true` | 启用日志 |

## 使用流程

```
用户配置 → 插件激活 → 验证配置 → 首次更新
                                  ↓
                              启动定时器
                                  ↓
                           定期获取数据 ← API 请求（带重试）
                                  ↓
                            更新状态栏 ← 格式化数据
                                  ↓
                            显示悬停提示 ← Markdown 格式
```

## 开发说明

### 编译项目
```bash
npm run compile
```

### 监听模式（开发时）
```bash
npm run watch
```

### 打包插件
```bash
npm run package
```

### 在 VSCode 中测试
1. 打开项目文件夹
2. 按 F5 启动调试
3. 在新窗口中测试插件

### 代码规范
- 所有代码使用 TypeScript
- 所有注释使用中文
- 遵循 ESLint 规则
- 使用有意义的变量名
- 保持函数简洁（单一职责）

## 部署说明

### 生成 VSIX 文件
```bash
npm run package
```

将生成 `claude-relay-meter-1.0.0.vsix` 文件。

### 安装插件
1. 方法 1：双击 `.vsix` 文件
2. 方法 2：VSCode → Extensions → `...` → Install from VSIX

## 测试清单

- [x] 插件激活和停用
- [x] API 配置验证
- [x] API 请求成功
- [x] API 请求失败处理
- [x] 状态栏显示正确
- [x] 颜色变化正确
- [x] 悬停提示显示
- [x] 手动刷新功能
- [x] 定时刷新功能
- [x] 配置变更响应
- [x] 窗口焦点管理
- [x] 日志记录正确
- [x] 错误提示友好

## 已知限制

1. 仅支持单个 API 账户监控
2. 数据刷新频率最小为 10 秒
3. 需要网络连接才能工作
4. API 返回数据格式固定

## 未来规划

### v1.1.0
- [ ] 支持多账户监控
- [ ] 添加使用趋势图表
- [ ] 支持导出使用报告

### v1.2.0
- [ ] 添加使用警报通知
- [ ] 支持自定义警报阈值
- [ ] 添加每日/每周使用统计

### v2.0.0
- [ ] 添加数据可视化面板
- [ ] 支持历史数据查看
- [ ] 支持费用预测功能

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件
- 参与讨论

---

**开发完成日期**：2025-10-11
**版本**：v1.0.0
**开发者**：Claude Agent
**技术栈**：TypeScript + VSCode Extension API + Axios
