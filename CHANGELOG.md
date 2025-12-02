# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2025-11-05

### Added

- **Vite/UmiJS/Webpack**: 支持自定义版本号（custom version numbers）。

## [1.2.2] - 2025-12-01

### Added

- **UmiJS 落后版本更新检查支持**  
  在旧版本（≤1.2.1）中，当用户点击「稍后更新」后，插件不会再次检查更新，即使此时又发布了新版本。  
  本次更新在插件内部维护了「落后版本」状态，使得 UmiJS 在点击「稍后更新」后仍能持续检测后续发布的新版本

- **静态资源版本历史记录（保留最近 5 个版本）**  
  插件会在构建后的 `dist` 目录下写入版本历史文件，默认保存最近 **5 个版本信息**，方便排查更新情况与回滚版本。

### Fixed

- 修复了 UmiJS 项目在「稍后更新」后无法再次检测更新的问题。

### Improved

- 优化内部版本状态管理逻辑，使更新判断更加可靠。
- 提升 UmiJS 环境下的兼容性与可维护性。
