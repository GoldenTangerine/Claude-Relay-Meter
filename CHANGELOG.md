# 更新日志

所有关于此项目的重要更改都将记录在此文件中。

## [1.0.9] - 2025-10-24

### ✨ 新增
- **费率限制窗口（Rate Limit Window）支持**
  - 新增周限制（Window Limit）检测和显示功能
  - 当 `currentWindowCost > 0` 且 `rateLimitCost > 0` 时自动启用周限制显示
  - 状态栏显示格式：
    - 无周限制：`$(graph) $X/$Y Z%`
    - 有周限制：`$(graph) 日:$X/$Y Z% | 周:$A/$B C%`
  - 周限制百分比优先用于状态栏颜色显示

- **剩余时间倒计时**
  - 新增 `windowRemainingSeconds` 剩余时间显示
  - 自动转换为易读格式：
    - 中文：`"1天2小时3分4秒"`
    - 英文：`"1d 2h 3m 4s"`
  - 支持过期状态显示："已过期" / "Expired"

### 🎨 改进
- **悬浮窗内容重构**
  - 将"Opus 模型周费用限制"标题改为"费率限制"
  - 优化费率限制区域显示：
    - **Opus：** $0 / $50 🟢 0%
    - **周限制：** $20.44 / $133 🟢 15.37%
    - **剩余时间：** 剩余 1天1小时41分24秒 后重置
  - 修复换行问题：所有行正确使用 `\n\n` 双换行符，避免内容拥挤
  - 移除"其他统计"标题，直接显示统计数据，简化界面

### 🛠️ 技术改进
- **新增时间格式化函数**
  - 添加 `formatRemainingTime(seconds, t)` 函数
  - 支持国际化时间单位（天、小时、分、秒）
  - 智能分隔符：中文无分隔符，英文使用空格

- **国际化翻译更新**
  - 新增翻译键：
    - `statusBar.daily` / `statusBar.window` - 状态栏日/周标签
    - `tooltips.rateLimitTitle` - "费率限制"
    - `tooltips.windowLimit` - "周限制"
    - `tooltips.opusLabel` - "Opus"
    - `tooltips.resetTime` / `tooltips.resetsIn` - 剩余时间相关
    - `time.*` - 时间单位（days, hours, minutes, seconds, separator, expired）

- **状态栏处理优化**
  - 改进 `updateStatusBar()` 函数，支持双模式显示
  - 重构 `createTooltip()` 函数，优化费率限制区域
  - 导入 `formatRemainingTime` 函数

### 📝 文档更新
- 更新 `CLAUDE.md` - 新增周限制功能说明
- 更新 API 响应字段文档：
  - `rateLimitCost` - 费率限制窗口支出限额
  - `currentWindowCost` - 当前窗口支出
  - `windowRemainingSeconds` - 窗口重置剩余秒数
- 更新状态栏显示格式说明
- 更新语言包结构说明

### 🌐 国际化
- 完整支持中英文双语显示
- 所有新增文本通过 `t()` 函数实现多语言
- 时间格式根据语言自动调整

### 💡 用户体验提升
- **更清晰的限制显示**：日限制和周限制同时显示，一目了然
- **实时倒计时**：周限制重置时间可视化，便于规划使用
- **自适应显示**：无周限制时保持简洁，有周限制时自动展开
- **视觉优化**：修复换行问题，悬浮窗排版更舒适

---

## [1.0.8] - 2025-10-22

### 🔄 重大重构
- **配置管理系统完全重构**
  - 移除 `globalState` 存储,所有配置统一在 VSCode 设置中管理
  - 配置初始化时自动从 `~/.claude/settings.json` 读取并填入 VSCode 设置
  - 简化配置优先级:只使用 VSCode 设置作为唯一配置源
  - 大幅简化代码架构,提升维护性

