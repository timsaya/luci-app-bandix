# See /LICENSE for more information.
# This is free software, licensed under the GNU General Public License v2.

include $(TOPDIR)/rules.mk

PKG_LICENSE:=Apache-2.0

LUCI_TITLE:=LuCI Bandix app for network traffic monitoring
LUCI_DEPENDS:=+luci-base +luci-lib-jsonc +curl +bandix 

PKG_MAINTAINER:=timsaya

PKG_VERSION:=0.11.1
PKG_RELEASE:=1

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature 