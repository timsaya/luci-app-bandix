# LuCI Bandix

[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

[中文版](README.md)

LuCI Bandix is a network traffic monitoring application for OpenWrt, providing intuitive traffic data visualization and analysis through the LuCI web interface.

## Introduction

LuCI Bandix is developed based on the LuCI framework, offering network traffic monitoring capabilities for OpenWrt routers. This application depends on the openwrt-bandix backend service and helps users view and analyze network traffic statistics in real-time.

## Features

- Device traffic statistics
- Real-time network traffic monitoring
- Intuitive data visualization interface
- Seamless integration with OpenWrt system

## Installation

### Installation Steps

1. First install the openwrt-bandix backend

   Download the appropriate IPK package for your device from [openwrt-bandix Releases](https://github.com/timsaya/openwrt-bandix/releases), then install using opkg:

   ```bash
   opkg install bandix_version_architecture.ipk
   ```

2. Install the luci-app-bandix frontend

   Download the IPK package from [luci-app-bandix Releases](https://github.com/timsaya/luci-app-bandix/releases), then install using opkg:

   ```bash
   opkg install luci-app-bandix_version_all.ipk
   ```

## Configuration

After installation, you can access the Bandix application through the LuCI web interface. The application is located under the "Network" menu.

## Maintainer

- [timsaya](https://github.com/timsaya)

## License

This project is licensed under the [Apache 2.0 License](LICENSE).

## Contributing

Issue reports and improvement suggestions are welcome! Please participate through GitHub Issues or Pull Requests. 