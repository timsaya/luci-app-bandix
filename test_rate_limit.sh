#!/bin/sh
# 测试 Bandix 限速功能的 RPC 调用

echo "测试 Bandix 限速功能..."

# 测试获取设备状态
echo "1. 测试获取设备状态..."
ubus call luci.bandix status

echo ""
echo "2. 测试设置限速 (示例: MAC地址为 00:11:22:33:44:55，上传限制1MB/s，下载限制2MB/s)..."
ubus call luci.bandix set_rate_limit '{"mac":"00:11:22:33:44:55","upload_limit":1048576,"download_limit":2097152}'

echo ""
echo "测试完成。" 