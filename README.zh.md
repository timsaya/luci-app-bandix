# LuCI Bandix

[English](README.md) | 简体中文

[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)


LuCI Bandix 是一个用于 OpenWrt 的网络流量监控应用，通过 LuCI Web 界面提供直观的流量数据展示和分析功能。

## 简介

LuCI Bandix 基于 LuCI 框架开发，为 OpenWrt 路由器提供网络流量监控能力。此应用依赖于 openwrt-bandix 后端服务，可以帮助用户实时查看和分析网络流量统计。

**注意**：本应用主要面向家庭用户和简单网络环境设计，不适用于复杂的网络架构（如 VLAN）或企业级部署。

![LuCI Bandix Screenshot](docs/images/index-1.png)

![LuCI Bandix Screenshot](docs/images/index-2.png)

![LuCI Bandix Screenshot](docs/images/dns-1.png)

![LuCI Bandix Screenshot](docs/images/settings.png)


## 系统要求

- **OpenWrt 版本**: 建议使用 OpenWrt 24.10 及以上版本
- **包格式支持**: 支持 APK 和 IPK 包格式




## 功能特点

- 网络流量实时监控
- 直观的数据可视化界面
- 与 OpenWrt 系统无缝集成
- 自动获取 DHCP/DNS 中主机名 (静态地址分配)
- 基于 Rust eBPF 高性能实现
- 支持 LAN/WAN 网速监控
- 支持设备 TCP/UDP 连接数监控
- 支持 WAN 网速限制
- 支持 IPv4/IPv6
- 支持数据持久化存储
- 提供网络历史趋势图与多维度统计
- 支持 DNS 查询监控与统计分析


## 第三方依赖

luci-app-bandix 需要以下依赖包：

- **curl**: HTTP 客户端库，用于网络请求
- **luci-lib-jsonc**: JSON 解析库，用于数据处理

这些依赖会在安装 luci-app-bandix 时自动安装，但某些固件可能需要手动安装这些依赖包。


## 版本依赖

下表显示了 luci-app-bandix 和 openwrt-bandix 之间的版本依赖关系：

| luci-app-bandix 版本 | 所需的 openwrt-bandix 版本 |
|---------------------|-------------------------|
| 0.2.x               | 0.2.x                   |
| 0.3.x               | 0.3.x                   |
| 0.4.x               | 0.4.x                   |
| 0.5.x               | 0.5.x                   |
| 0.6.x               | 0.6.x                   |
| 0.7.x               | 0.7.x                   |
| 0.8.x               | 0.8.x                   |


请确保安装匹配的版本以确保兼容性和正常功能。

## 安装


1. 先安装 openwrt-bandix 后端

   从 [openwrt-bandix Releases](https://github.com/timsaya/openwrt-bandix/releases) 下载适合您设备的包，然后安装：

   ```bash
   opkg install bandix_最新版本_架构.ipk  # (或 apk add --allow-untrusted bandix_最新版本_架构.apk)
   ```

2. 安装 luci-app-bandix 前端

   从 [luci-app-bandix Releases](https://github.com/timsaya/luci-app-bandix/releases) 下载包，然后安装：

   ```bash
   opkg install luci-app-bandix_最新版本_all.ipk  # (或 apk add --allow-untrusted luci-app-bandix_最新版本_all.apk)
   ```

3. 在设置中配置您的 LAN 接口

   安装完成后，可以通过 LuCI Web 界面访问 Bandix 应用，应用位于"网络"菜单下。进入 Bandix 设置页面，选择您的 LAN 接口以启用正确的监控功能。请确保勾选"启用"选项来启动服务。




## 已知问题

当持久化循环周期设置过大，比如 1小时、10 小时等，在某些设备上会导致 rpcd 服务崩溃，以至于无法通过 Web 访问路由器的管理界面，会提示密码错误等。

**解决办法**: 通过 ssh 进入终端，重新安装 bandix, 并执行 `service rpcd restart`，同时设置小一点的持久化循环周期（比如10分钟）。

## 维护者

- [timsaya](https://github.com/timsaya)

## 许可证

本项目采用 [Apache 2.0 许可证](LICENSE)。

## 贡献

欢迎提交问题报告和改进建议！请通过 GitHub Issues 或 Pull Requests 参与贡献。
