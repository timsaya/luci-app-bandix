# See /LICENSE for more information.
# This is free software, licensed under the GNU General Public License v2.

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI Bandix app for network traffic monitoring
LUCI_DEPENDS:=+luci-base +luci-lib-jsonc +luci-lib-nixio
LUCI_PKGARCH:=all

PKG_LICENSE:=GPL-2.0
PKG_MAINTAINER:=stefanlei

PKG_VERSION:=0.0.1
PKG_RELEASE:=1

# 定义 Rust 二进制程序的版本和下载地址
RUST_BINARY_VERSION:=1.0.0
RUST_BINARY_URL:=https://github.com/your-username/your-rust-binary/releases/download/v$(RUST_BINARY_VERSION)/bandix-$(RUST_BINARY_VERSION)-$(ARCH).tar.gz

# 下载 Rust 二进制程序
define Download/rust-binary
  FILE:=bandix-$(RUST_BINARY_VERSION)-$(ARCH).tar.gz
  URL:=$(RUST_BINARY_URL)
  HASH:=skip
endef
$(eval $(call Download,rust-binary))

# 安装 Rust 二进制程序
define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(TAR) xzf $(DL_DIR)/bandix-$(RUST_BINARY_VERSION)-$(ARCH).tar.gz -C $(1)/usr/bin/
	chmod +x $(1)/usr/bin/bandix
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature 