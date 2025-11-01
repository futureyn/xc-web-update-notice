import { defineConfig } from "vite";
import { VitePluginXcUpdateNoticeWebpackPlugin } from "xc-web-update-notice";
export default defineConfig(() => {
  return {
    plugins: [
      VitePluginXcUpdateNoticeWebpackPlugin.default({
        interval: 10000,
      }),
    ],
    base: "./",
    build: {
      outDir: "dist",
      lib: {
        entry: "./index.js",
        formats: ["es", "cjs"],
      },
    },
  };
});