### ✨ 新增
- **自动配置初始化**
  - 首次使用时自动从 `~/.claude/settings.json` 读取配置
  - 自动读取 `ANTHROPIC_AUTH_TOKEN`（映射为 `apiKey`）
  - 自动读取 `ANTHROPIC_BASE_URL`（映射为 `apiUrl`,自动去除 `/api` 后缀）
  - 仅在设置为空时才自动填入,避免覆盖用户配置
  - 跨平台支持（Windows/macOS/Linux）

- **智能配置变更监听**
  - 实时监听 `~/.claude/settings.json` 文件变更（300ms 防抖）
  - 检测到配置变更时立即弹出友好提示
  - 对比当前 VSCode 设置与新配置,仅在不同时提示
  - 用户可选择:
    - **"使用新配置"** - 更新 VSCode 设置,继续监听
    - **"保持当前配置"** - 关闭监听开关,不再提示
  - 配置对比使用脱敏显示,保护 API Key 安全

- **监听控制开关**
  - 新增配置项 `relayMeter.watchClaudeSettings`（boolean,默认 true）
  - 用户可在设置中随时开启/关闭 Claude Settings 监听
  - 关闭监听后不再检测配置变更,直到用户手动重新开启
  - 状态栏 tooltip 显示监听状态提示（关闭时显示 ⚠️ 警告）

### 🎨 改进
- **简化悬浮窗按钮文字**
  - "打开设置" → "设置"
  - "网页仪表板" → "仪表盘"
  - 减少文字,界面更简洁清爽

- **优化配置变更提示**
  - 提示消息更简洁,单行显示配置对比
  - API Key 使用脱敏格式显示（如 `cr_b7a7***b1eb`）
  - 默认行为优化:按 Enter 或关闭对话框即使用新配置

### 🛠️ 技术改进
- **configManager.ts 完全重写**
  - 移除所有 `globalState` 相关逻辑
  - 移除 `RuntimeConfig`, `SkippedConfig` 等复杂概念
  - 新增函数:
    - `getVSCodeConfig()` - 获取 VSCode 设置
    - `updateVSCodeConfig()` - 更新 VSCode 设置
    - `hasConfig()` - 检查是否有配置
    - `isWatchEnabled()` - 检查监听开关
    - `setWatchEnabled()` - 设置监听开关
  - 保留通用函数: `compareConfigs()`, `maskApiKey()`

- **claudeSettingsWatcher.ts 重构**
  - 移除 `extensionContext` 依赖
  - 配置比对改为:新配置 vs 当前 VSCode 设置
  - 新增 `disableWatching()` 函数处理监听关闭
  - 移除 `applyNewConfig()` 和 `keepCurrentConfig()` 复杂逻辑
  - 简化为直接操作 VSCode 设置

- **extension.ts 初始化优化**
  - 移除 `ConfigManager.initialize(context)` 调用
  - 新增 `initializeConfigFromClaudeSettings()` 函数
  - 简化配置读取逻辑,直接从 VSCode 设置获取
  - 监听开关变更时动态启停文件监听
  - 移除手动配置检查逻辑,改用监听开关判断

- **statusBar.ts 状态显示**
  - 添加监听状态检测
  - 关闭监听时在 tooltip 显示警告提示
  - 导入 `ConfigManager` 模块

### 🌐 国际化更新
- 中文翻译（zh.json）:
  - `notifications.watchDisabled` - 监听关闭提示
  - `notifications.claudeConfigChangedDetail` - 优化配置变更提示格式
  - `tooltips.watchDisabled` - 监听状态提示

- 英文翻译（en.json）:
  - 对应的完整英文翻译

### 📝 文档更新
- 更新 `CLAUDE.md` - 更新配置管理系统说明
- 添加监听开关配置说明
- 更新配置变更检测流程图
- 更新技术架构说明

### 💡 用户体验提升
- **零配置体验**: Claude Code 用户首次使用即可自动配置,无需手动设置
- **配置同步**: Claude Code 配置变更时自动检测并智能提示
- **灵活控制**: 用户可完全控制是否监听配置变更
- **状态透明**: 监听状态在 UI 中清晰可见
- **架构简化**: 移除 globalState,所有配置统一管理,降低复杂度

