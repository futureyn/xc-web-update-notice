import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';
import modalGenerator from './modal';
import type { PluginOptions } from './types';

const _VERSION = '_version.json';
const _UPDATE_CHECKER = '_update-checker.js';
const _VERSION_HISTORY = '_version-history.json';

const modalCss = `
    .rt {
        top: 20px;
        right: -340px;
    }

    .rb {
        bottom: 20px;
        right: -340px;
    }

    .lt {
        top: 20px;
        left: -340px;
    }

    .lb {
        bottom: 20px;
        left: -340px;
    }

    .__vite-xc-web-update-notice {
        width: 300px;
        background-color: white;
        box-shadow: 0 0 10px #ccc;
        border-radius: 6px;
        position: fixed;
        padding: 14px;
        transition: all 0.2s ease;
        z-index: 9999;
    }

    .__vite-xc-web-update-notice .__vite-xc-web-update-notice_title {
        font-size: 18px;
        font-weight: bold;
    }

    .__vite-xc-web-update-notice .__vite-xc-web-update-notice_content {
        margin: 0; 
        margin-top: 4px;
    }

    .__vite-xc-web-update-notice .__vite-xc-web-update-notice_footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 10px;
        font-size: 14px;
    }

    .__vite-xc-web-update-notice .__vite-xc-web-update-notice_footer button {
        border: none;
        background-color: #409eff;
        color: white;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 10px;
        outline: none;
    }

    .__vite-xc-web-update-notice .__vite-xc-web-update-notice_footer button.__vite-xc-web-update-notice_footer_dismiss {
        background-color: #909399;
    }

    .__vite-xc-web-update-notice .__vite-xc-web-update-notice_footer button .__vite-xc-web-update-notice_footer_later_update {
        background-color: #909399;
    }

    .__vite-xc-web-update-notice .__vite-xc-web-update-notice_footer button.__vite-xc-web-update-notice_footer_update {
        background-color: #67c23a;
    }

    .__vite-xc-web-update-notice .__vite-xc-web-update-notice_footer button:hover {
        opacity: 0.8;
    }
`;

function createEnvironmentHash(mode: string, version: string): string {
  if (mode === 'hash') {
    const hash = createHash('md5');
    hash.update(Date.now().toString());
    return hash.digest('hex');
  } else if (mode === 'custom') {
    return version;
  }
  return '1.0.0';
}

function generateCheckerScript(options: PluginOptions): string {
  return `(function () {
        // 检测定时器
        let timer = null;
        // 稍后更新定时器
        let laterTimer = null;
        // 间隔检测时间
        const interval = ${options.interval || 5000}
        // 获取版本文件
        const versionUrl = "${options.versionDir}${options.filename}"
        // 客户端版本
        let clientCurrentVersion = window.localStorage.getItem('${options.customVersionName || '_version'}');
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
            _laterInfo() {
                return laterInfo
            },
            // 自定义弹窗设置语言
            setModalLocal({title, content}) {
                if(${!options.useDefaultModal}) return
                if(title) {
                    const modalEleTitle = document.getElementsByClassName("__vite-xc-web-update-notice_title");
                    modalEleTitle[0].innerHTML = title
                }
                
                if(content) {
                    const modalEleContent = document.getElementsByClassName("__vite-xc-web-update-notice_content");
                    modalEleContent[0].innerHTML = content
                }
            },
            onUpdate(fn, ver) {
                clientCurrentVersion = ver;
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
                    checkUpdate(true);
                }, ${options.laterInterval || 10 * 60 * 1000});
            }
        }
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
                    if(${options.useDefaultModal}) {
                        const mdoalEle = document.getElementById("__vite-xc-web-update-notice");
                        if(${['rb', 'rt'].includes(options.customModalAttrs?.placement || 'rt')}) {
                            mdoalEle.style.right = '20px'
                        }

                        if(${['lt', 'lb'].includes(options.customModalAttrs?.placement || 'rt')}) {
                            mdoalEle.style.left = '20px'
                        }
                    }
                    callbacks.forEach(fn => fn({ oldHash: clientCurrentVersion, newHash: data.hash, isLogout: data.isLogout, publishDescription: data.publishDescription  }));
                }

                // 稍后更新中的时候，再次发布新版本时更新
                if(laterInfo.length && laterInfo[laterInfo.length-1].version !== data.hash) {
                    if (isDialog) {
                        return;
                    }
                    isDialog = true;
                    if(${options.useDefaultModal}) {
                        const mdoalEle = document.getElementById("__vite-xc-web-update-notice");
                        if(${['rb', 'rt'].includes(options.customModalAttrs?.placement || 'rt')}) {
                            mdoalEle.style.right = '20px'
                        }

                        if(${['lt', 'lb'].includes(options.customModalAttrs?.placement || 'rt')}) {
                            mdoalEle.style.left = '20px'
                        }
                    }
                    // 落后版本是否有需要退出登录的
                    const isLogout = laterInfo.find(item => item.isLogout)?.isLogout;
                    callbacks.forEach(fn => fn({ oldHash: clientCurrentVersion, newHash: data.hash, isLogout: data.isLogout || isLogout  }));
                    laterInfo = [];
                }
            } catch (e) {
                console.warn("检查版本更新失败", e);
            }
      }
      window._xcUpdate = xcUpdate;
      timer = setInterval(checkUpdate, interval);
      console.log("[xc-web-update-notice-vite] 启动版本检测");
    })()`;
}

