# LuCI Bandix

> 推荐用于**单网口**场景。
> 如果需要**多网口**支持，请使用 [LuCI Bandix Plus](https://github.com/timsaya/luci-app-bandix-plus)。

[English](README.md) | 简体中文 | [架构文档](ARCHITECTURE.md)


[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
![Downloads](https://gh-down-badges.linkof.link/timsaya/luci-app-bandix)


LuCI Bandix 是一个用于 OpenWrt 的网络流量监控应用，通过 LuCI Web 界面提供直观的流量数据展示和分析功能。

## 简介

LuCI Bandix 基于 LuCI 框架开发，为 OpenWrt 路由器提供网络流量监控能力。此应用依赖于 openwrt-bandix 后端服务，可以帮助用户实时查看和分析网络流量统计。

**注意**：本应用主要面向家庭用户和简单网络环境设计，不适用于复杂的网络架构（如 VLAN）或企业级部署。

**重要提示**：请在使用此应用前在 OpenWrt 中关闭 硬件流量卸载 和 Turbo ACC。

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

## 截图

![LuCI Bandix Screenshot](docs/images/index-1.png)

![LuCI Bandix Screenshot](docs/images/index-2.png)

![LuCI Bandix Screenshot](docs/images/index-3.png)

![LuCI Bandix Screenshot](docs/images/dns-1.png)



## 功能特点

- 网络流量实时监控
- 直观的数据可视化界面
- 与 OpenWrt 系统无缝集成
- 自动获取 DHCP/DNS 中主机名 (静态地址分配)
- 基于 Rust eBPF 高性能实现
- 支持 LAN/WAN 网速监控
- 支持设备 TCP/UDP 连接数监控
- 支持 WAN 网速限制
- 支持按设备设置每分钟、每小时、每天、每周、每月及累计 WAN 流量配额，超限自动阻断
- 支持 IPv4/IPv6
- 支持数据持久化存储
- 支持 实时/天/周/月 监控
- 提供网络历史趋势图与多维度统计
- 支持 DNS 查询监控与统计分析


## 系统要求

- **Linux 内核**: Linux 6.x 及以上版本
- **OpenWrt 版本**: 建议使用 OpenWrt 24.10 及以上版本



## 第三方依赖

luci-app-bandix 需要以下依赖包：

- **curl**: HTTP 客户端库，用于网络请求
- **luci-lib-jsonc**: JSON 解析库，用于数据处理
- **jsonfilter**: JSON 查询工具，用于过滤和提取数据
- **jshn**: JSON Shell 库，用于 Shell 脚本的 JSON 操作

这些依赖会在安装 luci-app-bandix 时自动安装，但某些固件可能需要手动安装这些依赖包。


## 版本依赖

下表显示了 luci-app-bandix 和 openwrt-bandix 之间的版本依赖关系：

| luci-app-bandix 版本 | 所需的 openwrt-bandix 版本 |
|---------------------|-------------------------|
| 0.10.x              | 0.10.x                  |
| 0.11.x              | 0.11.x                  |
| 0.12.x              | 0.12.x                  |

请确保安装匹配的版本以确保兼容性和正常功能。


## 团队成员

- [timsaya](https://github.com/timsaya)
- [smallprogram](https://github.com/smallprogram)


## 许可证

本项目采用 [Apache 2.0 许可证](LICENSE)。

## 批量删除设备

设备列表支持逐项勾选和全选当前显示的设备，桌面表格与手机卡片均可使用。
点击“删除所选设备”后确认删除；自动刷新会保留勾选，筛选隐藏的设备会取消勾选。
删除成功后静默刷新列表；仅部分失败或请求错误时显示结果，失败项保留勾选，网络错误不会自动重试。

需要支持 `DELETE /api/traffic/devices/batch` 的 Bandix 服务端。删除会清理设备记录、
流量历史、主机名绑定、限速白名单、定时限速及流量配额；在线设备可能被重新发现。
LuCI 按每批 50 台依次请求，批量删除 RPC 仅授予写权限用户。

## 连接详情搜索

连接详情弹窗的搜索框在界面侧即时过滤当前页已加载的连接，不会因输入关键词发起请求。
支持协议、连接状态、原始/回复方向的 IP 与端口、连接标志、国家、地区、城市、ASN
及网络组织名称，包括悬浮详情中的内容和已隐藏的回复方向。搜索不区分大小写，
空格分隔的多个关键词需同时匹配，例如 `tcp 443 杭州`；ASN 可输入 `AS64512` 或数字。
清空搜索恢复本页列表，翻页、刷新和修改协议/状态筛选时保留关键词。
分页总数仍为服务端统计，搜索时另外显示本页匹配数；搜索不覆盖未加载的其他页。

## IP 归属地数据库

在**设置 → 连接监控设置 → IP 归属地数据库**中选择国家/地区或国家/地区 + 省市，
再按需勾选 ASN / 网络组织，点击“下载并启用”。位置库与 ASN 库共同生效，
省市数据已包含国家/地区信息。需要安装支持 GeoIP 的新版 Bandix 服务端。

常驻小字只显示数据来源；选择不同组合时才显示待下载内容，
点击“下载并启用”后才会替换当前组合。展开“数据库详情”可查看已安装数据库、来源、发布版本、构建日期、空间、目录和数据使用条款；
上传要求在上传弹窗中显示。在线下载使用
[P3TERX / MaxMind GeoLite2 的最新发布版](https://github.com/P3TERX/GeoLite.mmdb/releases/latest)，
请以数据库构建日期和发布版本判断数据新旧，而非仓库代码的提交日期。

页面提供真实下载进度、取消、更新、启停、删除和本地 `.mmdb` 上传。
空间不足或下载校验失败时会给出提示，原有数据库继续使用。
数据库的选择、启用状态及版本由服务端持久保存；离开页面不会中断下载。
连接明细中，IP 下方显示归属地简要信息，悬浮可查看省市、ASN 和网络组织。

可以更改数据库存储目录；请先保存并应用目录设置，再执行下载。
上传前会检查扩展名和大小，并根据路由器可用内存限制上传文件大小。
下载和导入操作仅授予 LuCI 写权限用户，上传 ACL 限定为单一暂存文件。

维护验证：`node --test tests/geoip.test.cjs`；翻译目录可使用 `msgfmt` 校验。

## 监听地址

在**设置 → 基本设置 → 监听地址**中配置 `bandix.general.host`，默认为 `127.0.0.1`。
支持 IPv4 和 IPv6；`0.0.0.0`、`::` 分别监听所有 IPv4、IPv6 接口。保存并应用后重启服务。
LuCI 会自动使用配置的地址；监听所有接口时，通过对应的 loopback 地址访问。
HTTP API 不提供身份认证，非 loopback 访问应限制在可信客户端范围。
修改监听地址需要支持 `--host` 的新版服务端；旧配置缺少此项时仍使用默认值。

## Wi-Fi 频段显示

频段由 Bandix 服务端返回的主信道频率 `w_freq`（MHz）判断，支持 2.4、5 和 6 GHz。
不同频段的信道号会重叠，因此不再仅凭 `w_ch` 推断频段。
需要同时更新服务端和 LuCI；旧服务端未提供频率或读取失败时，显示中性的信道号而不猜测频段。
维护验证：`node --test tests/wifi.test.cjs`。