---

## [1.0.7] - 2025-10-15

### 🐛 修复
- **API Key 转换优化**
  - 修复 API Key 到 API ID 转换接口路径错误
  - 正确的接口路径：`/apiStats/api/get-key-id`（而非 `/api/get-key-id`）
  - 修复响应数据字段映射：使用 `data.id` 代替 `data.apiId`

- **配置验证逻辑改进**
  - 优化 API 配置验证顺序，提升用户体验
  - 仅在提供 API ID 时才验证 UUID 格式
  - API Key 格式验证交由服务端处理，避免客户端限制
  - 改进错误提示文案，明确 API ID 和 API Key 二选一的逻辑

### 🛠️ 技术改进
- 更新 `validateApiConfig()` 函数签名，增加 `apiKey` 可选参数
- 优化 `updateStats()` 函数中配置验证时机
- 在获取 API ID 前先进行基础配置验证
- 更新 [src/interfaces/types.ts](src/interfaces/types.ts) 中 `ApiKeyResponse` 接口定义
- 改进中英文语言包中的配置提示文案

### 📝 文档更新
- 明确配置说明："API URL（必填）+ API ID 或 API Key（二选一）"

---

## [1.0.6] - 2025-10-15

### 🎨 改进
- **优化悬浮窗布局，防止滚动条**
  - 精简 tooltip 垂直空间占用
  - 将"使用状态"和"百分比"合并到同一行显示
  - 将统计信息（请求数、Token、总费用）合并为一行，用 `|` 分隔
  - 移除多余的分隔线和换行符
  - 为各区块添加 emoji 图标（📊💰🚀📈💡🕐），提升视觉效果
  - 预计减少悬浮窗高度约 30-40%，避免出现滚动条

### 🛠️ 技术改进
- 更新 `src/handlers/statusBar.ts` 中的 `createTooltip()` 函数
- 优化 Markdown 排版，保持所有关键信息的可读性

---

## [1.0.5] - 2025-10-15

### ✨ 新增
- **悬浮窗总费用显示**
  - 在状态栏悬浮窗的"其他统计"部分添加"总费用"字段
  - 显示累计总花费，数据来源：API 响应的 `formattedCost` 字段
  - 示例：**总费用：** $160.35
  - 支持中英文界面

### 📚 文档改进
- **API 响应格式文档**
  - 在 `CLAUDE.md` 中添加完整的 API 响应示例
  - 包含 `/api/user-stats` 端点的详细数据结构说明
  - 添加关键字段说明，便于后续开发和调试

### 🛠️ 技术改进
- 更新 `src/handlers/statusBar.ts` 中的 `createTooltip()` 函数
- 在中英文语言包中添加 `tooltips.totalCost` 翻译
- 直接使用 API 返回的格式化字段，避免重复处理

---

## [1.0.4] - 2025-10-14

### 🎨 改进
- **大数字显示优化**
  - 优化总请求数和总 Token 数的显示格式
  - 自动转换为易读单位：K（千）、M（百万）、B（十亿）
  - 示例：
    - `4,042` → `4K`
    - `171,659,455` → `171.7M`
    - `1,500,000,000` → `1.5B`
  - 智能小数位保留：数值 < 10 保留2位，≥ 10 保留1位
  - 自动去除末尾零，保持简洁

### 🛠️ 技术改进
- 新增 `formatLargeNumber()` 函数在 `src/utils/formatter.ts`
- 更新状态栏悬浮窗中的"其他统计"显示逻辑
- 改进数字可读性，提升用户体验

---

## [1.0.3] - 2025-10-11

### ✨ 新增
- **网页仪表板快捷入口**
  - 在状态栏悬浮窗中添加"网页仪表板"按钮
  - 点击按钮可直接在浏览器中打开中继服务的 API 统计网页
  - 自动构建 URL：`${apiUrl}/admin-next/api-stats?apiId=${apiId}`
  - 支持中英文界面

