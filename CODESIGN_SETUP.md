# macOS 代码签名配置指南

## 问题说明

错误：`Code signature did not pass validation: code has no resources but signature indicates they must be present`

这个错误表示 macOS 拒绝安装未正确签名的应用更新。

## 解决方案

### 方案 1：使用 Apple Developer 证书（生产环境推荐）

#### 步骤 1：获取证书

1. 注册 [Apple Developer Program](https://developer.apple.com/programs/) ($99/年)
2. 在 [Apple Developer 网站](https://developer.apple.com/account/resources/certificates/list) 创建证书：
   - 选择 "Developer ID Application"
   - 下载证书并双击安装到钥匙串

#### 步骤 2：查看证书名称

```bash
# 列出所有可用的签名证书
security find-identity -v -p codesigning
```

输出示例：

```
1) ABCD1234... "Developer ID Application: Your Name (TEAM_ID)"
```

#### 步骤 3：配置 package.json

将证书名称添加到配置中：

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    }
  }
}
```

#### 步骤 4：打包

```bash
npm run package
```

electron-builder 会自动使用证书签名应用。

#### 步骤 5：验证签名

```bash
# 检查签名
codesign -dv --verbose=4 dist_electron/mac/ElectronTemplate.app

# 验证签名
codesign --verify --deep --strict --verbose=2 dist_electron/mac/ElectronTemplate.app
```

### 方案 2：Ad-hoc 签名（仅本地测试）

如果没有 Apple Developer 账号，可以使用本地 ad-hoc 签名：

#### 当前配置

`package.json` 已配置为使用 ad-hoc 签名：

```json
{
  "build": {
    "mac": {
      "identity": null,
      "type": "distribution"
    }
  }
}
```

#### 限制

- **只能在本机使用**：其他 Mac 无法运行
- **自动更新受限**：macOS 可能仍然拒绝更新
- **不能分发**：无法通过网络分发给其他用户

#### 手动签名（如果自动签名失败）

```bash
# 打包后手动签名
codesign --force --deep --sign - dist_electron/mac/ElectronTemplate.app

# 创建 DMG 后签名
codesign --force --sign - dist_electron/ElectronTemplate-0.2.0.dmg
```

### 方案 3：完全禁用签名（不推荐）

修改 `package.json`：

```json
{
  "build": {
    "mac": {
      "identity": null
    }
  }
}
```

**警告**：

- macOS 会显示安全警告
- 自动更新功能无法正常工作
- 用户需要手动允许运行

## 公证（Notarization）- macOS 10.15+

如果要分发给其他用户，还需要公证：

### 步骤 1：创建 App-Specific Password

1. 访问 [appleid.apple.com](https://appleid.apple.com)
2. 登录后进入"安全"部分
3. 生成"应用专用密码"

### 步骤 2：配置环境变量

```bash
# 添加到 ~/.zshrc 或 ~/.bash_profile
export APPLE_ID="your-apple-id@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
```

### 步骤 3：更新 package.json

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "notarize": {
        "teamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

### 步骤 4：打包（会自动公证）

```bash
npm run package
```

公证过程需要 5-30 分钟。

## 测试更新流程

### 1. 打包旧版本

```bash
# 确保 package.json version 是 0.1.0
npm run package
```

### 2. 安装并运行

```bash
open dist_electron/ElectronTemplate-0.1.0.dmg
# 安装应用
```

### 3. 打包新版本

```bash
# 修改 package.json version 为 0.2.0
npm run package-and-deploy
```

### 4. 启动更新服务器

```bash
npm run start-update-server
```

### 5. 在应用中检查更新

应用应该能够：

- 检测到新版本
- 下载更新
- 成功安装（如果签名正确）

## 常见问题

### Q: 签名后仍然报错？

确保新旧版本使用相同的签名：

```bash
# 检查旧版本签名
codesign -dv /Applications/ElectronTemplate.app

# 检查新版本签名
codesign -dv dist_electron/mac/ElectronTemplate.app
```

### Q: 没有 Apple Developer 账号怎么办？

- 使用 ad-hoc 签名（方案 2）
- 只能本地测试
- 考虑购买 Apple Developer Program

### Q: 能否跳过签名验证？

macOS 系统级限制，无法完全跳过。只能：

- 使用正确的签名
- 或手动安装更新（不使用自动更新）

## 推荐流程

1. **开发阶段**：使用 ad-hoc 签名测试基本功能
2. **测试阶段**：获取 Developer ID 证书，测试完整更新流程
3. **生产阶段**：添加公证，确保所有用户都能正常更新

## 相关资源

- [Apple Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [electron-builder Code Signing](https://www.electron.build/code-signing)
- [Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
