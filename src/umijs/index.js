const path = require("path");
const fs = require("fs");
const { createEnvironmentHash } = require("../utils/generate");
const KEY = "XcUpdateNoticeUmiPlugin";

module.exports = function (api) {
  api.describe({
    key: KEY,
    config: {
      schema(joi) {
        return joi.object({
          filename: joi.string().default("_version.json"),
          interval: joi.number().default(5000),
          keepVersions: joi.number().default(5),
          publishDescription: joi.string().default(""),
          isLogout: joi.boolean().default(false),
          laterInterval: joi.number().default(10 * 60 * 1000),
          // 文件指向定义
          versionDir: joi.string().default("/"),
          // 非生产环境不进行检查
          isProd: joi.boolean().default(true),
          // 生成版本号模式
          versionMode: joi.string().valid("hash", "custom").default("hash"),
          // 版本号（versionMode为custom时生效）
          version: joi.string().default("1.0.0"),
        });
      },
    },
  });

  // 构建结束后生成 _version.json
  api.onBuildComplete(({ err }) => {
    if (err) return;

    const userConfig = api.userConfig[KEY] || {};
    const options = Object.assign(
      {
        filename: "_version.json",
        keepVersions: 5,
        publishDescription: "",
        isLogout: false,
        isProd: true,
      },
      userConfig
    );

    if (!options.isProd) return;

    const outputPath = path.join(api.paths.cwd, "dist");
    const file = path.join(outputPath, options.filename);
    const historyFile = path.join(outputPath, "_version-history.json");

    const hash = createEnvironmentHash(options.versionMode, options.version);
    const current = {
      hash,
      buildTime: new Date().toLocaleString(),
      publishDescription: options.publishDescription,
      isLogout: options.isLogout,
    };

    fs.writeFileSync(file, JSON.stringify(current, null, 2));

    let history = [];
    if (fs.existsSync(historyFile)) {
      try {
        history = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
      } catch {
        console.warn("[XcUpdateNoticeUmi] 历史版本解析失败");
      }
    }
    history.unshift(current);
    history = history.slice(0, options.keepVersions);
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

    console.log(`[XcUpdateNoticeUmi] ✅ 生成成功 -> ${file}`);
  });

  api.addEntryCodeAhead(() => {
    const userConfig = api.userConfig[KEY] || {};
    const options = Object.assign(
      {
        filename: "_version.json",
        interval: 5000,
        laterInterval: 10 * 60 * 1000,
        versionDir: "/",
        isProd: true,
      },
      userConfig
    );
    if (!options.isProd) return "";

    return generateCheckScript(options);
  });
};

function generateCheckScript(options) {
  return `
    (function(){
      if(window.__XC_UPDATE_INITED__) return;
      window.__XC_UPDATE_INITED__ = true;
      const versionUrl = '${options.versionDir}${options.filename}';
      const interval = ${options.interval};
      const laterInterval = ${options.laterInterval};
      let timer = null;
      let laterTimer = null;
      let clientCurrentVersion = null;
      const callbacks = [];
      const _xcUpdate = {
        onUpdate(fn, ver) {
          clientCurrentVersion = ver
          console.log('[xc-web-update-notice] 监听到版本更新', ver);
          callbacks.push(fn);
        },
        updateLater() {
          if (laterTimer) {
            clearTimeout(laterTimer);
            laterTimer = null;
          }
          laterTimer = setTimeout(() => {
            laterTimer = null;
            checkUpdate();
          }, laterInterval);
        }
      };

      async function checkUpdate() {
        try {
          const res = await fetch(versionUrl + '?_=' + Date.now());
          const data = await res.json();
          if (clientCurrentVersion != data.hash) {
            clearInterval(timer);
            callbacks.forEach(fn => fn({ oldHash: clientCurrentVersion, newHash: data.hash, isLogout: data.isLogout  }));
          }
        } catch(e) {
          console.warn('[xc-web-update-notice] 检查版本失败', e);
        }
      }
      timer = setInterval(checkUpdate, interval);
      window._xcUpdate = _xcUpdate;
    })();
`;
}
