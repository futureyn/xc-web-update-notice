# xc-web-update-notice-vite

Vite 版本的前端版本检测通知插件。

## 📥 安装

```bash
npm install xc-web-update-notice-vite
```

## ⚙️ 使用方式

在 `vite.config.ts` 中添加：

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import XcUpdateNoticeVitePlugin from 'xc-web-update-notice-vite';

export default defineConfig({
  plugins: [
    vue(),
    XcUpdateNoticeVitePlugin({
      interval: 10000,
      // 两小时后再次弹窗（毫秒）
      laterInterval: 200 * 60 * 1000,
      versionDir: "/dist/",
      checkerDir: "/dist/",
      isLogout: true,
      publishDescription: "修改用户权限",
      isProd: process.env.NODE_ENV === "production",
    }),
  ],
});
```

## 🧠 运行逻辑说明

插件在打包时会自动注入一段脚本：
- 在浏览器中创建 `window._xcUpdate`
- 启动一个定时器，定期 fetch 版本文件（默认 `_version.json`）
- 检测到新版本时触发所有注册的回调
- 可通过 `window._xcUpdate.updateLater()` 延迟下一次检测
- 支持"稍后更新"中再次发布新版本时自动更新

## 📋 配置选项

| 名称                      | 类型      | 默认值           | 说明                                   | 选项            |
| ------------------------- | --------- | ---------------- | -------------------------------------- | --------------- |
| `filename`                | `string`  | `_version.json`  | 版本文件名                             |                 |
| `interval`                | `number`  | `5000`           | 检测间隔（毫秒）                       |                 |
| `laterInterval`           | `number`  | `1000 * 60 * 10` | 用户点击"稍后更新"后的延迟时间（毫秒） |                 |
| `isLogout`                | `boolean` | `false`          | 本次构建是否需要退出登录               |                 |
| `versionDir`              | `string`  | `""`             | 版本文件指向（./\_version.json）       |                 |
| `checkerDir`              | `string`  | `""`             | 检测脚本指向（update-checker.js）      |                 |
| `publishDescription`      | `string`  |                  | 本次的发布描述                         |                 |
| `keepVersions`            | `number`  | `10`             | 保留历史版本数量                       |                 |
| `versionMode`             | `string`  | `hash`           | 版本号生成模式                         | `hash`,`custom` |
| `version`                 | `string`  | `1.0.0`          | 版本号（versionMode 为 custom 时生效） |                 |
| `isProd`                  | `boolean` | `true`           | 是否是生产环境，非生产环境不检测       |                 |

## 🎯 API

### window._xcUpdate

运行时会在全局注入一个对象

| 名称          | 类型       | 说明                                                                                  |
| ------------- | ---------- | ------------------------------------------------------------------------------------- |
| `onUpdate`    | `function` | 开始检测版本 `onUpdate((info) => { console.log('🚀 发现新版本', info) }, '您当前版本')` |
| `updateLater` | `function` | 延迟下次检测更新                                                                      |

## 📝 示例

```javascript
// 在你的页面或组件中
document.addEventListener('DOMContentLoaded', () => {
  window._xcUpdate.onUpdate((info) => {
    console.log('🚀 监测到新版本', info);
    const { isLogout, newHash, publishDescription } = info;
    
    // 显示更新提示
    if (isLogout) {
      // 需要退出登录
      alert(`发现新版本：${publishDescription}，请重新登录`);
      // 清除登录信息
      localStorage.clear();
      window.location.reload();
    } else {
      // 只需刷新页面
      alert(`发现新版本：${publishDescription}，请刷新页面`);
      window.location.reload();
    }
  }, localStorage.getItem("version"));
});
```

## 📦 相关包

- [xc-web-update-notice-webpack](https://www.npmjs.com/package/xc-web-update-notice-webpack) - Webpack 版本
- [xc-web-update-notice-umijs](https://www.npmjs.com/package/xc-web-update-notice-umijs) - UmiJS 版本

## 📄 License

ISC
