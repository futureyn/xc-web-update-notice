import fs from "fs"
import path from "path"
import { createHash } from "crypto";
const _VERSION = '_version.json';
const _UPDATE_CHECKER = '_update-checker.js';
const _VERSION_HISTORY = '_version-history.json'
function createEnvironmentHash(mode, version) {
  if (mode === "hash") {
    const hash = createHash("md5");
    hash.update(Date.now().toString());
    const result = hash.digest("hex");
    return result;
  } else if (mode === "custom") {
    return version;
  } else {
    return "1.0.0";
  }
}
export default (_ = {}) => {
    const options = Object.assign({
        isLogout: false,
        versionDir: "",
        checkerDir: "",
        interval: 5000,
        publishDescription: "",
        laterInterval: 10 * 60 * 1000,
        // 版本文件名
        filename: _VERSION,
        // 文件检测名称
        checkerName: _UPDATE_CHECKER,
        historyFile: _VERSION_HISTORY,
        keepVersions: 10,
        // 版本生成方式
        versionMode: "hash",
        // 版本号（versionMode为custom时生效）
        version:"1.0.0",
        isProd: true
    }, _)
    return {
        name: 'rollup-plugin-xc-update-notice',
        apply: 'build',
        closeBundle() {
            if(!options.isProd) return;
            const outDir = options.outDir || "dist";
            const versionFile = path.resolve(outDir, options.filename);
            const updateChecker = path.resolve(outDir, options.checkerName);

            const hash = createEnvironmentHash(options.versionMode, options.version);

            const version = {
                hash,
                buildTime: new Date().toLocaleString(),
                publishDescription: options.publishDescription,
                isLogout: options.isLogout,
            }

            // 当前版本写入
            fs.writeFileSync(versionFile, JSON.stringify(version, null, 2));

            // 写入_update-checker.js
            fs.writeFileSync(updateChecker, generateCheckerScript(options));
        },

        // html转换插入
        transformIndexHtml(html) {
            if(!options.isProd) return;
            const checkerScript = `<script src="${options.checkerDir}${options.checkerName}"></script>`
            const replaceHtml = html.replace('</body>', checkerScript + '\n' + '</body>')
            return replaceHtml
        }
    }
}

// 生成检测脚本
const generateCheckerScript = (options) => {
    return `(function () {
        // 检测定时器
        let timer = null;
        // 稍后更新定时器
        let laterTimer = null;
        // 间隔检测时间
        const interval = ${options.interval}
        // 获取版本文件
        const versionUrl = "${options.versionDir}${options.filename}"
        // 客户端版本
        let clientCurrentVersion = null;
        // 回调函数合集
        const callbacks = [];
        // 用户点击稍后更新后存储的版本信息，落后的版本
        let laterInfo = []
        // 是否处于弹窗中
        let isDialog = false;
        // 最新版本
        let latestVersion = null;
        // 落后版本是否需要退出登录
        let lastIsLogout = false;
        // 注入全局对象
        const xcUpdate = {
            onUpdate(fn, ver) {
                clientCurrentVersion = ver;
                console.log('[xc-web-update-notice] 当前版本为', ver);
                callbacks.push(fn)
            },
            // 稍后更新
            updateLater() {
                if(laterTimer) {
                    clearTimeout(laterTimer);
                    laterTimer = null;
                }
                laterInfo.push({
                    version: latestVersion,
                    isLater: true,
                    isLogout: lastIsLogout
                })
                if(isDialog) {
                    isDialog = false
                }
                laterTimer = setTimeout(() => {
                    laterTimer = null;
                }, ${options.laterInterval || 10 * 60 * 1000});
            }
        }
        async function checkUpdate() {
            try {
                const res = await fetch(versionUrl + "?_=" + Date.now());
                const data = await res.json();
                latestVersion = data.hash;
                lastIsLogout = data.isLogout;

                // 正常发布更新
                if (clientCurrentVersion != data.hash && !laterInfo.length) {
                    if (isDialog) {
                        return;
                    }
                    isDialog = true;
                    callbacks.forEach(fn => fn({ oldHash: clientCurrentVersion, newHash: data.hash, isLogout: data.isLogout, publishDescription: data.publishDescription  }));
                }

                // 稍后更新中的时候，再次发布新版本时更新
                if(laterInfo.length && laterInfo[laterInfo.length-1].version !== data.hash) {
                    if (isDialog) {
                        return;
                    }
                    isDialog = true;
                    // 落后版本是否有需要退出登录的
                    const isLogout = laterInfo.find(item => item.isLogout)?.isLogout;
                    callbacks.forEach(fn => fn({ oldHash: clientCurrentVersion, newHash: data.hash, isLogout: data.isLogout || isLogout  }));
                }
            } catch (e) {
                console.warn("检查版本更新失败", e);
            }
      }
      window._xcUpdate = xcUpdate;
      timer = setInterval(checkUpdate, interval);
      console.log("[xc-web-update-notice-vite] 启动版本检测");
    })()`
}
