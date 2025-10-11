# Claude Relay Meter - 打包文件

## 📦 安装包信息

**文件名**: `claude-relay-meter-1.0.0.vsix`
**版本**: v1.0.0
**大小**: ~732 KB
**打包时间**: 2025-10-11

## 🚀 安装方法

### 方法 1：通过命令面板安装（推荐）

1. 打开 VSCode
2. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
3. 输入 "Install from VSIX"
4. 选择 `claude-relay-meter-1.0.0.vsix` 文件
5. 等待安装完成
6. 重启 VSCode

### 方法 2：通过命令行安装

```bash
code --install-extension claude-relay-meter-1.0.0.vsix
```

### 方法 3：拖放安装

1. 打开 VSCode
2. 将 `.vsix` 文件拖放到 VSCode 窗口中
3. 确认安装

## ⚙️ 首次配置

安装后需要配置以下内容：

1. 打开 VSCode 设置 (`Ctrl+,` 或 `Cmd+,`)
2. 搜索 "Claude Relay Meter"
3. 配置必需项：
   - **API URL**: 您的中继服务 API 地址
   - **API ID**: 您的 API 标识符（UUID 格式）

### 配置示例

```json
{
  "relayMeter.apiUrl": "https://your-api-domain.com/apiStats",
  "relayMeter.apiId": "your-uuid-format-api-id"
}
```

## ✅ 验证安装

安装成功后：

1. **状态栏右侧** 应该显示费用使用情况
2. **鼠标悬停** 可以看到详细信息
3. 如果显示 "需要配置"，请按照上述步骤配置

## 📖 功能说明

- ⚡ **实时监控**: 自动获取 API 用量数据
- 📊 **状态栏显示**: 显示费用使用情况和百分比
- 🎨 **智能颜色**: 根据使用率自动变色
  - 绿色: < 50%
  - 黄色: 50% - 80%
  - 红色: > 80%
- 🔍 **详细信息**: 悬停查看完整费用详情
- 🔄 **自动刷新**: 默认每 60 秒更新一次

## 🔧 可选配置

- **刷新间隔**: `relayMeter.refreshInterval` (默认 60 秒)
- **启用颜色**: `relayMeter.enableStatusBarColors` (默认 true)
- **颜色阈值**: `relayMeter.colorThresholds`
- **自定义颜色**: `relayMeter.customColors`
- **启用日志**: `relayMeter.enableLogging` (默认 true)

## 📝 命令

- **刷新统计数据**: `Claude Relay Meter: 刷新统计数据`
- **打开设置**: `Claude Relay Meter: 打开设置`

使用方法：按 `Ctrl+Shift+P`，输入命令名称

## 🆘 故障排除

### 状态栏不显示数据

1. 检查 API URL 和 API ID 配置是否正确
2. 检查网络连接
3. 查看输出面板 (选择 "Claude Relay Meter") 查看错误日志

### 显示 "获取数据失败"

1. 验证 API 地址格式正确 (https://...)
2. 验证 API ID 格式正确 (UUID 格式)
3. 确认 API 服务可访问
4. 尝试手动刷新

### 颜色不显示

1. 确认 `relayMeter.enableStatusBarColors` 设置为 `true`
2. 检查自定义颜色配置格式 (十六进制颜色代码)

## 📚 更多文档

- [README.md](../README.md) - 完整项目说明
- [QUICKSTART.md](../QUICKSTART.md) - 快速开始指南
- [CHANGELOG.md](../CHANGELOG.md) - 版本更新日志

## 📄 许可证

MIT License

## 💡 支持

如有问题或建议，请查看项目文档或提交 Issue。

---

**版本**: v1.0.0
**发布日期**: 2025-10-11
**打包状态**: ✅ 已优化
