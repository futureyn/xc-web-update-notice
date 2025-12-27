const path = require("path");
const fs = require("fs");
const { createHash } = require("crypto");
const KEY = "XcUpdateNoticeUmiPlugin";

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

module.exports = function (api) {
  let history = [];
  api.describe({
    key: KEY,
    config: {
      schema(joi) {
        history = getHistoryVersion();

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

  // 获取历史版本
  const getHistoryVersion = () => {
    const outputPath = path.join(api.paths.cwd, "dist");
    const historyFile = path.join(outputPath, "_version-history.json");
    let history = [];
    if (fs.existsSync(historyFile)) {
      try {
        // 读取之前的上线版本信息
        history = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
      } catch {
        console.warn("[XcUpdateNoticeUmi] 历史版本解析失败");
      }
    }
    return history;
  };

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
        versionMode: "hash",
      },
      userConfig
    );

    // 非生产环境不检测
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

    return generateCheckScript(options, history);
  });
};

function generateCheckScript(options) {
  return `
    (function(){
      if(window.__XC_UPDATE_INITED__) return;
      window.__XC_UPDATE_INITED__ = true;
      const versionUrl = '${options.versionDir}${options.filename}';
      // 用户点击稍后更新后存储的版本信息，落后的版本
      let laterInfo = []
      // 是否处于弹窗中
      let isDialog = false;
      // 最新版本
      let latestVersion = null;
      // 落后版本是否需要退出登录
      let lastIsLogout = false;
      const interval = ${options.interval};
      const laterInterval = ${options.laterInterval};
      let timer = null;
      let laterTimer = null;
      // 客户端版本
      let clientCurrentVersion = null;
      const callbacks = [];
      const _xcUpdate = {
        onUpdate(fn, ver) {
          clientCurrentVersion = ver
          console.log('[xc-web-update-notice] 当前版本为', ver);
          callbacks.push(fn);
        },
        updateLater() {
          if (laterTimer) {
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
          }, laterInterval);
        }
      };

      async function checkUpdate() {
        try {
          const res = await fetch(versionUrl + '?_=' + Date.now());
          const data = await res.json();
          latestVersion = data.hash;
          lastIsLogout = data.isLogout;

          // 正常发布更新
          if (clientCurrentVersion != data.hash && !laterInfo.length) {
            if (isDialog) {
              return;
            }
            isDialog = true;
            callbacks.forEach(fn => fn({ oldHash: clientCurrentVersion, newHash: data.hash, isLogout: data.isLogout  }));
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
        } catch(e) {
          console.warn('[xc-web-update-notice] 检查版本失败', e);
        }
      }
      timer = setInterval(checkUpdate, interval);
      window._xcUpdate = _xcUpdate;
    })();
`;
}
