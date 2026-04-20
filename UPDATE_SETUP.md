# App 自动更新配置指南

## 概述

本项目已配置完整的自动更新系统，包括：

- electron-updater 客户端更新逻辑
- 本地更新服务器
- 自动化部署脚本

## 配置文件

### 1. package.json 更新配置

```json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "http://localhost:8080/updates"
    }
  }
}
```

### 2. 更新服务器 (updater-server/)

- `server.cjs`: Express 服务器，提供更新检查和文件下载
- `public/`: 存放应用安装包和 latest.yml（由 electron-builder 自动生成）

## 使用流程

### 开发环境测试

1. **构建应用**

   ```bash
   npm run package
   ```

2. **部署更新**

   ```bash
   npm run deploy-update
   ```

   这会将 electron-builder 生成的文件（包括 latest.yml 和安装包）复制到更新服务器

3. **启动更新服务器**

   ```bash
   npm run start-update-server
   ```

   服务器运行在 http://localhost:8080

4. **测试更新流程**
   - 修改 `package.json` 中的版本号
   - 重新构建和部署
   - 在应用中触发更新检查

### 生产环境部署

1. **修改更新服务器地址**
   在 `package.json` 中更新 `publish.url`:

   ```json
   {
     "build": {
       "publish": {
         "provider": "generic",
         "url": "https://your-update-server.com/updates"
       }
     }
   }
   ```

2. **部署更新服务器**
   将 `updater-server/` 目录部署到你的服务器

3. **配置 HTTPS**
   生产环境建议使用 HTTPS

## 更新流程说明

### 客户端流程

1. 应用启动时或用户手动检查更新
2. 调用 `checkForUpdates()` IPC 方法
3. electron-updater 向服务器请求版本信息
4. 如有新版本，自动下载更新包
5. 下载完成后提示用户安装

### 服务器流程

1. 接收客户端版本检查请求
2. 比较客户端版本与服务器版本
3. 如有更新，返回 `latest.yml` 文件
4. 提供安装包下载服务

## 版本管理

### 版本号格式

使用语义化版本号：`major.minor.patch`

- major: 重大更新
- minor: 功能更新
- patch: 修复更新

### 发布新版本

1. 更新 `package.json` 中的版本号
2. 运行 `npm run package-and-deploy`
3. 重启更新服务器（如果需要）

## 代码签名配置（生产环境必需）

### macOS 代码签名

macOS 应用更新需要有效的代码签名，否则会被系统拒绝安装。

#### 1. 获取证书

- 注册 Apple Developer Program ($99/年)
- 在 Xcode 或开发者网站创建 "Developer ID Application" 证书
- 下载并安装证书到钥匙串

#### 2. 配置 package.json

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Company Name (TEAM_ID)",
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

#### 3. 创建 entitlements 文件

创建 `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

#### 4. 公证（Notarization）

macOS 10.15+ 需要公证：

```bash
# 设置环境变量
export APPLE_ID="your-apple-id@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="YOUR_TEAM_ID"

# 打包会自动公证
npm run package
```

### Windows 代码签名

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "password",
      "signingHashAlgorithms": ["sha256"],
      "sign": "./customSign.js"
    }
  }
}
```

### 开发环境说明

开发环境中应用未签名，更新功能会受限：

- 使用 `dev-app-update.yml` 配置
- 允许版本降级（测试用）
- macOS 可能仍然拒绝安装更新
- 建议手动测试安装包

## 安全考虑

1. **文件完整性**: 使用 SHA512 哈希验证
2. **HTTPS**: 生产环境使用加密传输
3. **代码签名**: 生产环境必须签名和公证
4. **访问控制**: 限制更新服务器访问权限

## 故障排除

### 常见问题

1. **更新检查失败**
   - 检查更新服务器是否运行
   - 验证网络连接
   - 查看控制台日志

2. **下载失败**
   - 检查文件是否存在
   - 验证 SHA512 哈希
   - 检查磁盘空间

3. **安装失败 - macOS 代码签名错误**

   错误信息：`Code signature did not pass validation`

   **原因**：macOS 要求应用更新必须有有效的代码签名

   **开发环境解决方案**：
   - 项目已配置 `dev-app-update.yml` 用于开发环境
   - 使用 `app.isPackaged` 检测开发模式
   - 开发模式下允许降级和跳过部分验证

   **生产环境解决方案**：

   ```bash
   # 1. 获取 Apple Developer 证书
   # 2. 在 package.json 中配置签名
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

   # 3. 打包时自动签名
   npm run package
   ```

   **临时测试方案**（不推荐生产使用）：
   - 手动下载新版本安装包
   - 删除旧版本应用
   - 安装新版本

4. **其他安装失败**
   - 检查文件权限
   - 确认应用未在运行
   - 查看系统日志

### 调试命令

```bash
# 检查更新服务器状态
curl http://localhost:8080/health

# 手动检查版本
curl http://localhost:8080/updates/darwin/x64/0.1.0

# 查看服务器日志
cd updater-server && npm start
```

## 自定义配置

### 修改更新检查频率

在 `UpdateService.ts` 中配置自动检查间隔

### 自定义通知消息

修改 `UpdateService.ts` 中的通知文本

### 添加更新渠道

支持 beta、stable 等不同更新渠道

## 快速修复：代码签名错误

如果遇到 `Code signature did not pass validation` 错误：

### 临时解决（测试用）

当前配置已设置为 ad-hoc 签名：

```bash
# 重新打包
npm run package

# 部署
npm run deploy-update
```

### 生产解决（推荐）

1. 获取 Apple Developer 证书
2. 查看证书名称：
   ```bash
   security find-identity -v -p codesigning
   ```
3. 更新 `package.json` 中的 `mac.identity`
4. 重新打包

详细说明请查看 `CODESIGN_SETUP.md`

## 相关文件

- `src/main/services/update-service/UpdateService.ts`: 更新服务实现
- `src/main/ipc/handlers/updaterHandler.ts`: IPC 处理器
- `updater-server/server.cjs`: 更新服务器
- `scripts/deploy-update.js`: 部署脚本
- `build/entitlements.mac.plist`: macOS 权限配置
- `CODESIGN_SETUP.md`: 代码签名详细指南
