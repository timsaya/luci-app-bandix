# luci-app-bandix

这是一个用于监控局域网流量的OpenWrt LuCI应用。

## 功能特点

- 实时监控局域网各设备流量
- 显示设备的IP地址、MAC地址
- 显示各设备的上传/下载速度
- 显示各设备的总上传/下载流量

## 依赖

- bandix - Rust编写的后端流量监控程序
- luci-base - 基本LuCI组件

## 安装

```sh
opkg update
opkg install luci-app-bandix
```

## 使用方法

1. 安装后，在LuCI界面的"网络"菜单下可以找到"Bandix流量监控"
2. 点击进入后可以看到局域网各设备的流量数据
3. 数据每秒更新一次

## 许可证

GPL-2.0 