"use strict";

var path = require("path");
var fs = require("fs");
var KEY = "XcUpdateNoticeUmiPlugin";
module.exports = function (api) {
  api.describe({
    key: KEY,
    config: {
      schema: function schema(joi) {
        return joi.object({
          filename: joi.string()["default"]("_version.json"),
          interval: joi.number()["default"](5000),
          keepVersions: joi.number()["default"](5),
          publishDescription: joi.string()["default"](""),
          isLogout: joi["boolean"]()["default"](false),
          laterInterval: joi.number()["default"](10 * 60 * 1000),
          // 文件指向定义
          versionDir: joi.string()["default"]("/")
        });
      }
    }
  });

  // 构建结束后生成 _version.json
  api.onBuildComplete(function (_ref) {
    var err = _ref.err;
    if (err) return;
    var userConfig = api.userConfig[KEY] || {};
    var options = Object.assign({
      filename: "_version.json",
      keepVersions: 5,
      publishDescription: "",
      isLogout: false
    }, userConfig);
    var outputPath = path.join(api.paths.cwd, "dist");
    var file = path.join(outputPath, options.filename);
    var historyFile = path.join(outputPath, "_version-history.json");
    var hash = Date.now();
    var current = {
      hash: hash,
      buildTime: new Date().toLocaleString(),
      publishDescription: options.publishDescription,
      isLogout: options.isLogout
    };
    fs.writeFileSync(file, JSON.stringify(current, null, 2));
    var history = [];
    if (fs.existsSync(historyFile)) {
      try {
        history = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
      } catch (_unused) {
        console.warn("[XcUpdateNoticeUmi] 历史版本解析失败");
      }
    }
    history.unshift(current);
    history = history.slice(0, options.keepVersions);
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    console.log("[XcUpdateNoticeUmi] \u2705 \u751F\u6210\u6210\u529F -> ".concat(file));
  });
  api.addEntryCodeAhead(function () {
    var userConfig = api.userConfig[KEY] || {};
    var options = Object.assign({
      filename: "_version.json",
      interval: 5000,
      laterInterval: 10 * 60 * 1000,
      versionDir: "/"
    }, userConfig);
    return generateCheckScript(options);
  });
};
function generateCheckScript(options) {
  return "\n    (function(){\n      if(window.__XC_UPDATE_INITED__) return;\n      window.__XC_UPDATE_INITED__ = true;\n      const versionUrl = '".concat(options.versionDir).concat(options.filename, "';\n      const interval = ").concat(options.interval, ";\n      const laterInterval = ").concat(options.laterInterval, ";\n      let timer = null;\n      let laterTimer = null;\n      let clientCurrentVersion = null;\n\n      const _xcUpdate = {\n        _callbacks: [],\n        onUpdate(fn, ver) {\n          clientCurrentVersion = ver\n          console.log('[xc-web-update-notice] \u76D1\u542C\u5230\u7248\u672C\u66F4\u65B0', ver);\n          this._callbacks.push(fn);\n          \n        },\n        updateLater() {\n          if (laterTimer) {\n            clearTimeout(laterTimer);\n            laterTimer = null;\n          }\n          laterTimer = setTimeout(() => {\n            laterTimer = null;\n            checkUpdate();\n          }, laterInterval);\n        }\n      };\n\n      async function checkUpdate() {\n        try {\n          const res = await fetch(versionUrl + '?_=' + Date.now());\n          const data = await res.json();\n          if (clientCurrentVersion != data.hash) {\n            clearInterval(timer);\n            window._xcUpdate._callbacks.forEach(fn => fn({ oldHash: clientCurrentVersion, newHash: data.hash, isLogout: data.isLogout  }));\n          }\n        } catch(e) {\n          console.warn('[xc-web-update-notice] \u68C0\u67E5\u7248\u672C\u5931\u8D25', e);\n        }\n      }\n      timer = setInterval(checkUpdate, interval);\n      window._xcUpdate = _xcUpdate;\n    })();\n");
}