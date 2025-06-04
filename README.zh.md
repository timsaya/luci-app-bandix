# LuCI Bandix

简体中文 | [English](README.md)

[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)


LuCI Bandix 是一个用于 OpenWrt 的网络流量监控应用，通过 LuCI Web 界面提供直观的流量数据展示和分析功能。

## 简介

LuCI Bandix 基于 LuCI 框架开发，为 OpenWrt 路由器提供网络流量监控能力。此应用依赖于 openwrt-bandix 后端服务，可以帮助用户实时查看和分析网络流量统计。

## 功能特点

- 设备流量统计
- 网络流量实时监控
- 直观的数据可视化界面
- 与 OpenWrt 系统无缝集成

## 安装

### 安装步骤

1. 先安装 openwrt-bandix 后端

   从 [openwrt-bandix Releases](https://github.com/timsaya/openwrt-bandix/releases) 下载适合您设备的IPK包，然后使用opkg安装：

   ```bash
   opkg install bandix_最新版本_架构.ipk
   ```

2. 安装 luci-app-bandix 前端

   从 [luci-app-bandix Releases](https://github.com/timsaya/luci-app-bandix/releases) 下载IPK包，然后使用opkg安装：

   ```bash
   opkg install luci-app-bandix_最新版本_all.ipk
   ```


## 配置

安装完成后，可以通过 LuCI Web 界面访问 Bandix 应用。应用位于"网络"菜单下。

## 维护者

- [timsaya](https://github.com/timsaya)

## 许可证

本项目采用 [Apache 2.0 许可证](LICENSE)。

## 贡献

欢迎提交问题报告和改进建议！请通过 GitHub Issues 或 Pull Requests 参与贡献。
