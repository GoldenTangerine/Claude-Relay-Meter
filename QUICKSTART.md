# 快速开始指南

本指南将帮助您快速配置和使用 Claude Relay Meter 插件。

## 第一步：安装插件

### 方法 1：从 VSIX 文件安装（推荐）

1. 打开 VSCode
2. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
3. 输入 "Install from VSIX"
4. 选择下载的 `claude-relay-meter-1.0.0.vsix` 文件
5. 等待安装完成并重启 VSCode

### 方法 2：从源码安装

```bash
# 克隆或下载项目
cd claude-relay-meter

# 安装依赖
npm install

# 编译项目
npm run compile

# 打包（可选）
npm run package
```

## 第二步：获取 API 信息

您需要准备以下信息：

1. **API URL**：您的中继服务 API 地址
   - 示例：`https://text.com/apiStats`

2. **API ID**：您的 API 标识符（UUID 格式）
   - 示例：`34arr92a-cb42-58op-56op-ggy15rt9878c`

## 第三步：配置插件

### 方法 1：通过设置界面配置（推荐）

1. 打开 VSCode 设置
   - Windows/Linux: `Ctrl+,`
   - Mac: `Cmd+,`

2. 在搜索框中输入 "Claude Relay Meter"

3. 配置以下必需项：
   - **API URL**: 输入您的 API 地址
   - **API ID**: 输入您的 API 标识符

4. 可选配置项：
   - **刷新间隔**: 默认 60 秒（最小 10 秒）
   - **启用状态栏颜色**: 建议保持启用
   - **颜色阈值**: 默认低于 50% 绿色，50-80% 黄色，高于 80% 红色
   - **自定义颜色**: 可以自定义各阈值的颜色

### 方法 2：通过 JSON 配置

1. 打开 VSCode 设置 JSON 文件
   - 按 `Ctrl+Shift+P` (或 `Cmd+Shift+P`)
   - 输入 "Preferences: Open Settings (JSON)"

2. 添加以下配置：

```json
{
  "relayMeter.apiUrl": "https://text.com/apiStats",
  "relayMeter.apiId": "34arr92a-cb42-58op-56op-ggy15rt9878c",
  "relayMeter.refreshInterval": 60,
  "relayMeter.enableStatusBarColors": true,
  "relayMeter.colorThresholds": {
    "low": 50,
    "medium": 80
  },
  "relayMeter.customColors": {
    "low": "#66BB6A",
    "medium": "#FFD700",
    "high": "#FF6600"
  },
  "relayMeter.enableLogging": true
}
```

3. 保存文件

## 第四步：验证安装

配置完成后，您应该看到：

1. **状态栏右侧** 显示费用使用情况：
   ```
   $(graph) $3.96/$100.00 3.96%
   ```

2. **鼠标悬停** 在状态栏项上，可以看到详细信息：
   - 每日费用限制
   - 总费用限制
   - Opus 模型周费用限制

3. **颜色变化**：
   - 绿色：使用率 < 50%
   - 黄色：使用率 50% - 80%
   - 红色：使用率 > 80%

## 第五步：使用功能

### 手动刷新

- **方法 1**：点击状态栏项
- **方法 2**：
  1. 按 `Ctrl+Shift+P` (或 `Cmd+Shift+P`)
  2. 输入 "Claude Relay Meter: 刷新统计数据"

### 打开设置

1. 按 `Ctrl+Shift+P` (或 `Cmd+Shift+P`)
2. 输入 "Claude Relay Meter: 打开设置"

### 查看日志

1. 打开输出面板：`Ctrl+Shift+U` (或 `Cmd+Shift+U`)
2. 在下拉菜单中选择 "Claude Relay Meter"
3. 查看详细的运行日志

## 常见问题

### 状态栏显示 "需要配置"

**原因**：未配置 API URL 或 API ID

**解决方法**：
1. 点击状态栏项
2. 按照提示配置 API 信息

### 状态栏显示 "获取数据失败"

**可能原因**：
1. 网络连接问题
2. API URL 或 API ID 配置错误
3. API 服务不可用

**解决方法**：
1. 检查网络连接
2. 验证 API URL 和 API ID 是否正确
3. 查看输出面板的详细错误信息
4. 尝试手动刷新

### 数据更新不及时

**解决方法**：
1. 手动刷新数据
2. 调整刷新间隔（建议不少于 10 秒）
3. 检查日志查看是否有错误

### 颜色不显示

**解决方法**：
1. 检查是否启用了 "启用状态栏颜色" 选项
2. 检查自定义颜色配置是否正确（应为十六进制颜色代码）

## 高级配置

### 自定义颜色阈值

如果您想在使用率达到 60% 和 90% 时改变颜色：

```json
{
  "relayMeter.colorThresholds": {
    "low": 60,
    "medium": 90
  }
}
```

### 自定义颜色

如果您想使用不同的颜色方案：

```json
{
  "relayMeter.customColors": {
    "low": "#4CAF50",    // 绿色
    "medium": "#FFC107", // 橙色
    "high": "#F44336"    // 红色
  }
}
```

### 调整刷新间隔

如果您想更频繁地更新数据（注意：频繁请求可能增加服务器负担）：

```json
{
  "relayMeter.refreshInterval": 30  // 每 30 秒刷新一次
}
```

## 获取帮助

如果您遇到问题或有建议：

1. 查看输出面板的日志
2. 查看 [README.md](README.md) 获取详细文档
3. 查看 [CHANGELOG.md](CHANGELOG.md) 了解最新更新
4. 提交 Issue 或联系支持

## 下一步

现在您已经成功配置了 Claude Relay Meter！

- 定期检查费用使用情况
- 根据需要调整配置
- 利用详细的悬停信息做出决策

祝您使用愉快！🎉