export default function XcUpdateNoticeVitePlugin(
  userOptions: PluginOptions = {}
): Plugin {
  const options: PluginOptions = {
    isLogout: false,
    versionDir: '',
    checkerDir: '',
    interval: 5000,
    publishDescription: '',
    laterInterval: 10 * 60 * 1000,
    filename: _VERSION,
    checkerName: _UPDATE_CHECKER,
    customModalAttrs: {
      placement: 'rt',
    },
    historyFile: _VERSION_HISTORY,
    keepVersions: 10,
    versionMode: 'hash',
    version: '1.0.0',
    isProd: true,
    useDefaultModal: false,
    customModalCssName: '_use-default-modal-css.css',
    customModalHTMLName: '_use-default-modal-html.js',
    customVersionName: '_version',
    ...userOptions,
  };

  return {
    name: 'rollup-plugin-xc-update-notice',
    apply: 'build',
    closeBundle() {
      if (!options.isProd) return;

      const outDir = options.outDir || 'dist';
      const versionFile = path.resolve(outDir, options.filename!);
      const updateChecker = path.resolve(outDir, options.checkerName!);
      const linkCss = path.resolve(outDir, options.customModalCssName!);
      const modalHTML = path.resolve(outDir, options.customModalHTMLName!);

      const hash = createEnvironmentHash(options.versionMode!, options.version!);
      const version = {
        hash,
        buildTime: new Date().toLocaleString(),
        publishDescription: options.publishDescription,
        isLogout: options.isLogout,
      };

      // 当前版本写入
      fs.writeFileSync(versionFile, JSON.stringify(version, null, 2));

      // 写入_update-checker.js
      fs.writeFileSync(updateChecker, generateCheckerScript(options));

      // 写入样式文件
      fs.writeFileSync(linkCss, modalCss);

      // 写入弹窗 HTML
      fs.writeFileSync(modalHTML, modalGenerator(options.customModalAttrs, options));
    },

    transformIndexHtml() {
      if (!options.isProd) return;

      return [
        {
          tag: 'script',
          injectTo: 'body',
          attrs: {
            src: `${options.checkerDir}${options.checkerName}`,
          },
        },
        {
          tag: 'script',
          injectTo: 'body',
          attrs: {
            src: `${options.checkerDir}${options.customModalHTMLName}`,
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: `${options.checkerDir}${options.customModalCssName}`,
          },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}