### 🎨 改进
- **优化悬浮窗布局**
  - 将操作按钮区域从单行改为两行显示
  - 第一行：💡 提示文本
  - 第二行：操作按钮（打开设置 | 网页仪表板）
  - 避免内容拥挤，提升可读性

### 🛠️ 技术改进
- 新增命令：`claude-relay-meter.openWebDashboard`
- 使用 `vscode.env.openExternal()` 打开外部链接
- 更新 `updateStatusBar()` 和 `createTooltip()` 函数签名
- 简化国际化文本："打开网页仪表板" → "网页仪表板"

### 👥 贡献者
- Co-authored-by: GoldenTangerine

---

## [1.0.2] - 2025-10-11

### 🌐 新增
- ✨ **完整的国际化支持 (i18n)**
  - 支持中文和英文界面
  - 新增语言选择命令：`Select Language / 选择语言`
  - 新增配置项：`relayMeter.language`
  - 所有用户可见文本支持多语言
  - 实时语言切换，无需重启

### 🛠️ 技术改进
- 实现完整的 i18n 系统（参照 cursor-stats 设计）
- 新增 `src/interfaces/i18n.ts` - 语言包类型定义
- 新增 `src/utils/i18n.ts` - 国际化工具
- 新增 `src/locales/zh.json` 和 `en.json` - 语言包
- 翻译函数 `t()` 支持嵌套键和参数替换
- 自动回退到中文（如果翻译缺失）

### 🐛 修复
- 修复扩展加载失败问题（asynckit 模块找不到）
- 修复输出通道不显示在下拉列表的问题
- 修复未配置时状态栏不显示的问题
- 优化依赖打包策略，确保所有嵌套依赖被正确包含

### 📦 构建优化
- 编译脚本自动复制语言包文件到 `out/locales/`
- 新增 `npm run copy-locales` 命令
- 移除 `.vscodeignore` 中的 node_modules 白名单限制

### 📝 文档更新
- 更新 `CLAUDE.md` - 添加国际化章节
- 新增 `UPDATE_NOTES_v1.0.2.md` - 详细更新说明
- 更新文件组织结构文档
- 添加如何添加新语言的指南

---

## [1.0.0] - 2025-10-11

### 新增功能
- ✅ 实现基本的用量监控功能
- ✅ 支持从 Claude Relay Service API 获取用量数据
- ✅ 在 VSCode 状态栏实时显示费用使用情况
- ✅ 支持智能颜色提示（绿/黄/红）
- ✅ 鼠标悬停显示详细的费用信息
  - 每日费用限制及使用情况
  - 总费用限制及使用情况
  - Opus 模型周费用限制及使用情况
- ✅ 支持自动定时刷新（默认 60 秒，可配置）
- ✅ 支持手动刷新统计数据
- ✅ 支持自定义 API URL 和 API ID
- ✅ 支持自定义刷新间隔
- ✅ 支持自定义颜色阈值和颜色
- ✅ 完善的错误处理和提示
- ✅ 详细的日志记录功能

### 技术特性
- ✅ 使用 TypeScript 开发，提供完整的类型安全
- ✅ 模块化的代码结构，易于维护和扩展
- ✅ 支持 API 请求重试机制（指数退避）
- ✅ 智能的窗口焦点检测
- ✅ 配置变更自动更新
- ✅ 完整的中文注释和文档

### 已知限制
- 仅支持单个 API 账户监控
- 数据刷新频率最小为 10 秒

### 计划功能
- [ ] 支持多账户监控
- [ ] 添加使用趋势图表
- [ ] 支持导出使用报告
- [ ] 添加使用警报通知
- [ ] 支持更多自定义配置选项

---

## 格式说明

- **新增功能** - 新添加的功能
- **改进** - 对现有功能的改进
- **修复** - Bug 修复
- **移除** - 移除的功能
- **安全** - 安全相关的更新
