"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var fs = require("fs");
var path = require("path");
var XcUpdateNoticeWebpackPlugin = /*#__PURE__*/function () {
  function XcUpdateNoticeWebpackPlugin(options) {
    _classCallCheck(this, XcUpdateNoticeWebpackPlugin);
    /**
     * keepVersions: 保留的版本数量，默认10个
     * interval: 检查更新的时间间隔，默认5秒
     * filename: 版本文件的名称，默认version.json
     * isLogout: 本次更新是否需要退出登录，默认需要
     * publishDescription: 发布描述，默认空字符串
     */
    this.options = Object.assign({
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
      isProd: true
    }, options);
  }
  return _createClass(XcUpdateNoticeWebpackPlugin, [{
    key: "apply",
    value: function apply(compiler) {
      var _this = this;
      console.log('当前环境===>', this.options);
      if (!this.options.isProd) {
        return;
      }
      compiler.hooks.done.tap("YnUpdateNoticeWeb", function (stats) {
        var hash = stats.hash;
        var outputPath = compiler.options.output.path;
        var file = path.join(outputPath, _this.options.filename);
        var historyFile = path.join(outputPath, _this.options.historyFile);

        // 当前构建信息
        var current = {
          hash: hash,
          buildTime: new Date().toLocaleString(),
          isLogout: _this.options.isLogout,
          publishDescription: _this.options.publishDescription
        };
        fs.writeFileSync(file, JSON.stringify(current, null, 2));
        var history = [];
        if (fs.existsSync(historyFile)) {
          try {
            var raw = fs.readFileSync(historyFile, "utf-8");
            history = JSON.parse(raw);
          } catch (e) {
            console.warn("解析 version_history.json 失败，重新生成");
          }
        }
        history.unshift(current);
        history = history.slice(0, _this.options.keepVersions);
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
        console.log("[XcUpdateNotice] \u6700\u65B0\u7248\u672C -> ".concat(hash));
        console.log("[XcUpdateNotice] \u5199\u5165\u6210\u529F -> ".concat(file));
        console.log("[XcUpdateNotice] \u5386\u53F2\u7248\u672C -> ".concat(history.length, " \u6761"));

        // 脚本写入
        var script = _this.generateCheckScript(hash, history);
        var scriptPath = path.join(outputPath, "_update-checker.js");
        fs.writeFileSync(scriptPath, script);
      });

      // 监测客户端是否构建了html
      compiler.hooks.compilation.tap("XcUpdateNoticeWeb", function (compilation) {
        var plugin = compiler.options.plugins.find(function (p) {
          return p.constructor && p.constructor.name === "HtmlWebpackPlugin";
        });

        // webpack 4、5版本要求
        if (plugin.constructor.getHooks) {
          var hook = plugin.constructor.getHooks(compilation).beforeEmit;
          hook.tapAsync("XcUpdateNoticeWeb", function (data, cb) {
            var injectTag = "<script src=\"".concat(_this.options.checkerDir, "_update-checker.js\"></script>");
            data.html = data.html.replace("</body>", "".concat(injectTag, "</body>"));
            cb(null, data);
          });
        } else if (compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing) {
          // webpack 3.x
          compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing.tapAsync("XcUpdateNoticeWeb", function (data, cb) {
            var injectTag = "<script src=\"".concat(_this.options.checkerDir, "_update-checker.js\"></script>");
            if (!data.html.includes(injectTag)) {
              data.html = data.html.replace("</body>", "".concat(injectTag, "</body>"));
            }
            cb(null, data);
          });
        } else {
          console.warn("[XcUpdateNoticeWeb] 未检测到 HtmlWebpackPlugin hooks，跳过注入");
        }
      });
    }

    // 生成脚本
  }, {
    key: "generateCheckScript",
    value: function generateCheckScript() {
      return "(function() {\n      let timer = null;\n      let laterTimer = null;\n      const interval = ".concat(this.options.interval, ";\n      const versionUrl = \"").concat(this.options.versionDir).concat(this.options.filename, "\";\n      let clientCurrentVersion = null;\n      const _xcUpdate = {\n        _callbacks: [],\n        onUpdate(fn, ver) {\n          clientCurrentVersion = ver;\n          this._callbacks.push(fn);\n        },\n        // \u7A0D\u540E\u66F4\u65B0\n        updateLater() {\n          if(laterTimer) {\n            clearInterval(laterTimer);\n            return;\n          }\n          laterTimer = setTimeout(() => {\n            clearInterval(laterTimer);\n            laterTimer = null;\n            checkUpdate();\n          }, ").concat(this.options.laterInterval || 10 * 60 * 1000, ");\n        }\n      };\n      async function checkUpdate() {\n        try {\n          const res = await fetch(versionUrl + \"?_=\" + Date.now());\n          const data = await res.json();\n          if (clientCurrentVersion != data.hash) {\n            clearInterval(timer);\n            window._xcUpdate._callbacks.forEach(fn => fn({ oldHash: clientCurrentVersion, newHash: data.hash, isLogout: data.isLogout, publishDescription: data.publishDescription  }));\n          }\n        } catch (e) {\n          console.warn(\"\u68C0\u67E5\u7248\u672C\u66F4\u65B0\u5931\u8D25\", e);\n        }\n      }\n      window._xcUpdate = _xcUpdate;\n      timer = setInterval(checkUpdate, interval);\n      console.log(\"[xc-web-update-notice] Webpack \u542F\u52A8\u7248\u672C\u68C0\u6D4B\");\n    })()");
    }
  }]);
}();
module.exports = XcUpdateNoticeWebpackPlugin;