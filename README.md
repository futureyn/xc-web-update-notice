### 📦 xc-web-update-notice
一个轻量的 前端版本检测通知插件，用于在项目运行时实时检测线上版本更新，提示用户刷新或重新登录。
支持 Webpack、Vue CLI、UmiJS 等主流框架。

### 🚀 功能特点
自动定时检测 _version.json（或自定义路径）文件变化
检测到新版本时自动触发回调（可弹窗提醒用户）
提供「稍后更新」机制，允许延迟再次检测
支持跨框架使用（Webpack、UmiJS、Vue CLI）


### 📥 安装

```bash
npm install xc-web-update-notice
```

### ⚙️ 使用方式

###  ✅ Webpack / Vue CLI 项目
在你的 vue.config.js 或 webpack.config.js 中添加：

```javascript
const XCWebUpdateNotice = require('xc-web-update-notice/webpack');
module.exports = {
  configureWebpack: {
    plugins: [
      XCWebUpdateNotice()
    ]
  }
};
```

### ✅ UmiJS 项目
在 config/config.ts 中添加：

```typescript
import XCWebUpdateNotice from 'xc-web-update-notice/umijs';

export default defineConfig({
  plugins: ['xc-web-update-notice/dist/esm/umijs']
  XcUpdateNoticeUmiPlugin: {} as any
});
```

### 🧠 运行逻辑说明

插件在打包时会自动注入一段脚本：
    在浏览器中创建 window._xcUpdate
    启动一个定时器，定期 fetch 版本文件（默认 _version.json）
    检测到新版本时触发所有注册的回调
    可通过 window._xcUpdate.updateLater() 延迟下一次检测


### api

| 名称 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `filename` | `string` | `_version.json` | 版本文件名 |
| `interval` | `number` | `5000` | 检测间隔（毫秒） |
| `laterInterval` | `number` | `1000 * 60 * 10` | 用户点击“稍后更新”后的延迟时间 |
| `isLogout` | `boolean` | `false` | 本次构建是否需要退出登录 |
| `versionDir` | `string` | `./` | 版本文件指向（./_version.json） |
| `checkerDir` | `string` | `` | 版本文件指向（update-checker.js） |
| `publishDescription` | `string` | `` | 本次的发布描述 |
| `keepVersions` | `string` | `` | 保留历史版本数量 |


