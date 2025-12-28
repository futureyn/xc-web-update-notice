const { createHash } = require("crypto");
const fs = require("fs");
const path = require("path");
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
class XcUpdateNoticeWebpackPlugin {
  constructor(options) {
    /**
     * keepVersions: 保留的版本数量，默认10个
     * interval: 检查更新的时间间隔，默认5秒
     * filename: 版本文件的名称，默认version.json
     * isLogout: 本次更新是否需要退出登录，默认需要
     * publishDescription: 发布描述，默认空字符串
     */
    this.options = Object.assign(
      {
        filename: "_version.json",
        interval: 5000,
        keepVersions: 10,
        isLogout: false,
        // 历史版本文件
        historyFile: "_version-history.json",
        publishDescription: "",
        // version文件指向
        versionDir: "./",
        // 文件检测文件指向
        checkerDir: "",
        // 是否是生产环境，非生产环境不检测
        isProd: true,
        // 版本生成方式
        versionMode: "hash",
        // 版本号（versionMode为custom时生效）
        version: "1.0.0",
      },
      options
    );
  }

  apply(compiler) {
    if (!this.options.isProd) {
      return;
    }
    compiler.hooks.done.tap("XcUpdateNoticeWebpack", () => {
      const hash = createEnvironmentHash(
        this.options.versionMode,
        this.options.version
      );

      const outputPath = compiler.options.output.path;
      const file = path.join(outputPath, this.options.filename);
      const historyFile = path.join(outputPath, this.options.historyFile);

      // 当前构建信息
      const current = {
        hash,
        buildTime: new Date().toLocaleString(),
        isLogout: this.options.isLogout,
        publishDescription: this.options.publishDescription,
      };
      fs.writeFileSync(file, JSON.stringify(current, null, 2));

      let history = [];
      if (fs.existsSync(historyFile)) {
        try {
          const raw = fs.readFileSync(historyFile, "utf-8");
          history = JSON.parse(raw);
        } catch (e) {
          console.warn("解析 version_history.json 失败，重新生成");
        }
      }

      history.unshift(current);

      history = history.slice(0, this.options.keepVersions);

      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

      console.log(`[XcUpdateNotice] 最新版本 -> ${hash}`);
      console.log(`[XcUpdateNotice] 写入成功 -> ${file}`);
      console.log(`[XcUpdateNotice] 历史版本 -> ${history.length} 条`);

      // 脚本写入
      const script = this.generateCheckScript(hash, history);
      const scriptPath = path.join(outputPath, "_update-checker.js");
      fs.writeFileSync(scriptPath, script);
    });

    // 监测客户端是否构建了html
    compiler.hooks.compilation.tap("XcUpdateNoticeWebpack", (compilation) => {
      const plugin = compiler.options.plugins.find(
        (p) => p.constructor && p.constructor.name === "HtmlWebpackPlugin"
      );

      // webpack 4、5版本要求
      if (plugin.constructor.getHooks) {
        const hook = plugin.constructor.getHooks(compilation).beforeEmit;

        hook.tapAsync("XcUpdateNoticeWebpack", (data, cb) => {
          const injectTag = `<script src="${this.options.checkerDir}_update-checker.js"></script>`;
          data.html = data.html.replace("</body>", `${injectTag}</body>`);
          cb(null, data);
        });
      } else if (compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing) {
        // webpack 3.x
        compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing.tapAsync(
          "XcUpdateNoticeWebpack",
          (data, cb) => {
            const injectTag = `<script src="${this.options.checkerDir}_update-checker.js"></script>`;
            if (!data.html.includes(injectTag)) {
              data.html = data.html.replace("</body>", `${injectTag}</body>`);
            }
            cb(null, data);
          }
        );
      } else {
        console.warn(
          "[XcUpdateNoticeWebpack] 未检测到 HtmlWebpackPlugin hooks，跳过注入"
        );
      }
    });
  }

  // 生成脚本
  generateCheckScript() {
    return `(function() {
      let timer = null;
      let laterTimer = null;
      const interval = ${this.options.interval};
      const versionUrl = "${this.options.versionDir}${this.options.filename}";
      let clientCurrentVersion = null;
      const callbacks = [];
      // 用户点击稍后更新后存储的版本信息，落后的版本
      let laterInfo = []
      // 是否处于弹窗中
      let isDialog = false;
      // 最新版本
      let latestVersion = null;
      // 落后版本是否需要退出登录
      let lastIsLogout = false;
      const _xcUpdate = {
        onUpdate(fn, ver) {
          clientCurrentVersion = ver;
          console.log('[xc-web-update-notice] 当前版本为', ver);
          callbacks.push(fn);
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
            checkUpdate(true);
          }, ${this.options.laterInterval || 10 * 60 * 1000});
        }
      };
      // laterEnd： 稍后更新结束
      async function checkUpdate(isLaterEnd) {
        try {
          const res = await fetch(versionUrl + "?_=" + Date.now());
          const data = await res.json();
          latestVersion = data.hash;
          lastIsLogout = data.isLogout;

          // 正常发布更新
          if ((clientCurrentVersion != data.hash && !laterInfo.length) || isLaterEnd) {
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
            laterInfo = [];
          }
        } catch (e) {
          console.warn("检查版本更新失败", e);
        }
      }
      window._xcUpdate = _xcUpdate;
      timer = setInterval(checkUpdate, interval);
      console.log("[xc-web-update-notice-webpack] 启动版本检测");
    })()`;
  }
}

module.exports = XcUpdateNoticeWebpackPlugin;
