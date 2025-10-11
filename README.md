# Claude Relay Meter

## 简介

Claude Relay Meter 是一个用于监测 Claude Relay Service 中继服务用量的 VSCode 插件。它可以在 VSCode 状态栏实时显示您的 API 使用情况，包括每日费用、总费用和 Opus 模型周费用等详细信息。

## 功能特性

- ✅ **实时监控**：自动获取并显示 API 使用情况
- 📊 **状态栏显示**：在状态栏显示当前费用使用情况
- 🎨 **智能颜色提示**：根据使用百分比自动变化颜色
  - 绿色：使用率 < 50%
  - 黄色：使用率 50% - 80%
  - 红色：使用率 > 80%
- 🔍 **详细信息悬停**：鼠标悬停显示完整的费用详情
- ⚙️ **灵活配置**：支持自定义 API 地址、刷新间隔、颜色等

## 安装

### 方法 1：从 VSIX 文件安装
1. 下载 `.vsix` 文件
2. 在 VSCode 中按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
3. 输入 "Install from VSIX"
4. 选择下载的 `.vsix` 文件

### 方法 2：从源码构建
```bash
# 克隆仓库
git clone https://github.com/your-repo/claude-relay-meter.git
cd claude-relay-meter

# 安装依赖
npm install

# 编译
npm run compile

# 打包（可选）
npm run package
```

## 配置

首次使用前，您需要配置以下设置：

1. 打开 VSCode 设置（`Ctrl+,` 或 `Cmd+,`）
2. 搜索 "Claude Relay Meter"
3. 配置以下选项：

### 必需配置

- **API URL** (`relayMeter.apiUrl`)
  - 描述：中继服务 API 基础地址
  - 示例：`https://text.com/apiStats`

- **API ID** (`relayMeter.apiId`)
  - 描述：您的 API 标识符
  - 示例：`34arr92a-cb42-58op-56op-ggy15rt9878c`

### 可选配置

- **刷新间隔** (`relayMeter.refreshInterval`)
  - 描述：数据更新频率（秒）
  - 默认值：60
  - 最小值：10

- **启用状态栏颜色** (`relayMeter.enableStatusBarColors`)
  - 描述：根据使用百分比改变状态栏颜色
  - 默认值：`true`

- **颜色阈值** (`relayMeter.colorThresholds`)
  - 描述：配置颜色变化的百分比阈值
  - 默认值：
    ```json
    {
      "low": 50,
      "medium": 80
    }
    ```

- **自定义颜色** (`relayMeter.customColors`)
  - 描述：自定义各阈值的颜色
  - 默认值：
    ```json
    {
      "low": "#66BB6A",
      "medium": "#FFD700",
      "high": "#FF6600"
    }
    ```

- **启用日志** (`relayMeter.enableLogging`)
  - 描述：启用详细日志记录以便调试
  - 默认值：`true`

## 使用方法

### 状态栏显示

配置完成后，插件会自动在状态栏右侧显示费用使用情况：

```
$(graph) $3.96/$100.00 3.96%
```

显示格式：`$当前使用/$限额 使用百分比%`

### 查看详细信息

将鼠标悬停在状态栏项上，可以查看详细的费用信息：

- 📊 **每日费用限制**：显示每日费用使用情况及百分比
- 💰 **总费用限制**：显示总费用使用情况及百分比
- 🚀 **Opus 模型周费用限制**：显示 Opus 模型的周费用使用情况及百分比

### 手动刷新

- 方法 1：点击状态栏项
- 方法 2：使用命令面板 (`Ctrl+Shift+P`)，输入"刷新统计数据"

### 打开设置

使用命令面板 (`Ctrl+Shift+P`)，输入"打开设置"可快速打开插件设置页面。

## 数据格式说明

### 数字格式
- 费用金额：最多保留 4 位小数，自动去除末尾的零
- 示例：`$3.96`、`$10.5`、`$100.0`

### 百分比格式
- 百分比：最多保留 2 位小数，自动去除末尾的零
- 示例：`3.96%`、`50.5%`、`100%`

## 常见问题

### 1. 状态栏不显示数据？
- 检查是否已正确配置 `apiUrl` 和 `apiId`
- 检查网络连接是否正常
- 查看 VSCode 输出面板（选择"Claude Relay Meter"）的日志

### 2. 显示错误消息？
- 确认 API URL 和 API ID 配置正确
- 确认 API 服务正常运行
- 检查输出面板的详细错误信息

### 3. 如何修改刷新频率？
- 打开设置，搜索 `relayMeter.refreshInterval`
- 修改为您想要的秒数（最小 10 秒）

### 4. 如何自定义颜色？
- 打开设置，搜索 `relayMeter.customColors`
- 修改为您喜欢的十六进制颜色代码

## 技术支持

如果您在使用过程中遇到问题或有任何建议，欢迎：

- 提交 Issue
- 发送邮件
- 参与讨论

## 许可证

MIT License

## 更新日志

### v1.0.0 (2025-10-11)
- 🎉 首次发布
- ✅ 实现基本的用量监控功能
- ✅ 支持状态栏显示
- ✅ 支持详细信息悬停提示
- ✅ 支持自定义配置
- ✅ 支持智能颜色提示
