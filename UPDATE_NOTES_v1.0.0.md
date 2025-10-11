# Claude Relay Meter v1.0.0 - 更新说明

## 更新时间
2025-10-11

## 本次更新内容

### 🔧 API 请求路径优化

#### 修改前
- 用户配置：`relayMeter.apiUrl = "https://text.com/apiStats"`
- 实际请求：`https://text.com/apiStats/api/user-stats`

#### 修改后
- 用户配置：`relayMeter.apiUrl = "https://text.com"`
- 实际请求：`https://text.com/apiStats/api/user-stats`

**优势**：用户只需填写基础域名，无需包含 `/apiStats` 路径，配置更简洁。

### ✨ 配置提示优化

#### 状态栏显示改进
修改前：
- 未配置时统一显示：`$(gear) 需要配置`

修改后：
- 未配置 API URL：`$(gear) 未配置 API URL`
- 未配置 API ID：`$(gear) 未配置 API ID`
- 都未配置：`$(gear) 需要配置`

**优势**：更清晰地告知用户缺少哪个配置项。

#### 首次启动弹窗优化
修改前：
- 弹窗按钮：`打开设置`

修改后：
- 弹窗按钮：`立即配置` | `稍后`

**优势**：更友好的引导，用户可以选择稍后配置。

## 需要用户更新的配置

### ⚠️ 重要：配置格式变更

如果您之前使用了完整的 API 路径，需要修改配置：

#### 旧配置示例
```json
{
  "relayMeter.apiUrl": "https://example.com/apiStats"
}
```

#### 新配置示例
```json
{
  "relayMeter.apiUrl": "https://example.com"
}
```

**注意**：请移除 URL 末尾的 `/apiStats`，只保留基础域名。

## 详细修改清单

### 代码修改

#### 1. src/services/api.ts
- ✅ 修改 URL 构建逻辑：`${apiUrl}/apiStats/api/user-stats`
- ✅ 优化配置验证函数，返回缺失配置类型
- ✅ 更新注释和日志中的示例

#### 2. src/handlers/statusBar.ts
- ✅ `showConfigPrompt` 函数增加 `missingConfig` 参数
- ✅ 根据缺失配置类型显示不同的提示文本

#### 3. src/extension.ts
- ✅ 更新激活时的配置验证逻辑
- ✅ 优化弹窗提示，增加"立即配置"和"稍后"选项
- ✅ 传递 `missingConfig` 参数到状态栏

### 文档更新

- ✅ README.md - 更新 API URL 示例
- ✅ QUICKSTART.md - 更新配置示例
- ✅ package.json - 更新配置说明
- ✅ .vscode/settings.json.example - 更新示例配置
- ✅ RELEASE_SUMMARY.md - 更新相关说明
- ✅ builds/README.md - 更新安装说明

所有示例 URL 从 `https://text.com/apiStats` 更新为 `https://text.com`

## 升级步骤

### 1. 安装新版本
```bash
# 方法 1：VSCode 命令面板
# Ctrl+Shift+P -> Install from VSIX -> 选择 builds/claude-relay-meter-1.0.0.vsix

# 方法 2：命令行
code --install-extension builds/claude-relay-meter-1.0.0.vsix
```

### 2. 更新配置
打开 VSCode 设置 (Ctrl+,)，搜索 "Claude Relay Meter"，修改：

**旧配置**：
```
API URL: https://your-domain.com/apiStats
```

**新配置**：
```
API URL: https://your-domain.com
```

### 3. 验证功能
- 检查状态栏是否正常显示
- 悬停查看详细信息是否正确
- 如果显示错误，检查 API URL 配置

## 兼容性说明

### 向后兼容性
⚠️ **不完全向后兼容**

如果您之前配置的 URL 包含了 `/apiStats`，需要手动更新配置。

**原因**：新版本会在 URL 后自动添加 `/apiStats/api/user-stats`，如果用户配置已包含 `/apiStats`，会导致请求路径错误。

### 迁移建议

**情况 1：之前配置了 `https://example.com/apiStats`**
- 需要修改为：`https://example.com`

**情况 2：之前配置了 `https://example.com`**
- 无需修改，可直接使用

## 测试验证

### 测试环境
- VSCode 版本：1.96.0+
- 操作系统：Windows/macOS/Linux
- Node.js：不需要（用户端）

### 测试项目
- [x] API 请求路径正确
- [x] 配置缺失时状态栏显示正确
- [x] 首次启动弹窗提示正常
- [x] 文档示例更新完整
- [x] 编译无错误
- [x] 打包成功

## 已知问题

### 无

## 下一步计划

### 可能的未来优化
- [ ] 自动检测旧配置格式并提示用户更新
- [ ] 添加配置迁移工具
- [ ] 支持更多配置验证规则

## 联系与支持

如有问题或建议：
1. 查看 [README.md](README.md) 获取完整文档
2. 查看 [QUICKSTART.md](QUICKSTART.md) 获取快速开始指南
3. 检查输出面板 (选择 "Claude Relay Meter") 查看日志

---

**版本**：v1.0.0
**更新日期**：2025-10-11
**状态**：✅ 已发布
**打包文件**：`builds/claude-relay-meter-1.0.0.vsix`
