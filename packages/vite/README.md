# xc-web-update-notice-vite

Vite 版本的前端版本检测通知插件。

## 📥 安装

```bash
npm install xc-web-update-notice-vite
```

## ⚙️ 使用方式

### 方式1：使用默认弹窗（推荐快速集成）

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import XcUpdateNoticeVitePlugin from 'xc-web-update-notice-vite';

export default defineConfig({
  plugins: [
    vue(),
    XcUpdateNoticeVitePlugin({
      interval: 10000,
      laterInterval: 200 * 60 * 1000,
      versionDir: "/dist/",
      checkerDir: "/dist/",
      isLogout: true,
      publishDescription: "修改用户权限",
      isProd: process.env.NODE_ENV === "production",
      useDefaultModal: true,  // 启用默认弹窗
      customModalAttrs: {
        placement: 'rt',  // 弹窗位置
        modalTitle: '系统提示',
        modalContent: '发现新版本，是否立即更新'
      }
    }),
  ],
});
```

### 方式2：自定义弹窗

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import XcUpdateNoticeVitePlugin from 'xc-web-update-notice-vite';

export default defineConfig({
  plugins: [
    vue(),
    XcUpdateNoticeVitePlugin({
      interval: 10000,
      laterInterval: 200 * 60 * 1000,
      versionDir: "/dist/",
      checkerDir: "/dist/",
      isLogout: true,
      publishDescription: "修改用户权限",
      isProd: process.env.NODE_ENV === "production",
      useDefaultModal: false,  // 使用自定义弹窗
    }),
  ],
});
```

然后在你的代码中监听更新：

```javascript
document.addEventListener('DOMContentLoaded', () => {
  window._xcUpdate.onUpdate((info) => {
    console.log('🚀 监测到新版本', info);
    const { isLogout, newHash, publishDescription } = info;
    
    // 显示你自己的弹窗
    // ...
  }, localStorage.getItem("version"));
});
```

## 🧠 运行逻辑说明

插件在打包时会自动注入一段脚本：
- 在浏览器中创建 `window._xcUpdate`
- 启动一个定时器，定期 fetch 版本文件（默认 `_version.json`）
- 检测到新版本时触发所有注册的回调或显示默认弹窗
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
| `useDefaultModal`         | `boolean` | `false`          | 是否使用默认弹窗                       |                 |
| `customModalAttrs`        | `object`  | 见下表           | 自定义弹窗属性                         |                 |
| `customModalCssName`      | `string`  | `_use-default-modal-css.css` | 弹窗样式文件名 |                 |
| `customModalHTMLName`     | `string`  | `_use-default-modal-html.js` | 弹窗 HTML 文件名 |                 |

### customModalAttrs 配置

| 名称            | 类型      | 默认值 | 说明                                   | 选项                |
| --------------- | --------- | ------ | -------------------------------------- | ------------------- |
| `placement`     | `string`  | `rt`   | 弹窗位置                               | `rt`, `rb`, `lt`, `lb` |
| `modalTitle`    | `string`  | `系统提示` | 弹窗标题                           |                     |
| `modalContent`  | `string`  | `发现新版本，是否立即更新` | 弹窗内容 |                     |

**placement 说明：**
- `rt` - 右上角
- `rb` - 右下角
- `lt` - 左上角
- `lb` - 左下角

## 🎯 API

### window._xcUpdate

运行时会在全局注入一个对象

| 名称              | 类型       | 说明                                                                                  |
| ----------------- | ---------- | ------------------------------------------------------------------------------------- |
| `onUpdate`        | `function` | 开始检测版本 `onUpdate((info) => { console.log('🚀 发现新版本', info) }, '您当前版本')` |
| `updateLater`     | `function` | 延迟下次检测更新                                                                      |
| `setModalLocal`   | `function` | 设置弹窗文本（仅在使用默认弹窗时有效）`setModalLocal({title: '新标题', content: '新内容'})` |

## 📝 示例

### 使用默认弹窗

```javascript
// vite.config.ts
import XcUpdateNoticeVitePlugin from 'xc-web-update-notice-vite';

export default defineConfig({
  plugins: [
    XcUpdateNoticeVitePlugin({
      useDefaultModal: true,
      customModalAttrs: {
        placement: 'rb',
        modalTitle: '发现新版本',
        modalContent: '系统已更新，请刷新页面'
      }
    })
  ]
});
```

### 自定义弹窗

```javascript
document.addEventListener('DOMContentLoaded', () => {
  window._xcUpdate.onUpdate((info) => {
    console.log('🚀 监测到新版本', info);
    const { isLogout, newHash, publishDescription } = info;
    
    // 显示你自己的弹窗
    if (isLogout) {
      alert(`发现新版本：${publishDescription}，请重新登录`);
      localStorage.clear();
      window.location.reload();
    } else {
      alert(`发现新版本：${publishDescription}，请刷新页面`);
      window.location.reload();
    }
  }, localStorage.getItem("version"));
});
```

### 动态更新弹窗文本

```javascript
// 在运行时更新弹窗文本
window._xcUpdate.setModalLocal({
  title: '系统维护',
  content: '系统正在维护中，请稍后再试'
});
```

## 📦 相关包

- [xc-web-update-notice-webpack](https://www.npmjs.com/package/xc-web-update-notice-webpack) - Webpack 版本
- [xc-web-update-notice-umijs](https://www.npmjs.com/package/xc-web-update-notice-umijs) - UmiJS 版本

## 📄 License

ISC
