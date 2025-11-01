const HtmlWebpackPlugin = require("html-webpack-plugin");
// const { WynUpdateNoticeWebpackPlugin } = require("xc-web-update-notice");
const WynUpdateNoticeWebpackPlugin = require("xc-web-update-notice/webpack");
const path = require("path");
module.exports = {
  entry: "./index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
  },
  mode: "development",
  plugins: [
    // 如果不更改代码内容，不会更改Hash值，不会触发更新
    new WynUpdateNoticeWebpackPlugin({
      // 本次构建是否需要退出登录，默认需要
      isLogout: true,
      // 发布描述，默认空字符串
      publishDescription: "这是一次测试发布",
      // 版本遗留数量，默认10条
      keepVersions: 10,
      // 稍后更新时间间隔，默认10分钟
      laterInterval: 100 * 60 * 1000,
      // 检测间隔时间，默认 5s
      interval: 1000,
      // versionDir:"/dist/",
      // checkerDir:"/dist/",
      isProd: false
    }),
    new HtmlWebpackPlugin({
      template: "./index.html",
    }),
  ],
};
