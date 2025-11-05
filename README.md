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

### ✅ Vite 项目
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import XcUpdateNoticeVitePlugin from 'xc-web-update-notice/vite';
export default defineConfig({
  plugins: [XcUpdateNoticeVitePlugin({
    interval: 10000,
    // 两小时后再次弹窗（毫秒）
    laterInterval: 200 * 60 * 1000,
    versionDir: "/dist/",
    isLogout: true,
    publishDescription:"修改用户权限",
    checkerDir: "/dist/" // <script src="/dist/update-checker.js"></script>
  })]
})
```

### 🧠 运行逻辑说明

插件在打包时会自动注入一段脚本：
    在浏览器中创建 window._xcUpdate
    启动一个定时器，定期 fetch 版本文件（默认 _version.json）
    检测到新版本时触发所有注册的回调
    可通过 window._xcUpdate.updateLater() 延迟下一次检测


### api

| 名称 | 类型 | 默认值 | 说明 | 选项 |
|------|------|--------|------|
| `filename` | `string` | `_version.json` | 版本文件名 | |
| `interval` | `number` | `5000` | 检测间隔（毫秒） | |
| `laterInterval` | `number` | `1000 * 60 * 10` | 用户点击“稍后更新”后的延迟时间（毫秒） |  |
| `isLogout` | `boolean` | `false` | 本次构建是否需要退出登录 | |
| `versionDir` | `string` | `./` | 版本文件指向（./_version.json） | |
| `checkerDir` | `string` |  | 版本文件指向（update-checker.js） | |
| `publishDescription` | `string` |  | 本次的发布描述 | |
| `keepVersions` | `string` |  | 保留历史版本数量 | |
| `isProd（v1.1.0支持）` | `boolean` | `true` | 是否是生产环境，非生产环境不检测 | |
| `versionMode(v1.2.1支持)` | `string` | `hash` | 版本号生成模式 | `hash`,`custom` |
| `version(v1.2.1支持)` | `string` | `1.0.0` | 版本号（versionMode为custom时生效） |  |


### _xcUpdate
运行时会在全局注入一个对象

| 名称 | 类型 | 说明 |
|------|------|------|
| `onUpdate` | `function` | 开始检测版本onUpdate((info) => { console.log('🚀发现新版本', info) }, '您当前版本') |
| `updateLater` | `function` | 延迟下次检测更新 |   


### Vue示例
```javascript
vue.config.js
module.exports = {
    configureWebpack: (config) => {
        config.plugins.push(
            new XcUpdateNoticePlugin({
                // 本次构建不需要退出登录
                isLogout: true,
                // 本次构建的版本描述
                publishDescription: "这是一次重大更新",
                // 需要生成的历史版本数量（注意这是在构建完成后写入的，因此不要开启每次构建删除之前的dist）
                keepVersions: 20,
                interval: 10000,
                // 点击稍后更新后 20 分钟后自动再次唤起更新弹窗
                laterInterval: 20 * 60 * 1000,
                // versionDir: "/dist/",
                // checkerDir: "/dist/",
                isProd: process.env.NODE_ENV === "production",
            })
        );
    }
}

/utils/versionUpdate.js
import { message, Modal } from "ant-design-vue";
export default () => {
  // 监听系统是否有更新
  document.addEventListener("DOMContentLoaded", () => {
    window._xcUpdate.onUpdate((info) => {
      console.log("🚀监测到新版本", info);
      const { isLogout, newHash } = info;
      const modalIns = Modal.confirm({
        title: `检测到版本有更新，${
          isLogout ? "点击更新后重新进行登录" : "点击更新后刷新页面"
        }`,
        okText: "点击更新",
        cancelText: "稍后更新",
        onOk() {
          if (isLogout) {
            // TODO ...
          } else {
           // TODO ...
          }
        },
        onCancel() {
          modalIns.destroy();
          // 稍后更新，10分钟后再次提示
          window._xcUpdate.updateLater();
        },
      });
    }, localStorage.getItem("version"));
  });
};
```

### 效果
![更新效果](./public/1.png)
![检测效果](./public/2.png)
