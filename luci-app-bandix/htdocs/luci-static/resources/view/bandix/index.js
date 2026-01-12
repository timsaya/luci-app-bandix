'use strict';
'require view';
'require ui';
'require uci';
'require rpc';
'require poll';

// 颜色常量定义
var BANDIX_COLOR_UPLOAD = '#f97316';     // 橙色 - 上传/上行
var BANDIX_COLOR_DOWNLOAD = '#06b6d4';   // 青色 - 下载/下行

// 暗色模式：以 LuCI 页面实际主题为准（不依赖浏览器 prefers-color-scheme）

// 检测主题类型：返回 'wide'（宽主题，如 Argon）或 'narrow'（窄主题，如 Bootstrap）
function getThemeType() {
    // 获取 LuCI 主题设置
    var mediaUrlBase = uci.get('luci', 'main', 'mediaurlbase');

    if (!mediaUrlBase) {
        // 如果无法获取，尝试从 DOM 中检测
        var linkTags = document.querySelectorAll('link[rel="stylesheet"]');
        for (var i = 0; i < linkTags.length; i++) {
            var href = linkTags[i].getAttribute('href') || '';
            if (href.toLowerCase().includes('argon')) {
                return 'wide';
            }
        }
        // 默认返回窄主题
        return 'narrow';
    }

    var mediaUrlBaseLower = mediaUrlBase.toLowerCase();

    // 宽主题关键词列表（可以根据需要扩展）
    var wideThemeKeywords = ['argon', 'material', 'design', 'edge'];

    // 检查是否是宽主题
    for (var i = 0; i < wideThemeKeywords.length; i++) {
        if (mediaUrlBaseLower.includes(wideThemeKeywords[i])) {
            return 'wide';
        }
    }

    // 默认是窄主题（Bootstrap 等）
    return 'narrow';
}

function parseRgbColor(color) {
    if (!color) return null;
    var m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (!m) return null;
    return {
        r: parseInt(m[1]),
        g: parseInt(m[2]),
        b: parseInt(m[3]),
        a: m[4] != null ? parseFloat(m[4]) : 1
    };
}

function isDarkRgb(rgb) {
    if (!rgb) return false;
    var lum = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
    return lum < 140;
}

function getLuCiColorScheme() {
    try {
        var cbiSection = document.querySelector('.cbi-section');
        var targetElement = cbiSection || document.querySelector('.main') || document.body;
        var style = window.getComputedStyle(targetElement);
        var bg = style.backgroundColor;

        if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
            var allCbiSections = document.querySelectorAll('.cbi-section');
            for (var i = 0; i < allCbiSections.length; i++) {
                var s = window.getComputedStyle(allCbiSections[i]);
                var sectionBg = s.backgroundColor;
                if (sectionBg && sectionBg !== 'rgba(0, 0, 0, 0)' && sectionBg !== 'transparent') {
                    bg = sectionBg;
                    break;
                }
            }
        }

        return isDarkRgb(parseRgbColor(bg)) ? 'dark' : 'light';
    } catch (e) {
        return 'light';
    }
}

function transformPrefersDarkBlocks(cssText, enableDark) {
    var token = '@media (prefers-color-scheme: dark)';
    var out = '';
    var i = 0;

    while (i < cssText.length) {
        var idx = cssText.indexOf(token, i);
        if (idx < 0) {
            out += cssText.slice(i);
            break;
        }

        out += cssText.slice(i, idx);

        var braceIdx = cssText.indexOf('{', idx + token.length);
        if (braceIdx < 0) {
            out += cssText.slice(idx);
            break;
        }

        var depth = 1;
        var j = braceIdx + 1;
        while (j < cssText.length && depth > 0) {
            var ch = cssText[j];
            if (ch === '{') depth++;
            else if (ch === '}') depth--;
            j++;
        }

        var inner = cssText.slice(braceIdx + 1, j - 1);
        if (enableDark) out += inner;

        i = j;
    }

    return out;
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
}

function formatByterate(bytes_per_sec, unit) {
    if (bytes_per_sec === 0) {
        return unit === 'bits' ? '0 bps' : '0 B/s';
    }

    if (unit === 'bits') {
        // 转换为比特单位
        const bits_per_sec = bytes_per_sec * 8;
        const units = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
        const i = Math.floor(Math.log(bits_per_sec) / Math.log(1000));
        return parseFloat((bits_per_sec / Math.pow(1000, i)).toFixed(2)) + ' ' + units[i];
    } else {
        // 默认字节单位
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
        const i = Math.floor(Math.log(bytes_per_sec) / Math.log(1024));
        return parseFloat((bytes_per_sec / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
    }
}

// 解析速度字符串为字节/秒
function parseSpeed(speedStr) {
    if (!speedStr || speedStr === '0' || speedStr === '0 B/s' || speedStr === '0 bps') return 0;

    // 匹配字节单位
    const bytesMatch = speedStr.match(/^([\d.]+)\s*([KMGT]?B\/s)$/i);
    if (bytesMatch) {
        const value = parseFloat(bytesMatch[1]);
        const unit = bytesMatch[2].toUpperCase();

        const bytesMultipliers = {
            'B/S': 1,
            'KB/S': 1024,
            'MB/S': 1024 * 1024,
            'GB/S': 1024 * 1024 * 1024,
            'TB/S': 1024 * 1024 * 1024 * 1024
        };

        return value * (bytesMultipliers[unit] || 1);
    }

    // 匹配比特单位
    const bitsMatch = speedStr.match(/^([\d.]+)\s*([KMGT]?bps)$/i);
    if (bitsMatch) {
        const value = parseFloat(bitsMatch[1]);
        const unit = bitsMatch[2].toLowerCase();

        const bitsMultipliers = {
            'bps': 1,
            'kbps': 1000,
            'mbps': 1000 * 1000,
            'gbps': 1000 * 1000 * 1000,
            'tbps': 1000 * 1000 * 1000 * 1000
        };

        // 转换为字节/秒
        return (value * (bitsMultipliers[unit] || 1)) / 8;
    }

    return 0;
}

// 过滤 LAN IPv6 地址（排除本地链路地址）
function filterLanIPv6(ipv6Addresses) {
    if (!ipv6Addresses || !Array.isArray(ipv6Addresses)) return [];

    const lanPrefixes = [
        'fd',     // ULA
        'fc'      // ULA
    ];

    const lanAddresses = ipv6Addresses.filter(addr => {
        const lowerAddr = addr.toLowerCase();
        return lanPrefixes.some(prefix => lowerAddr.startsWith(prefix));
    });

    // 最多返回 2 个 LAN IPv6 地址
    return lanAddresses.slice(0, 2);
}

function getTimeRangeForPeriod(period) {
    if (period === 'all') {
        return { start_ms: null, end_ms: null };
    }
    
    var now = new Date();
    var startDate;
    var endDate;
    
    switch (period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            break;
        case 'week':
            var day = now.getDay();
            var diff = day === 0 ? 6 : day - 1;
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0);
            endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6, 23, 59, 59, 999);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        default:
            return { start_ms: null, end_ms: null };
    }
    
    return {
        start_ms: startDate.getTime(),
        end_ms: endDate.getTime()
    };
}

var callStatus = rpc.declare({
    object: 'luci.bandix',
    method: 'getStatus',
    params: ['start_ms', 'end_ms'],
    expect: {}
});

var callSetHostname = rpc.declare({
    object: 'luci.bandix',
    method: 'setHostname',
    params: ['mac', 'hostname'],
    expect: { success: true }
});

// 历史指标 RPC
var callGetMetrics = rpc.declare({
    object: 'luci.bandix',
    method: 'getMetrics',
    params: ['mac'],
    expect: {}
});

// 定时限速 RPC
var callGetScheduleLimits = rpc.declare({
    object: 'luci.bandix',
    method: 'getScheduleLimits',
    expect: {}
});

var callSetScheduleLimit = rpc.declare({
    object: 'luci.bandix',
    method: 'setScheduleLimit',
    params: ['mac', 'start_time', 'end_time', 'days', 'wan_tx_rate_limit', 'wan_rx_rate_limit'],
    expect: { success: true }
});

var callDeleteScheduleLimit = rpc.declare({
    object: 'luci.bandix',
    method: 'deleteScheduleLimit',
    params: ['mac', 'start_time', 'end_time', 'days'],
    expect: { success: true }
});

// 版本和更新检查 RPC
var callGetVersion = rpc.declare({
    object: 'luci.bandix',
    method: 'getVersion',
    expect: {}
});

var callCheckUpdate = rpc.declare({
    object: 'luci.bandix',
    method: 'checkUpdate',
    expect: {}
});

// 流量统计 RPC
// Ranking 接口参数：
//   - start_ms: u64, 可选, 默认值: 365天前
//   - end_ms: u64, 可选, 默认值: 当前时间
var callGetTrafficUsageRanking = rpc.declare({
    object: 'luci.bandix',
    method: 'getTrafficUsageRanking',
    params: ['start_ms', 'end_ms', 'network_type']
});

// Increments 接口参数：
//   - start_ms: u64, 可选, 默认值: 365天前
//   - end_ms: u64, 可选, 默认值: 当前时间
//   - aggregation: String, 可选, 默认值: "hourly" (可选值: "hourly" 或 "daily")
//   - mac: String, 可选, 默认值: "all" (MAC 地址或 "all" 查询所有设备)
var callGetTrafficUsageIncrements = rpc.declare({
    object: 'luci.bandix',
    method: 'getTrafficUsageIncrements',
    params: ['start_ms', 'end_ms', 'aggregation', 'mac', 'network_type']
});

// 限速白名单 RPC
var callGetRateLimitWhitelist = rpc.declare({
    object: 'luci.bandix',
    method: 'getRateLimitWhitelist',
    expect: {}
});

var callSetRateLimitWhitelistEnabled = rpc.declare({
    object: 'luci.bandix',
    method: 'setRateLimitWhitelistEnabled',
    params: ['enabled'],
    expect: {}
});

var callAddRateLimitWhitelist = rpc.declare({
    object: 'luci.bandix',
    method: 'addRateLimitWhitelist',
    params: ['mac'],
    expect: {}
});

var callDeleteRateLimitWhitelist = rpc.declare({
    object: 'luci.bandix',
    method: 'deleteRateLimitWhitelist',
    params: ['mac'],
    expect: {}
});

var callSetDefaultRateLimit = rpc.declare({
    object: 'luci.bandix',
    method: 'setDefaultRateLimit',
    params: ['wan_rx_rate_limit', 'wan_tx_rate_limit'],
    expect: {}
});

return view.extend({
    load: function () {
        return Promise.all([
            uci.load('bandix'),
            uci.load('luci'),
            uci.load('argon').catch(function () {
                // argon 配置可能不存在，忽略错误
                return null;
            })
        ]);
    },

    render: function (data) {

        // 生成样式字符串的函数
        function generateStyles(colorScheme) {
            var scheme = colorScheme || getLuCiColorScheme();
            var css = `
            .bandix-container {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            
            .bandix-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .bandix-title {
                font-size: 1.5rem;
                font-weight: 600;
                margin: 0;
            }
            
            .bandix-header-right {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .bandix-title-wrapper {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .bandix-version {
                font-size: 0.875rem;
                opacity: 0.5;
                font-weight: 400;
            }
            
            .bandix-version-wrapper {
                display: inline-flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            
            .bandix-version-item {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            
            .bandix-update-badge {
                display: inline-block;
                cursor: pointer;
                padding: 2px 8px;
                margin-left: 8px;
                background-color: rgba(239, 68, 68, 0.1);
                color: #ef4444;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
                transition: all 0.2s ease;
            }
            
            .bandix-update-badge:hover {
                background-color: rgba(239, 68, 68, 0.2);
                transform: translateY(-1px);
            }
            
            @media (prefers-color-scheme: dark) {
                .bandix-update-badge {
                    background-color: rgba(239, 68, 68, 0.2);
                    color: #f87171;
                }
                
                .bandix-update-badge:hover {
                    background-color: rgba(239, 68, 68, 0.3);
                }
            }
            
            /* 移动端隐藏版本信息和更新徽章 */
            @media (max-width: 768px) {
                .bandix-version-wrapper {
                    display: none;
                }
            }
            
            .device-mode-group {
                display: inline-flex;
                align-items: center;
                gap: 12px;
            }

            .device-toolbar {
                display: inline-flex;
                align-items: center;
                justify-content: flex-end;
                gap: 16px;
                flex-wrap: wrap;
            }

            .device-toolbar .device-group {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding-left: 12px;
                border-left: 1px solid rgba(107, 114, 128, 0.35);
            }

            .device-toolbar .device-group:first-child {
                padding-left: 0;
                border-left: none;
            }

            .device-toolbar .device-group-label {
                font-size: 0.75rem;
                opacity: 0.7;
                white-space: nowrap;
            }

            .device-toolbar .cbi-input-select {
                height: auto;
                font-size: 0.875rem;
            }

            .device-mode-group .device-mode-item {
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            .device-mode-group .cbi-input-radio {
                margin: 0;
            }

            .device-mode-group .device-mode-item label {
                margin: 0;
            }
            
            .bandix-badge {
                border-radius: 4px;
                padding: 4px 10px;
                font-size: 0.875rem;
            }

            #history-retention {
                border: 1px solid rgba(107, 114, 128, 0.4);
            }
            
            .bandix-alert {
                border-radius: 4px;
                padding: 10px 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                font-size: 0.875rem;
            }
            
            /* 只在宽模式下应用警告样式 */
            .bandix-alert.wide-theme {
                background-color: rgba(251, 191, 36, 0.1);
                border: 1px solid rgba(251, 191, 36, 0.3);
                color: #92400e;
            }
            
            @media (prefers-color-scheme: dark) {
                .bandix-alert.wide-theme {
                    background-color: rgba(251, 191, 36, 0.15);
                    border-color: rgba(251, 191, 36, 0.4);
                    color: #fbbf24;
                }
            }
            
            .bandix-alert-icon {
                font-size: 0.875rem;
                font-weight: 700;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                flex-shrink: 0;
            }
            
            
            .bandix-table {
                width: 100%;
                table-layout: fixed;
            }
            
            .bandix-table th {
                padding: 10px 16px;
                text-align: left;
                font-weight: 600;
                border: none;
                font-size: 0.875rem;
                cursor: pointer;
                user-select: none;
                position: relative;
                transition: background-color 0.15s ease;
            }
            
            .bandix-table th:hover {
                opacity: 0.7;
            }
            
            .bandix-table th.sortable::after {
                content: '⇅';
                margin-left: 6px;
                opacity: 0.3;
                font-size: 0.75rem;
            }
            
            .bandix-table th.sortable.active::after {
                opacity: 1;
                color: #3b82f6;
            }
            
            .bandix-table th.sortable.asc::after {
                content: '↑';
            }
            
            .bandix-table th.sortable.desc::after {
                content: '↓';
            }
            
            .th-split-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            
            .th-split-section {
                display: flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 4px;
                transition: background-color 0.2s ease;
            }
            
            .th-split-section:hover {
                opacity: 0.7;
            }
            
            .th-split-section.active {
                opacity: 0.7;
            }
            
            .th-split-icon {
                font-size: 0.7rem;
                opacity: 0.5;
            }
            
            .th-split-section.active .th-split-icon {
                opacity: 1;
                color: #3b82f6;
            }
            
            .th-split-divider {
                width: 1px;
                height: 16px;
                background-color: currentColor;
                opacity: 0.5;
            }
            
            .bandix-table td {
                padding: 12px 16px;
                border: none;
                vertical-align: middle;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            .bandix-table th:nth-child(1),
            .bandix-table td:nth-child(1) {
                width: 27%;
            }
            
            .bandix-table th:nth-child(2),
            .bandix-table td:nth-child(2) {
                width: 22%;
            }
            
            .bandix-table th:nth-child(3),
            .bandix-table td:nth-child(3) {
                width: 22%;
            }
            
            .bandix-table th:nth-child(4),
            .bandix-table td:nth-child(4) {
                width: 12.5%;
            }
            
            .bandix-table th:nth-child(5),
            .bandix-table td:nth-child(5) {
                width: 16.5%;
            }
            
            .schedule-rules-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

			/* 类型联动的高亮与弱化 */
			.bandix-table .hi { font-weight: 700; }
			.bandix-table .dim { opacity: 0.6; }
            
            
            .device-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .device-name {
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .device-connection-type {
                font-size: 0.75rem;
                opacity: 1.0;
                cursor: help;
            }
            
            .device-status {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                display: inline-block;
            }
            
            .device-status.online {
                background-color: #10b981;
            }
            
            .device-status.offline {
                background-color: #9ca3af;
            }
            
            .device-ip {
                opacity: 0.7;
                font-size: 0.875rem;
            }
            
            .device-ipv6 {
                opacity: 0.7;
                font-size: 0.75rem;
                font-family: monospace;
            }
            
            .device-mac {
                opacity: 0.6;
                font-size: 0.75rem;
            }

            .device-last-online {
                font-size: 0.75rem;
                color: #6b7280;
            }

            .device-last-online-value {
                color: #9ca3af;
            }

            .device-last-online-exact {
                display: none;
                color: #9ca3af;
            }

            /* 悬浮在整个设备信息区域时显示精确时间 */
            .device-info:hover .device-last-online-value {
                display: none;
            }

            .device-info:hover .device-last-online-exact {
                display: inline;
            }
            
            .traffic-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .traffic-row {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .traffic-icon {
                font-size: 0.75rem;
                font-weight: bold;
            }
            
            .traffic-icon.upload {
                color: ${BANDIX_COLOR_UPLOAD};
            }

            .traffic-icon.download {
                color: ${BANDIX_COLOR_DOWNLOAD};
            }
            
            .traffic-speed {
                font-weight: 600;
                font-size: 0.875rem;
            }
            
            .traffic-total {
                font-size: 0.75rem;
                opacity: 0.6;
                margin-left: 4px;
            }
            
            .limit-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .limit-badge {
                padding: 3px 8px;
                border-radius: 3px;
                font-size: 0.75rem;
                text-align: center;
                margin-top: 4px;
            }
            
            .loading {
                text-align: center;
                padding: 40px;
                opacity: 0.7;
                font-style: italic;
            }
            
            .error {
                text-align: center;
                padding: 40px;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 16px;
                margin-bottom: 0;
                margin-top: 0;
            }
            
            
            .bandix-container > .cbi-section:last-of-type {
                margin-bottom: 0;
            }
            
            .stats-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .stats-card-title {
                font-size: 0.875rem;
                font-weight: 600;
                opacity: 0.7;
                margin: 0 0 12px 0;
                text-transform: uppercase;
                letter-spacing: 0.025em;
            }
            
            .stats-grid .cbi-section {
                padding: 16px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
                margin: 0 0 0 0 !important;
            }
            
            .stats-grid .cbi-section:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
                transform: translateY(-2px);
            }
            
            @media (prefers-color-scheme: dark) {
                .stats-grid .cbi-section {
                    border-color: rgba(255, 255, 255, 0.15);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                }
                
                .stats-grid .cbi-section:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                }
            }
            
            .stats-card-icon {
                font-size: 0.875rem;
                font-weight: 600;
                padding: 4px 8px;
                border-radius: 4px;
                background-color: currentColor;
                opacity: 0.1;
            }
            
            .stats-card-main-value {
                font-size: 2.25rem;
                font-weight: 700;
                margin: 0 0 8px 0;
                line-height: 1;
            }
            
            .stats-card-sub-value {
                font-size: 0.875rem;
                opacity: 0.7;
                margin: 0;
            }
            
            .stats-card-details {
                margin-top: 16px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .stats-detail-row {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.875rem;
            }
            
            .stats-detail-label {
                opacity: 0.7;
                font-weight: 500;
            }
            
            .stats-detail-value {
                font-weight: 600;
            }
            
            .stats-title {
                font-size: 0.875rem;
                font-weight: 600;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .stats-value {
                font-size: 1.25rem;
                font-weight: 700;
            }
            
            /* 模态框样式 */
            .bandix_modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            #confirm-dialog-bandix_modal {
                z-index: 1105;
            }
            
            .bandix_modal-overlay.show {
                background-color: rgba(0, 0, 0, 0.5);
                opacity: 1;
                visibility: visible;
            }
            
            .bandix_modal {
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                opacity: 0;
                transition: opacity 0.2s ease;
                background-color: rgba(255, 255, 255, 0.98);
                color: #1f2937;
            }
            
            .bandix_modal-overlay.show .bandix_modal {
                opacity: 1;
            }
            
            @media (prefers-color-scheme: dark) {
                .bandix_modal {
                    background-color: rgba(30, 30, 30, 0.98);
                    color: #e5e7eb;
                }
            }
            
            .bandix_modal-header {
                padding: 20px;
            }
            
            .bandix_modal-title {
                font-size: 1.25rem;
                font-weight: 600;
                margin: 0;
            }
            
            .bandix_modal-body {
                padding: 20px;
            }
            
            .bandix_modal-footer {
                padding: 16px 20px 20px 20px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            /* 白名单弹窗样式 */
            .whitelist_modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1002;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .whitelist_modal-overlay.show {
                background-color: rgba(0, 0, 0, 0.5);
                opacity: 1;
                visibility: visible;
            }

            .whitelist_modal {
                max-width: 560px;
                width: 92%;
                max-height: 90vh;
                overflow-y: auto;
                opacity: 0;
                transition: opacity 0.2s ease;
                background-color: rgba(255, 255, 255, 0.98);
                color: #1f2937;
                border-radius: 8px;
            }

            .whitelist_modal-overlay.show .whitelist_modal {
                opacity: 1;
            }

            @media (prefers-color-scheme: dark) {
                .whitelist_modal {
                    background-color: rgba(30, 30, 30, 0.98);
                    color: #e5e7eb;
                }
            }

            .whitelist_modal-header {
                padding: 16px 20px 0 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            }

            .whitelist_modal-title {
                font-size: 1.1rem;
                font-weight: 600;
                margin: 0;
            }

            .whitelist_modal-body {
                padding: 16px 20px;
            }

            .whitelist_modal-footer {
                padding: 0 20px 18px 20px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            .whitelist_modal-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 12px;
            }

            .whitelist_modal-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 8px;
            }

            .whitelist_modal-item {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
                padding: 8px 10px;
                border: 1px solid rgba(0, 0, 0, 0.12);
                border-radius: 8px;
            }

            @media (prefers-color-scheme: dark) {
                .whitelist_modal-item {
                    border-color: rgba(255, 255, 255, 0.15);
                }
            }

            .whitelist_modal-mac {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 0.875rem;
            }

            .whitelist_modal-hint {
                font-size: 0.75rem;
                opacity: 0.7;
                margin-top: 6px;
            }

            .whitelist_modal-error {
                font-size: 0.8125rem;
                color: #ef4444;
                margin-top: 10px;
                display: none;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-label {
                display: block;
                font-weight: 600;
                margin-bottom: 8px;
                font-size: 0.875rem;
            }
            
            .form-input {
                width: 100%;
                border-radius: 4px;
                padding: 8px 12px;
                font-size: 0.875rem;
                transition: border-color 0.15s ease;
                box-sizing: border-box;
            }
            
            .form-input:focus {
                outline: none;
            }
            
            /* Tab 切换样式 */
            .bandix_modal-tabs {
                display: flex;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                margin-bottom: 20px;
            }
            
            @media (prefers-color-scheme: dark) {
                .bandix_modal-tabs {
                    border-bottom-color: rgba(255, 255, 255, 0.15);
                }
            }
            
            .bandix_modal-tab {
                flex: 1;
                padding: 12px 16px;
                text-align: center;
                cursor: pointer;
                border: none;
                background: transparent;
                font-size: 0.875rem;
                font-weight: 500;
                color: rgba(0, 0, 0, 0.6);
                transition: all 0.2s ease;
                border-bottom: 2px solid transparent;
            }
            
            @media (prefers-color-scheme: dark) {
                .bandix_modal-tab {
                    color: rgba(255, 255, 255, 0.6);
                }
            }
            
            .bandix_modal-tab:hover {
                color: rgba(0, 0, 0, 0.8);
                background-color: rgba(0, 0, 0, 0.02);
            }
            
            @media (prefers-color-scheme: dark) {
                .bandix_modal-tab:hover {
                    color: rgba(255, 255, 255, 0.8);
                    background-color: rgba(255, 255, 255, 0.05);
                }
            }
            
            .bandix_modal-tab.active {
                color: #3b82f6;
                border-bottom-color: #3b82f6;
                font-weight: 600;
            }
            
            .bandix_modal-tab-content {
                display: none;
            }
            
            .bandix_modal-tab-content.active {
                display: block;
            }
            
            .schedule-time-row {
                display: flex;
                gap: 12px;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .schedule-time-input {
                flex: 1;
                border-radius: 4px;
                padding: 8px 12px;
                font-size: 0.875rem;
                transition: border-color 0.15s ease;
                box-sizing: border-box;
            }
            
            .schedule-days {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 16px;
            }
            
            .schedule-day-btn {
                flex: 1;
                min-width: 40px;
                padding: 6px 8px;
                border-radius: 4px;
                border: 1px solid rgba(0, 0, 0, 0.2);
                background: transparent;
                cursor: pointer;
                font-size: 0.75rem;
                transition: all 0.15s ease;
                text-align: center;
            }
            
            @media (prefers-color-scheme: dark) {
                .schedule-day-btn {
                    border-color: rgba(255, 255, 255, 0.2);
                }
            }
            
            .schedule-day-btn:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            
            @media (prefers-color-scheme: dark) {
                .schedule-day-btn:hover {
                    background-color: rgba(255, 255, 255, 0.05);
                }
            }
            
            .schedule-day-btn.active {
                background-color: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
            
            .schedule-rules-list {
                min-height: 200px;
                max-height: 400px;
                overflow-y: auto;
                border: 1px dashed rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                padding: 16px;
            }
            
            @media (prefers-color-scheme: dark) {
                .schedule-rules-list {
                    border-color: rgba(255, 255, 255, 0.2);
                }
            }
            
            .schedule-rules-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 200px;
                text-align: center;
                color: rgba(0, 0, 0, 0.5);
                font-size: 0.875rem;
            }
            
            @media (prefers-color-scheme: dark) {
                .schedule-rules-empty {
                    color: rgba(255, 255, 255, 0.5);
                }
            }
            
            .schedule-rule-item {
                padding: 12px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 4px;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            @media (prefers-color-scheme: dark) {
                .schedule-rule-item {
                    border-color: rgba(255, 255, 255, 0.15);
                }
            }
            
            .schedule-rule-info {
                flex: 1;
            }
            
            .schedule-rule-time {
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            .schedule-rule-days {
                font-size: 0.75rem;
                opacity: 0.7;
                margin-bottom: 4px;
            }
            
            .schedule-rule-limits {
                font-size: 0.75rem;
                opacity: 0.7;
            }
            
            .schedule-rule-delete {
                padding: 6px 12px;
                font-size: 0.75rem;
                cursor: pointer;
                border-radius: 4px;
                border: 1px solid rgba(239, 68, 68, 0.3);
                background-color: rgba(239, 68, 68, 0.1);
                color: #ef4444;
                transition: all 0.15s ease;
            }
            
            .schedule-rule-delete:hover {
                background-color: rgba(239, 68, 68, 0.2);
            }
            
            .device-summary {
                border-radius: 4px;
                padding: 12px;
                margin-bottom: 16px;
            }
            
            .device-summary-name {
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            .device-summary-details {
                opacity: 0.7;
                font-size: 0.875rem;
            }
            
            /* 加载动画 */
            .loading-spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid transparent;
                border-radius: 50%;
                border-top-color: #3b82f6;
                animation: spin 1s ease-in-out infinite;
                margin-right: 8px;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .btn-loading {
                opacity: 0.7;
                pointer-events: none;
            }

            /* 确认对话框 */
            .confirm-dialog {
                max-width: 400px;
                width: 90%;
            }
            
            .confirm-dialog .bandix_modal-body {
                padding: 24px;
            }
            
            .confirm-dialog-title {
                font-size: 1.125rem;
                font-weight: 600;
                margin-bottom: 12px;
            }
            
            .confirm-dialog-message {
                font-size: 0.875rem;
                line-height: 1.5;
                color: rgba(0, 0, 0, 0.7);
                margin-bottom: 20px;
            }
            
            @media (prefers-color-scheme: dark) {
                .confirm-dialog-message {
                    color: rgba(255, 255, 255, 0.7);
                }
            }
            
            .confirm-dialog-footer {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            /* 历史趋势 */
            .history-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
            }
            @media (max-width: 768px) {
                .history-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 12px;
                }
            }
            .history-controls {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                align-items: center;
                padding: 12px 16px;
            }
            .history-controls .cbi-input-select {
                width: auto;
                min-width: 160px;
            }
            .history-card-body {
                padding: 16px;
                position: relative;
            }
            .history-legend {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding-right: 16px;
            }
            .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; }
            .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
            .legend-up { background-color: ${BANDIX_COLOR_UPLOAD}; }
            .legend-down { background-color: ${BANDIX_COLOR_DOWNLOAD}; }
            #history-canvas { width: 100%; height: 200px; display: block; } /* 变窄的高度 */
            
            /* 移动端优化 */
            @media (max-width: 768px) {
                .bandix-alert {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
                
                .bandix-alert > div:first-child {
                    width: 100%;
                }
                
                .bandix-alert #device-count {
                    width: 100%;
                    text-align: left;
                }
                
                #history-canvas { 
                    height: 300px; /* 移动端增加高度 */
                }
                .history-controls {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 8px;
                    padding: 12px;
                }
                .history-controls .cbi-input-select {
                    width: 100%;
                    min-width: 0;
                }
                .history-controls .form-label {
                    margin-bottom: 4px;
                }
                .history-legend {
                    margin-left: 0;
                    margin-top: 8px;
                    width: 100%;
                    justify-content: center;
                    padding-right: 0;
                }
                .history-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
                .history-card-body {
                    padding: 12px;
                }
                .device-card {
                    margin-left: 12px;
                    margin-right: 12px;
                }
                .history-tooltip {
                    width: calc(100vw - 32px);
                    max-width: 320px;
                    font-size: 0.75rem;
                    padding: 10px;
                }
                .history-tooltip .ht-kpis {
                    grid-template-columns: 1fr;
                    gap: 8px;
                }
                .history-tooltip .ht-kpi .ht-k-value {
                    font-size: 0.875rem;
                }
                #history-retention {
                    display: none !important;
                }
                #history-time-range {
                    display: none !important;
                }
                
                /* 移动端隐藏设备模式切换按钮 */
                .device-mode-group {
                    display: none !important;
                }
                
                /* 移动端设备列表卡片式布局 */
                .bandix-table {
                    display: none; /* 移动端隐藏表格 */
                }
                
                .device-list-cards {
                    display: block;
                }
                
                .device-card {
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 12px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }
                
                @media (prefers-color-scheme: dark) {
                    .device-card {
                        border-color: rgba(255, 255, 255, 0.15);
                    }
                }
                
                .device-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                }
                
                @media (prefers-color-scheme: dark) {
                    .device-card-header {
                        border-bottom-color: rgba(255, 255, 255, 0.15);
                    }
                }
                
                .device-card-name {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .device-card-name .device-status {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                    flex-shrink: 0;
                }
                
                .device-card-name .device-status.online {
                    background-color: #10b981;
                }
                
                .device-card-name .device-status.offline {
                    background-color: #9ca3af;
                }
                
                .device-card-ip {
                    font-size: 0.75rem;
                    opacity: 0.7;
                    margin-top: 4px;
                }
                
                .device-card-action {
                    flex-shrink: 0;
                }
                
                .device-card-action .cbi-button {
                    padding: 6px 12px;
                    font-size: 0.875rem;
                }
                
                .device-card-content {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 12px;
                }
                
                .device-card-section {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .device-card-section-label {
                    font-size: 0.75rem;
                    opacity: 0.7;
                    font-weight: 500;
                    margin-bottom: 4px;
                }
                
                .device-card-traffic {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .device-card-traffic-row {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.875rem;
                }
                
                /* LAN流量样式（移动端直接显示） */
                .device-card-lan {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(0, 0, 0, 0.1);
                }
                
                @media (prefers-color-scheme: dark) {
                    .device-card-lan {
                        border-top-color: rgba(255, 255, 255, 0.15);
                    }
                }
                
                /* 规则显示样式 */
                .device-card-rules {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(0, 0, 0, 0.1);
                }
                
                @media (prefers-color-scheme: dark) {
                    .device-card-rules {
                        border-top-color: rgba(255, 255, 255, 0.15);
                    }
                }
                
                .device-card-rules-content {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    padding: 8px 0;
                }
                
                .device-card-rules-empty {
                    font-size: 0.75rem;
                    opacity: 0.6;
                    padding: 4px 0;
                }
                
                .device-card-rules-count {
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: inherit;
                    margin-bottom: 2px;
                }
                
                .device-card-rules-active-time {
                    font-size: 0.8125rem;
                    color: #10b981;
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 8px;
                    line-height: 1.4;
                }
                
                .device-card-rules-limits {
                    font-size: 0.75rem;
                    opacity: 0.8;
                    margin-top: 2px;
                    word-break: break-word;
                }
                
                .device-card-rules-more {
                    font-size: 0.7rem;
                    opacity: 0.6;
                    margin-top: 2px;
                }
                
                .device-card-rules-inactive {
                    font-size: 0.8125rem;
                    opacity: 0.5;
                    margin-top: 4px;
                }
            }
            
            /* PC端显示表格，隐藏卡片 */
            @media (min-width: 769px) {
                .bandix-table {
                    display: table;
                }
                
                .device-list-cards {
                    display: none;
                }
            }
			.history-tooltip {
				position: fixed;
                display: none;
				width: 320px;
				box-sizing: border-box;
                padding: 12px;
                z-index: 10;
                pointer-events: none;
                font-size: 0.8125rem;
                line-height: 1.5;
                white-space: nowrap;
                background-color: rgba(255, 255, 255, 0.98);
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                color: #1f2937;
            }
            
            @media (prefers-color-scheme: dark) {
                .history-tooltip {
                    background-color: rgba(30, 30, 30, 0.98);
                    border-color: rgba(255, 255, 255, 0.2);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                    color: #e5e7eb;
                }
            }
            .history-tooltip .ht-title { font-weight: 700; margin-bottom: 6px; }
            .history-tooltip .ht-row { display: flex; justify-content: space-between; gap: 12px; }
            .history-tooltip .ht-key { opacity: 0.7; }
            .history-tooltip .ht-val { }
			.history-tooltip .ht-device { margin-top: 4px; margin-bottom: 6px; opacity: 0.7; font-size: 0.75rem; }
			/* 强调关键信息的排版 */
			.history-tooltip .ht-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 2px; margin-bottom: 6px; }
			.history-tooltip .ht-kpi .ht-k-label { opacity: 0.7; font-size: 0.75rem; }
			.history-tooltip .ht-kpi .ht-k-value { font-size: 1rem; font-weight: 700; }
			.history-tooltip .ht-kpi.down .ht-k-value { color: ${BANDIX_COLOR_DOWNLOAD}; }
			.history-tooltip .ht-kpi.up .ht-k-value { color: ${BANDIX_COLOR_UPLOAD}; }
			.history-tooltip .ht-divider { height: 1px; background-color: currentColor; opacity: 0.3; margin: 8px 0; }
			.history-tooltip .ht-section-title { font-weight: 600; font-size: 0.75rem; opacity: 0.7; margin: 4px 0 6px 0; }

			/* Traffic Timeline Tooltip - 使用与 History Tooltip 相同的样式 */
			.traffic-increments-tooltip .ht-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 2px; margin-bottom: 6px; }
			.traffic-increments-tooltip .ht-kpi .ht-k-label { opacity: 0.7; font-size: 0.75rem; }
			.traffic-increments-tooltip .ht-kpi .ht-k-value { font-size: 1rem; font-weight: 700; }
			.traffic-increments-tooltip .ht-kpi.down .ht-k-value { color: ${BANDIX_COLOR_DOWNLOAD}; }
			.traffic-increments-tooltip .ht-kpi.up .ht-k-value { color: ${BANDIX_COLOR_UPLOAD}; }
			.traffic-increments-tooltip .ht-divider { height: 1px; background-color: currentColor; opacity: 0.3; margin: 8px 0; }
			.traffic-increments-tooltip .ht-section-title { font-weight: 600; font-size: 0.75rem; opacity: 0.7; margin: 4px 0 6px 0; }
			.traffic-increments-tooltip .ht-row { display: flex; justify-content: space-between; gap: 12px; }
			.traffic-increments-tooltip .ht-key { opacity: 0.7; }
			.traffic-increments-tooltip .ht-val { }
			
			/* Schedule Rules Tooltip */
			.schedule-rules-tooltip {
				position: fixed;
				display: none;
				width: 360px;
				max-width: 90vw;
				box-sizing: border-box;
				padding: 12px;
				z-index: 10000;
				pointer-events: none;
				font-size: 0.8125rem;
				line-height: 1.5;
				background-color: rgba(255, 255, 255, 0.98);
				border: 1px solid rgba(0, 0, 0, 0.1);
				border-radius: 6px;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
				color: #1f2937;
			}
			
			@media (prefers-color-scheme: dark) {
				.schedule-rules-tooltip {
					background-color: rgba(30, 30, 30, 0.98);
					border-color: rgba(255, 255, 255, 0.2);
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
					color: #e5e7eb;
				}
			}
			
			.schedule-rules-tooltip .srt-title {
				font-weight: 700;
				margin-bottom: 8px;
				font-size: 0.875rem;
			}
			
			.schedule-rules-tooltip .srt-rule-item {
				padding: 8px 0;
				border-bottom: 1px solid rgba(0, 0, 0, 0.1);
			}
			
			@media (prefers-color-scheme: dark) {
				.schedule-rules-tooltip .srt-rule-item {
					border-bottom-color: rgba(255, 255, 255, 0.15);
				}
			}
			
			.schedule-rules-tooltip .srt-rule-item:last-child {
				border-bottom: none;
			}
			
			.schedule-rules-tooltip .srt-rule-time {
				font-weight: 600;
				margin-bottom: 4px;
				font-size: 0.75rem;
			}
			
			.schedule-rules-tooltip .srt-rule-days {
				font-size: 0.75rem;
				font-weight: 500;
				opacity: 0.7;
				margin-bottom: 4px;
			}
			
			.schedule-rules-tooltip .srt-rule-limits {
				font-size: 0.875rem;
				font-weight: 600;
				opacity: 0.8;
			}
			
			.schedule-rules-tooltip .srt-rule-limits .srt-arrow {
				font-size: 0.75rem;
				font-weight: bold;
			}
			
			.schedule-rules-info {
			}
			
			/* 统计区域样式 */
			.traffic-stats-container {
				display: flex;
				flex-direction: column;
				gap: 20px;
				margin-top: 16px;
			}
			
			.traffic-stats-section {
				padding: 16px;
				border: 1px solid rgba(0, 0, 0, 0.1);
				border-radius: 8px;
			}
			
			@media (prefers-color-scheme: dark) {
				.traffic-stats-section {
					border-color: rgba(255, 255, 255, 0.15);
				}
			}
			
			.traffic-stats-section h4 {
				margin: 0 0 16px 0;
				font-size: 1rem;
				font-weight: 600;
			}
			
			.usage-ranking-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
			}
			
			.usage-ranking-title {
				font-size: 1rem;
				font-weight: 600;
			}
			
			.usage-ranking-timerange {
				font-size: 0.8125rem;
				opacity: 0.6;
				font-weight: 400;
			}
			
			.usage-ranking-query {
				margin-bottom: 16px;
				padding: 16px;
				background-color: rgba(0, 0, 0, 0.02);
				border-radius: 8px;
			}
			
			@media (prefers-color-scheme: dark) {
				.usage-ranking-query {
					background-color: rgba(255, 255, 255, 0.03);
				}
			}
			
			.usage-ranking-date-range-row {
				display: flex;
				align-items: flex-end;
				gap: 16px;
				margin-bottom: 16px;
				flex-wrap: wrap;
			}
			
			.usage-ranking-date-picker-wrapper {
				display: flex;
				flex-direction: column;
				gap: 6px;
				flex: 1;
				min-width: 160px;
			}

			.usage-ranking-network-type-wrapper {
				display: flex;
				flex-direction: column;
				gap: 6px;
				flex: 0 0 auto;
				min-width: 140px;
			}

			.usage-ranking-network-label {
				font-size: 0.8125rem;
				font-weight: 500;
				opacity: 0.7;
				color: inherit;
			}


			.usage-ranking-date-label {
				font-size: 0.8125rem;
				font-weight: 500;
				opacity: 0.7;
				color: inherit;
			}
			
			.usage-ranking-query-presets {
				display: flex;
				gap: 8px;
				margin-bottom: 12px;
				flex-wrap: wrap;
			}
			
			
			.usage-ranking-custom-range {
				display: flex;
				align-items: center;
				gap: 12px;
				flex-wrap: wrap;
			}
			
			.usage-ranking-date-picker {
				position: relative;
			}
			
			
			.usage-ranking-date-separator {
				font-size: 1.25rem;
				opacity: 0.4;
				margin-bottom: 28px;
				font-weight: 300;
			}
			
			.usage-ranking-query-actions {
				display: flex;
				gap: 8px;
				margin-left: auto;
			}

			/* 查询按钮 loading 状态样式（避免与 LuCI/主题的 .loading 冲突） */
			.usage-ranking-query-btn.bandix-loading {
				position: relative;
				opacity: 0.7;
			}

			.usage-ranking-query-btn.bandix-loading::after {
				content: '';
				position: absolute;
				width: 14px;
				height: 14px;
				top: 50%;
				left: 50%;
				margin-left: -7px;
				margin-top: -7px;
				border: 2px solid rgba(59, 130, 246, 0.3);
				border-top-color: #3b82f6;
				border-radius: 50%;
				animation: spin 1s linear infinite;
			}

			.usage-ranking-query-btn.bandix-loading span {
				opacity: 0;
			}

			@media (prefers-color-scheme: dark) {
				.usage-ranking-query-btn.bandix-loading::after {
					border-color: rgba(96, 165, 250, 0.3);
					border-top-color: #60a5fa;
				}
			}
			
			
			.usage-ranking-query-reset {
				padding: 8px 12px;
				background-color: transparent;
				color: #6b7280;
				border: 1px solid rgba(0, 0, 0, 0.15);
				border-radius: 4px;
				cursor: pointer;
				font-size: 0.875rem;
				transition: all 0.2s ease;
			}
			
			.usage-ranking-query-reset:hover {
				background-color: rgba(0, 0, 0, 0.05);
				border-color: rgba(0, 0, 0, 0.25);
			}
			
			@media (prefers-color-scheme: dark) {
				.usage-ranking-query-reset {
					color: #9ca3af;
					border-color: rgba(255, 255, 255, 0.15);
				}
				
				.usage-ranking-query-reset:hover {
					background-color: rgba(255, 255, 255, 0.05);
					border-color: rgba(255, 255, 255, 0.25);
				}
			}
			
			.usage-ranking-timeline {
				margin-top: 12px;
				height: 4px;
				background-color: rgba(0, 0, 0, 0.1);
				border-radius: 2px;
				position: relative;
			}
			
			@media (prefers-color-scheme: dark) {
				.usage-ranking-timeline {
					background-color: rgba(255, 255, 255, 0.1);
				}
			}
			
			.usage-ranking-timeline-range {
				position: absolute;
				height: 100%;
				background-color: #3b82f6;
				border-radius: 2px;
				transition: all 0.3s ease;
			}
			
			.usage-ranking-list {
				display: flex;
				flex-direction: column;
				gap: 12px;
				max-height: 800px;
				overflow-y: auto;
				padding-right: 4px;
			}
			
			/* 滚动条样式 */
			.usage-ranking-list::-webkit-scrollbar {
				width: 6px;
			}
			
			.usage-ranking-list::-webkit-scrollbar-track {
				background: rgba(0, 0, 0, 0.05);
				border-radius: 3px;
			}
			
			.usage-ranking-list::-webkit-scrollbar-thumb {
				background: rgba(0, 0, 0, 0.2);
				border-radius: 3px;
			}
			
			.usage-ranking-list::-webkit-scrollbar-thumb:hover {
				background: rgba(0, 0, 0, 0.3);
			}
			
			@media (prefers-color-scheme: dark) {
				.usage-ranking-list::-webkit-scrollbar-track {
					background: rgba(255, 255, 255, 0.05);
				}
				
				.usage-ranking-list::-webkit-scrollbar-thumb {
					background: rgba(255, 255, 255, 0.2);
				}
				
				.usage-ranking-list::-webkit-scrollbar-thumb:hover {
					background: rgba(255, 255, 255, 0.3);
				}
			}
			
			.usage-ranking-controls {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-top: 12px;
				padding: 12px;
				background-color: rgba(0, 0, 0, 0.02);
				border-radius: 6px;
				font-size: 0.875rem;
			}
			
			@media (prefers-color-scheme: dark) {
				.usage-ranking-controls {
					background-color: rgba(255, 255, 255, 0.03);
				}
			}
			
			.usage-ranking-info-text {
				opacity: 0.6;
			}
			
			.usage-ranking-toggle-btn {
				padding: 6px 12px;
				background-color: rgba(59, 130, 246, 0.1);
				color: #3b82f6;
				border: 1px solid rgba(59, 130, 246, 0.2);
				border-radius: 4px;
				cursor: pointer;
				font-size: 0.875rem;
				font-weight: 500;
				transition: all 0.2s ease;
			}
			
			.usage-ranking-toggle-btn:hover {
				background-color: rgba(59, 130, 246, 0.15);
				border-color: rgba(59, 130, 246, 0.3);
			}
			
			@media (prefers-color-scheme: dark) {
				.usage-ranking-toggle-btn {
					background-color: rgba(59, 130, 246, 0.15);
					border-color: rgba(59, 130, 246, 0.25);
					color: #60a5fa;
				}
				
				.usage-ranking-toggle-btn:hover {
					background-color: rgba(59, 130, 246, 0.2);
					border-color: rgba(59, 130, 246, 0.35);
				}
			}
			
			.usage-ranking-item {
				position: relative;
				display: flex;
				align-items: center;
				gap: 12px;
				padding: 12px;
				border-radius: 8px;
				background-color: rgba(0, 0, 0, 0.02);
				border: 1px solid rgba(0, 0, 0, 0.06);
				transition: all 0.2s ease;
				overflow: hidden;
			}
			
			@media (prefers-color-scheme: dark) {
				.usage-ranking-item {
					background-color: rgba(255, 255, 255, 0.03);
					border-color: rgba(255, 255, 255, 0.08);
				}
			}
			
			.usage-ranking-item:hover {
				background-color: rgba(0, 0, 0, 0.04);
				border-color: rgba(0, 0, 0, 0.1);
				transform: translateY(-1px);
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
			}
			
			@media (prefers-color-scheme: dark) {
				.usage-ranking-item:hover {
					background-color: rgba(255, 255, 255, 0.05);
					border-color: rgba(255, 255, 255, 0.12);
					box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
				}
			}
			
			/* 背景进度条 */
			.usage-ranking-item::before {
				content: '';
				position: absolute;
				left: 0;
				top: 0;
				bottom: 0;
				width: var(--progress-width, 0%);
				background: linear-gradient(90deg, rgba(59, 130, 246, 0.18) 0%, rgba(59, 130, 246, 0.10) 100%);
				transition: width 0.3s ease;
				z-index: 0;
			}
			
			@media (prefers-color-scheme: dark) {
				.usage-ranking-item::before {
					background: linear-gradient(90deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 100%);
				}
			}
			
			.usage-ranking-item > * {
				position: relative;
				z-index: 1;
			}
			
			.usage-ranking-rank {
				display: flex;
				align-items: center;
				justify-content: center;
				min-width: 28px;
				height: 28px;
				font-weight: 700;
				font-size: 0.8125rem;
				border-radius: 6px;
				background-color: rgba(59, 130, 246, 0.1);
				color: #3b82f6;
			}
			
			@media (prefers-color-scheme: dark) {
				.usage-ranking-rank {
					background-color: rgba(59, 130, 246, 0.15);
				}
			}
			
			.usage-ranking-info {
				flex: 1;
				min-width: 0;
				display: flex;
				align-items: center;
				gap: 16px;
			}
			
			.usage-ranking-device {
				flex: 1;
				min-width: 0;
			}
			
			.usage-ranking-name {
				font-weight: 600;
				font-size: 0.9375rem;
				margin-bottom: 4px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			
			.usage-ranking-meta {
				display: flex;
				gap: 12px;
				font-size: 0.75rem;
				opacity: 0.5;
				font-family: monospace;
			}
			
			.usage-ranking-stats {
				display: flex;
				align-items: center;
				gap: 20px;
			}
			
			.usage-ranking-traffic {
				display: flex;
				align-items: center;
				gap: 12px;
			}
			
			.usage-ranking-traffic-item {
				display: inline-flex;
				align-items: center;
				gap: 4px;
				font-size: 0.875rem;
				font-weight: 500;
			}
			
			.usage-ranking-traffic-item.rx {
				color: ${BANDIX_COLOR_DOWNLOAD};
			}
			
			.usage-ranking-traffic-item.tx {
				color: ${BANDIX_COLOR_UPLOAD};
			}
			
			.usage-ranking-traffic-item.total {
				color: #6b7280;
				font-weight: 600;
			}
			
			@media (prefers-color-scheme: dark) {
				.usage-ranking-traffic-item.total {
					color: #9ca3af;
				}
			}
			
			.usage-ranking-traffic-arrow {
				font-weight: 700;
				font-size: 1rem;
			}
			
			.usage-ranking-percentage {
				font-size: 1.5rem;
				font-weight: 700;
				color: #3b82f6;
				min-width: 70px;
				text-align: right;
			}
			
			@media (prefers-color-scheme: dark) {
				.usage-ranking-percentage {
					color: #60a5fa;
				}
			}
			
			.traffic-increments-filters {
				display: flex;
				align-items: center;
				gap: 12px;
				margin-bottom: 16px;
				flex-wrap: wrap;
			}
			
			.traffic-increments-filter-group {
				display: flex;
				align-items: center;
				gap: 8px;
			}
			
			.traffic-increments-filter-label {
				font-size: 0.8125rem;
				opacity: 0.7;
				white-space: nowrap;
			}
			
			.traffic-increments-filters .cbi-input-select {
				min-width: 120px;
			}
			
			.traffic-increments-query {
				margin-bottom: 16px;
				padding: 16px;
				background-color: rgba(0, 0, 0, 0.02);
				border-radius: 8px;
			}
			
			@media (prefers-color-scheme: dark) {
				.traffic-increments-query {
					background-color: rgba(255, 255, 255, 0.03);
				}
			}
			
			
			.traffic-increments-chart {
				position: relative;
				width: 100%;
				height: 300px;
				cursor: pointer;
			}
			
			.traffic-increments-tooltip {
				position: absolute;
				background-color: rgba(0, 0, 0, 0.9);
				color: white;
				padding: 12px;
				border: 1px solid rgba(255, 255, 255, 0.2);
				border-radius: 6px;
				font-size: 0.8125rem;
				pointer-events: none;
				z-index: 1000;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
				display: none;
				min-width: 280px;
				max-width: 400px;
			}

			@media (prefers-color-scheme: dark) {
				.traffic-increments-tooltip {
					border-color: rgba(255, 255, 255, 0.3);
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
				}
			}

			.traffic-increments-tooltip-title {
				font-weight: 600;
				margin-bottom: 8px;
				border-bottom: 1px solid rgba(255, 255, 255, 0.2);
				padding-bottom: 4px;
				font-size: 0.875rem;
			}

			.traffic-increments-tooltip-section {
				margin-bottom: 8px;
			}

			.traffic-increments-tooltip-section:last-child {
				margin-bottom: 0;
			}

			.traffic-increments-tooltip-section-title {
				font-weight: 600;
				font-size: 0.75rem;
				text-transform: uppercase;
				letter-spacing: 0.5px;
				margin-bottom: 4px;
				color: rgba(255, 255, 255, 0.8);
				border-bottom: 1px solid rgba(255, 255, 255, 0.1);
				padding-bottom: 2px;
			}

			.traffic-increments-tooltip-item {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 8px;
				margin-bottom: 2px;
				font-size: 0.75rem;
			}

			.traffic-increments-tooltip-item:last-child {
				margin-bottom: 0;
			}

			.traffic-increments-tooltip-item-label {
				display: flex;
				align-items: center;
				gap: 6px;
				flex: 1;
			}

			.traffic-increments-tooltip-item-value {
				font-weight: 500;
				text-align: right;
			}

			.traffic-increments-tooltip-dot {
				width: 6px;
				height: 6px;
				border-radius: 50%;
				flex-shrink: 0;
			}

			.traffic-increments-tooltip-dot.rx {
				background-color: ${BANDIX_COLOR_DOWNLOAD};
			}

			.traffic-increments-tooltip-dot.tx {
				background-color: ${BANDIX_COLOR_UPLOAD};
			}

			.traffic-increments-tooltip-dot.wan {
				background-color: #8b5cf6;
			}

			.traffic-increments-tooltip-dot.lan {
				background-color: #10b981;
			}
			
			
			.traffic-increments-summary {
				display: grid;
				grid-template-columns: repeat(3, 1fr);
				gap: 12px;
				margin-top: 16px;
			}
			
			.traffic-increments-summary-item {
				text-align: center;
				padding: 12px;
				border-radius: 6px;
				background-color: rgba(0, 0, 0, 0.02);
			}
			
			@media (prefers-color-scheme: dark) {
				.traffic-increments-summary-item {
					background-color: rgba(255, 255, 255, 0.05);
				}
			}
			
			.traffic-increments-summary-label {
				font-size: 0.75rem;
				opacity: 0.7;
				margin-bottom: 4px;
			}
			
			.traffic-increments-summary-value {
				font-weight: 600;
				font-size: 0.875rem;
			}
			
			/* 统计区域头部和控制 */
			.traffic-stats-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 16px;
			}
			
			/* 图例 */
			.traffic-stats-legend {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 16px;
				margin-top: 12px;
				padding: 8px;
			}
			
			.traffic-stats-legend-item {
				display: flex;
				align-items: center;
				gap: 6px;
				font-size: 0.875rem;
			}
			
			.traffic-stats-legend-dot {
				width: 10px;
				height: 10px;
				border-radius: 50%;
				display: inline-block;
			}
			
			.traffic-stats-legend-dot.rx {
				background-color: ${BANDIX_COLOR_DOWNLOAD};
			}
			
			.traffic-stats-legend-dot.tx {
				background-color: ${BANDIX_COLOR_UPLOAD};
			}
			
			/* 移动端响应式样式 */
			@media (max-width: 768px) {
				/* Traffic Statistics 容器 */
				.traffic-stats-container {
					gap: 16px;
				}
				
				.traffic-stats-section {
					padding: 12px;
				}
				
				/* Header 布局 - 垂直排列 */
				.usage-ranking-header {
					flex-direction: column;
					align-items: flex-start;
					gap: 8px;
				}
				
				.usage-ranking-title {
					font-size: 0.9375rem;
				}
				
				.usage-ranking-timerange {
					font-size: 0.75rem;
					width: 100%;
				}
				
				/* 查询区域 */
				.usage-ranking-query {
					padding: 12px;
					margin-bottom: 12px;
				}
				
				/* 日期选择器区域 */
				.usage-ranking-date-range-row {
					flex-direction: column;
					gap: 12px;
					margin-bottom: 12px;
				}
				
				.usage-ranking-date-picker-wrapper {
					min-width: 100%;
				}
				
				.usage-ranking-date-label {
					font-size: 0.75rem;
				}
				
				.usage-ranking-date-separator {
					display: none;
				}

				/* 快捷按钮 */
				.usage-ranking-query-presets {
					gap: 6px;
					margin-bottom: 10px;
				}

				/* 查询操作按钮 */
				.usage-ranking-query-actions {
					width: 100%;
					margin-left: 0;
					justify-content: stretch;
				}
				
				/* 设备列表项 - 垂直布局 */
				.usage-ranking-item {
					flex-direction: column;
					align-items: flex-start;
					gap: 10px;
					padding: 10px;
				}
				
				.usage-ranking-rank {
					min-width: 24px;
					height: 24px;
					font-size: 0.75rem;
				}
				
				.usage-ranking-info {
					flex-direction: column;
					align-items: flex-start;
					gap: 8px;
					width: 100%;
				}
				
				.usage-ranking-device {
					width: 100%;
				}
				
				.usage-ranking-name {
					font-size: 0.875rem;
					margin-bottom: 3px;
				}
				
				.usage-ranking-meta {
					font-size: 0.6875rem;
					gap: 8px;
					flex-wrap: nowrap;
					display: flex;
					align-items: center;
					width: 100%;
					justify-content: space-between;
				}
				
				.usage-ranking-meta > span:first-child {
					flex: 0 1 auto;
					min-width: 0;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}
				
				.usage-ranking-meta > span:nth-child(2) {
					display: none;
				}
				
				.usage-ranking-meta > .usage-ranking-meta-total {
					font-size: 0.8125rem;
					font-weight: 600;
					color: #6b7280;
					margin-left: 8px;
					flex-shrink: 0;
				}
				
				@media (prefers-color-scheme: dark) {
					.usage-ranking-meta > .usage-ranking-meta-total {
						color: #9ca3af;
					}
				}
				
				.usage-ranking-stats {
					flex-direction: column;
					align-items: flex-start;
					gap: 8px;
					width: 100%;
				}
				
				.usage-ranking-traffic {
					flex-wrap: wrap;
					gap: 8px;
					width: 100%;
				}
				
				/* 隐藏移动端下的总量显示（因为已经在 meta 中显示） */
				.usage-ranking-traffic-item.total {
					display: none;
				}
				
				.usage-ranking-traffic-item {
					font-size: 0.8125rem;
				}
				
				.usage-ranking-traffic-arrow {
					font-size: 0.875rem;
				}
				
				.usage-ranking-percentage {
					font-size: 1.25rem;
					min-width: auto;
					text-align: left;
					width: 100%;
				}
				
				/* 控制按钮 */
				.usage-ranking-controls {
					flex-direction: column;
					gap: 8px;
					align-items: stretch;
				}
				
				.usage-ranking-info-text {
					font-size: 0.75rem;
					text-align: center;
				}
				
				.usage-ranking-toggle-btn {
					width: 100%;
					padding: 8px 12px;
					font-size: 0.8125rem;
				}
				
				/* Traffic Timeline 筛选器 */
				.traffic-increments-filters {
					flex-direction: column;
					align-items: stretch;
					gap: 10px;
					margin-bottom: 12px;
				}
				
				.traffic-increments-filter-group {
					flex-direction: column;
					align-items: stretch;
					gap: 6px;
				}
				
				.traffic-increments-filter-label {
					font-size: 0.75rem;
				}
				
				.traffic-increments-filters .cbi-input-select {
					width: 100%;
					min-width: auto;
					padding: 8px 10px;
					font-size: 0.8125rem;
				}
				
				/* Traffic Timeline 查询区域 */
				.traffic-increments-query {
					padding: 12px;
					margin-bottom: 12px;
				}
				
				/* Traffic Timeline 的日期选择器使用相同的 usage-ranking-* 类名，已在上面覆盖 */
				
				/* 图表 */
				.traffic-increments-chart {
					height: 250px;
				}
				
				/* 摘要卡片 */
				.traffic-increments-summary {
					grid-template-columns: 1fr;
					gap: 8px;
					margin-top: 12px;
				}
				
				.traffic-increments-summary-item {
					padding: 10px;
				}
				
				.traffic-increments-summary-label {
					font-size: 0.6875rem;
				}
				
				.traffic-increments-summary-value {
					font-size: 0.8125rem;
				}
				
				/* 图例 - 移动端隐藏 */
				.traffic-stats-legend {
					display: none;
				}
			}

        `;
            return transformPrefersDarkBlocks(css, scheme === 'dark');
        }

        // 添加现代化样式
        var initialScheme = getLuCiColorScheme();
        document.documentElement.setAttribute('data-bandix-theme', initialScheme);

        var oldStyle = document.getElementById('bandix-styles');
        if (oldStyle && oldStyle.parentNode) oldStyle.parentNode.removeChild(oldStyle);

        var style = E('style', { 'id': 'bandix-styles', 'data-bandix-scheme': initialScheme }, generateStyles(initialScheme));
        document.head.appendChild(style);

        var view = E('div', { 'class': 'bandix-container' }, [
            // 头部
            E('div', { 'class': 'bandix-header' }, [
                E('div', { 'class': 'bandix-title-wrapper' }, [
                    E('h1', { 'class': 'bandix-title' }, _('Bandix Traffic Monitor')),
                    E('div', { 'class': 'bandix-version-wrapper' }, [
                        E('div', { 'class': 'bandix-version-item' }, [
                            E('span', { 'class': 'bandix-version', 'id': 'bandix-luci-version' }, ''),
                        ]),
                        E('div', { 'class': 'bandix-version-item' }, [
                            E('span', { 'class': 'bandix-version', 'id': 'bandix-core-version' }, ''),
                        ]),
                        E('span', { 'class': 'bandix-update-badge', 'id': 'bandix-update-badge', 'style': 'display: none;' }, _('Update available'))
                    ])
                ])
            ]),

            // 警告提示（包含在线设备数）
            E('div', {
                'class': 'bandix-alert' + (getThemeType() === 'wide' ? ' wide-theme' : '')
            }, [
                E('div', { 'style': 'display: flex; align-items: center; gap: 8px;' }, [
                    E('span', { 'style': 'font-size: 1rem;' }, '⚠'),
                    E('span', {}, _('Rate limiting only applies to WAN traffic. Some LAN internal traffic may not be monitored due to hardware switching acceleration.'))
                ]),
                E('div', { 'class': 'bandix-badge', 'id': 'device-count' }, _('Online Devices') + ': 0 / 0')
            ]),

            // 统计卡片
            E('div', { 'class': 'stats-grid', 'id': 'stats-grid' }),

            // 实时流量趋势
            E('div', { 'class': 'cbi-section', 'id': 'history-card' }, [
                E('h3', { 'style': 'display: flex; align-items: center; justify-content: space-between;' }, [
                    E('span', {}, _('Realtime Traffic Trends')),
                    E('div', { 'class': 'history-legend' }, [
                        E('div', { 'class': 'legend-item' }, [
                            E('span', { 'class': 'legend-dot legend-up' }),
                            _('Upload Rate')
                        ]),
                        E('div', { 'class': 'legend-item' }, [
                            E('span', { 'class': 'legend-dot legend-down' }),
                            _('Download Rate')
                        ])
                    ])
                ]),
                E('div', { 'class': 'history-controls' }, [
                    E('label', { 'class': 'form-label', 'style': 'margin: 0;' }, _('Select Device')),
                    E('select', { 'class': 'cbi-input-select', 'id': 'history-device-select' }, [
                        E('option', { 'value': '' }, _('All Devices'))
                    ]),
                    E('label', { 'class': 'form-label', 'style': 'margin: 0;' }, _('Type')),
                    E('select', { 'class': 'cbi-input-select', 'id': 'history-type-select' }, [
                        E('option', { 'value': 'total' }, _('Total')),
                        E('option', { 'value': 'lan' }, _('LAN Traffic')),
                        E('option', { 'value': 'wan' }, _('WAN Traffic'))
                    ]),
                    E('span', { 'class': 'bandix-badge', 'id': 'history-zoom-level', 'style': 'margin-left: 16px; display: none;' }, ''),
                    E('span', { 'class': 'bandix-badge', 'id': 'history-time-range', 'style': 'margin-left: 16px; display: none;' }, ''),
                    E('span', { 'class': 'bandix-badge', 'id': 'history-retention', 'style': 'margin-left: auto;' }, '')
                ]),
                E('div', { 'class': 'history-card-body' }, [
                    E('canvas', { 'id': 'history-canvas', 'height': '240' }),
                    E('div', { 'class': 'history-tooltip', 'id': 'history-tooltip' })
                ])
            ]),

            // 主要内容卡片
            E('div', { 'class': 'cbi-section' }, [
                E('h3', { 'class': 'history-header', 'style': 'display: flex; align-items: center; justify-content: space-between;' }, [
                    E('span', {}, _('Device List')),
                    E('div', { 'class': 'device-toolbar' }, [
                        E('div', { 'class': 'device-group' }, [
                            E('span', { 'class': 'device-group-label' }, _('Period')),
                            E('select', { 'class': 'cbi-input-select', 'id': 'bandix_device_period_select' }, [
                                E('option', { 'value': 'all', 'selected': ((localStorage.getItem('bandix_device_period') || 'all') === 'all') ? 'selected' : null }, _('All')),
                                E('option', { 'value': 'today', 'selected': ((localStorage.getItem('bandix_device_period') || 'all') === 'today') ? 'selected' : null }, _('Today')),
                                E('option', { 'value': 'week', 'selected': ((localStorage.getItem('bandix_device_period') || 'all') === 'week') ? 'selected' : null }, _('This Week')),
                                E('option', { 'value': 'month', 'selected': ((localStorage.getItem('bandix_device_period') || 'all') === 'month') ? 'selected' : null }, _('This Month')),
                                E('option', { 'value': 'year', 'selected': ((localStorage.getItem('bandix_device_period') || 'all') === 'year') ? 'selected' : null }, _('This Year'))
                            ])
                        ]),
                        E('div', { 'class': 'device-group' }, [
                            E('span', { 'class': 'device-group-label' }, _('Display Mode')),
                            E('select', { 'class': 'cbi-input-select', 'id': 'bandix_device_mode_select' }, [
                                E('option', { 'value': 'simple', 'selected': (localStorage.getItem('bandix_device_mode') !== 'detailed') ? 'selected' : null }, _('Simple Mode')),
                                E('option', { 'value': 'detailed', 'selected': (localStorage.getItem('bandix_device_mode') === 'detailed') ? 'selected' : null }, _('Detailed Mode'))
                            ])
                        ]),
                        E('div', { 'class': 'device-group' }, [
                            E('span', { 'class': 'device-group-label' }, _('Global Rate Limit')),
                            E('span', { 'class': 'bandix-badge', 'id': 'bandix_whitelist_badge', 'style': 'cursor: pointer; user-select: none;' }, _('Loading...'))
                        ])
                    ])
                ]),
                E('div', { 'id': 'traffic-status' }, [
                    E('table', { 'class': 'bandix-table' }, [
                        E('thead', {}, [
                            E('tr', {}, [
                                E('th', {}, _('Device Info')),
                                E('th', {}, _('LAN Traffic')),
                                E('th', {}, _('WAN Traffic')),
                                E('th', {}, _('Rate Limit')),
                                E('th', {}, _('Actions'))
                            ])
                        ]),
                        E('tbody', {})
                    ])
                ])
            ]),

            // 统计区域
            E('div', { 'class': 'cbi-section' }, [
                E('h3', { 'class': 'traffic-stats-header' }, [
                    E('span', {}, _('Traffic Statistics'))
                ]),
                E('div', { 'id': 'traffic-statistics' }, [
                    E('div', { 'class': 'traffic-stats-container' }, [
                        // 设备用量排行区域
                        E('div', { 'class': 'traffic-stats-section' }, [
                            E('div', { 'class': 'usage-ranking-header' }, [
                                E('h4', { 'class': 'usage-ranking-title' }, [
                                    E('span', {}, _('Device Usage Ranking'))
                                ]),
                                E('span', { 'class': 'usage-ranking-timerange', 'id': 'usage-ranking-timerange' }, '')
                            ]),
                            E('div', { 'class': 'usage-ranking-query' }, [
                                E('div', { 'class': 'usage-ranking-date-range-row' }, [
                                    E('div', { 'class': 'usage-ranking-date-picker-wrapper' }, [
                                        E('label', { 'class': 'usage-ranking-date-label' }, _('Start Date')),
                                        E('div', { 'class': 'usage-ranking-date-picker', 'id': 'usage-ranking-start-picker' }, [
                                            E('input', {
                                                'type': 'date',
                                                'id': 'usage-ranking-start-date',
                                                'class': 'cbi-input-date'
                                            })
                                        ])
                                    ]),
                                    E('span', { 'class': 'usage-ranking-date-separator' }, '→'),
                                    E('div', { 'class': 'usage-ranking-date-picker-wrapper' }, [
                                        E('label', { 'class': 'usage-ranking-date-label' }, _('End Date')),
                                        E('div', { 'class': 'usage-ranking-date-picker', 'id': 'usage-ranking-end-picker' }, [
                                            E('input', {
                                                'type': 'date',
                                                'id': 'usage-ranking-end-date',
                                                'class': 'cbi-input-date'
                                            })
                                        ])
                                    ]),
                                    E('div', { 'class': 'usage-ranking-network-type-wrapper' }, [
                                        E('label', { 'class': 'usage-ranking-network-label' }, _('Network Type')),
                                        E('select', {
                                            'class': 'cbi-input-select',
                                            'id': 'usage-ranking-network-type'
                                        }, [
                                            E('option', { 'value': 'wan' }, _('WAN Traffic')),
                                            E('option', { 'value': 'lan' }, _('LAN Traffic')),
                                            E('option', { 'value': 'all' }, _('Total'))
                                        ])
                                    ]),
                                    E('div', { 'class': 'usage-ranking-query-actions' }, [
                                        E('button', {
                                            'class': 'cbi-button cbi-button-action usage-ranking-query-btn',
                                            'id': 'usage-ranking-query-btn'
                                        }, E('span', {}, _('Query'))),
                                        E('button', {
                                            'class': 'cbi-button cbi-button-reset',
                                            'id': 'usage-ranking-reset-btn'
                                        }, _('Reset'))
                                    ])
                                ]),
                                E('div', { 'class': 'usage-ranking-query-presets' }, [
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': 'today' }, _('Today')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': 'thisweek' }, _('This Week')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': 'lastweek' }, _('Last Week')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': 'thismonth' }, _('This Month')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': 'lastmonth' }, _('Last Month')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': '7days' }, _('Last 7 Days')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': '30days' }, _('Last 30 Days')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': '90days' }, _('Last 90 Days')),
                                    E('button', { 'class': 'cbi-button cbi-button-positive', 'data-preset': '1year' }, _('Last Year'))
                                ]),
                                E('div', { 'class': 'usage-ranking-timeline', 'id': 'usage-ranking-timeline' }, [
                                    E('div', { 'class': 'usage-ranking-timeline-range', 'id': 'usage-ranking-timeline-range' })
                                ])
                            ]),
                            E('div', { 'id': 'usage-ranking-container' }, [
                                E('div', { 'class': 'loading-state' }, _('Loading...'))
                            ])
                        ]),
                        // 时间序列图表区域
                        E('div', { 'class': 'traffic-stats-section' }, [
                            E('div', { 'class': 'usage-ranking-header' }, [
                                E('h4', { 'class': 'usage-ranking-title' }, [
                                    E('span', {}, _('Traffic Timeline'))
                                ]),
                                E('span', { 'class': 'usage-ranking-timerange', 'id': 'traffic-increments-timerange' }, '')
                            ]),
                            E('div', { 'class': 'traffic-increments-query' }, [
                                E('div', { 'class': 'usage-ranking-date-range-row' }, [
                                    E('div', { 'class': 'usage-ranking-date-picker-wrapper' }, [
                                        E('label', { 'class': 'usage-ranking-date-label' }, _('Start Date')),
                                        E('div', { 'class': 'usage-ranking-date-picker' }, [
                                            E('input', {
                                                'type': 'date',
                                                'id': 'traffic-increments-start-date',
                                                'class': 'cbi-input-date'
                                            })
                                        ])
                                    ]),
                                    E('span', { 'class': 'usage-ranking-date-separator' }, '→'),
                                    E('div', { 'class': 'usage-ranking-date-picker-wrapper' }, [
                                        E('label', { 'class': 'usage-ranking-date-label' }, _('End Date')),
                                        E('div', { 'class': 'usage-ranking-date-picker' }, [
                                            E('input', {
                                                'type': 'date',
                                                'id': 'traffic-increments-end-date',
                                                'class': 'cbi-input-date'
                                            })
                                        ])
                                    ]),
                                    E('div', { 'class': 'usage-ranking-network-type-wrapper' }, [
                                        E('label', { 'class': 'usage-ranking-network-label' }, _('Network Type')),
                                        E('select', {
                                            'class': 'cbi-input-select',
                                            'id': 'traffic-increments-network-type'
                                        }, [
                                            E('option', { 'value': 'wan' }, _('WAN Traffic')),
                                            E('option', { 'value': 'lan' }, _('LAN Traffic')),
                                            E('option', { 'value': 'all' }, _('Total'))
                                        ])
                                    ]),
                                    E('div', { 'class': 'usage-ranking-query-actions' }, [
                                        E('button', {
                                            'class': 'cbi-button cbi-button-action usage-ranking-query-btn',
                                            'id': 'traffic-increments-query-btn'
                                        }, E('span', {}, _('Query'))),
                                        E('button', {
                                            'class': 'cbi-button cbi-button-reset',
                                            'id': 'traffic-increments-reset-btn'
                                        }, _('Reset'))
                                    ])
                                ]),
                                E('div', { 'class': 'usage-ranking-query-presets' }, [
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': 'today' }, _('Today')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': 'thisweek' }, _('This Week')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': 'lastweek' }, _('Last Week')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': 'thismonth' }, _('This Month')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': 'lastmonth' }, _('Last Month')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': '7days' }, _('Last 7 Days')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': '30days' }, _('Last 30 Days')),
                                    E('button', { 'class': 'cbi-button cbi-button-neutral', 'data-preset': '90days' }, _('Last 90 Days')),
                                    E('button', { 'class': 'cbi-button cbi-button-positive', 'data-preset': '1year' }, _('Last Year'))
                                ]),
                                E('div', { 'class': 'usage-ranking-timeline', 'id': 'traffic-increments-timeline' }, [
                                    E('div', { 'class': 'usage-ranking-timeline-range', 'id': 'traffic-increments-timeline-range' })
                                ])
                            ]),
                            E('div', { 'class': 'traffic-increments-filters' }, [
                                E('div', { 'class': 'traffic-increments-filter-group' }, [
                                    E('label', { 'class': 'traffic-increments-filter-label' }, _('Aggregation:')),
										E('select', { 'class': 'cbi-input-select', 'id': 'traffic-increments-aggregation' }, [
                                        E('option', { 'value': 'hourly' }, _('Hourly')),
                                        E('option', { 'value': 'daily' }, _('Daily'))
                                    ])
                                ]),
                                E('div', { 'class': 'traffic-increments-filter-group' }, [
                                    E('label', { 'class': 'traffic-increments-filter-label' }, _('Device:')),
										E('select', { 'class': 'cbi-input-select', 'id': 'traffic-increments-mac' }, [
                                        E('option', { 'value': 'all' }, _('All Devices'))
                                    ])
                                ])
                            ]),
                            E('div', { 'id': 'traffic-increments-container' }, [
                                E('div', { 'class': 'loading-state' }, _('Loading...'))
                            ])
                        ])
                    ])
                ])
            ])
        ]);

        // 创建全局的 Schedule Rules Tooltip 元素
        var scheduleRulesTooltip = E('div', { 'class': 'schedule-rules-tooltip', 'id': 'schedule-rules-tooltip' });
        document.body.appendChild(scheduleRulesTooltip);

        // 构建规则列表的 HTML（用于 tooltip）
        function buildScheduleRulesTooltipHtml(allRules, activeRules, speedUnit) {
            if (!allRules || allRules.length === 0) {
                return '';
            }

            var lines = [];
            lines.push('<div class="srt-title">' + _('Schedule Rules') + ' (' + allRules.length + ')</div>');

            allRules.forEach(function (rule, index) {
                var startTime = rule.time_slot && rule.time_slot.start ? rule.time_slot.start : '';
                var endTime = rule.time_slot && rule.time_slot.end ? rule.time_slot.end : '';
                var days = rule.time_slot && rule.time_slot.days ? rule.time_slot.days : [];

                var dayNames = {
                    1: _('Mon'),
                    2: _('Tue'),
                    3: _('Wed'),
                    4: _('Thu'),
                    5: _('Fri'),
                    6: _('Sat'),
                    7: _('Sun')
                };
                var daysText = days.length > 0 ? days.map(function (d) { return dayNames[d] || d; }).join(', ') : '-';

                var uploadLimit = rule.wan_tx_rate_limit || 0;
                var downloadLimit = rule.wan_rx_rate_limit || 0;

                // 使用 isRuleActive 函数检查规则是否激活
                var isActive = isRuleActive(rule);

                // 箭头固定颜色（橙色和青色），样式与 WAN 字段一致
                var uploadLimitText = '<span class="srt-arrow" style="color: ' + BANDIX_COLOR_UPLOAD + ';">↑</span>' + (uploadLimit > 0 ? formatByterate(uploadLimit, speedUnit) : _('Unlimited'));
                var downloadLimitText = '<span class="srt-arrow" style="color: ' + BANDIX_COLOR_DOWNLOAD + ';">↓</span>' + (downloadLimit > 0 ? formatByterate(downloadLimit, speedUnit) : _('Unlimited'));

                var activeMark = isActive ? '<span style="color: #10b981; margin-right: 4px;">●</span>' : '';

                lines.push(
                    '<div class="srt-rule-item">' +
                    '<div class="srt-rule-time">' + activeMark + startTime + ' - ' + endTime + '</div>' +
                    '<div class="srt-rule-days">' + daysText + '</div>' +
                    '<div class="srt-rule-limits">' + uploadLimitText + ' ' + downloadLimitText + '</div>' +
                    '</div>'
                );
            });

            return lines.join('');
        }

        var devicePeriodInit = localStorage.getItem('bandix_device_period');
        if (!devicePeriodInit || !/^(today|week|month|year|all)$/.test(devicePeriodInit)) {
            localStorage.setItem('bandix_device_period', 'all');
        }

        var deviceModeSelect = view.querySelector('#bandix_device_mode_select');
        if (deviceModeSelect) {
            deviceModeSelect.addEventListener('change', function () {
                localStorage.setItem('bandix_device_mode', this.value);
                updateDeviceData();
            });
        }

        var devicePeriodSelect = view.querySelector('#bandix_device_period_select');
        if (devicePeriodSelect) {
            devicePeriodSelect.addEventListener('change', function () {
                localStorage.setItem('bandix_device_period', this.value);
                updateDeviceData();
            });
        }

        var whitelistBadge = view.querySelector('#bandix_whitelist_badge');
        if (whitelistBadge) {
            whitelistBadge.addEventListener('click', function () {
                showWhitelistModal();
            });
        }

        // 创建限速设置模态框
        var bandix_modal = E('div', { 'class': 'bandix_modal-overlay', 'id': 'rate-limit-bandix_modal' }, [
            E('div', { 'class': 'bandix_modal' }, [
                // E('div', { 'class': 'bandix_modal-header' }, [
                //     E('h3', { 'class': 'bandix_modal-title' }, _('Device Settings'))
                // ]),
                E('div', { 'class': 'bandix_modal-body' }, [
                    E('div', { 'class': 'device-summary', 'id': 'bandix_modal-device-summary' }),
                    E('div', { 'class': 'form-group' }, [
                        E('label', { 'class': 'form-label' }, _('Hostname')),
                        E('div', { 'style': 'display: flex; gap: 8px; align-items: center;' }, [
                            E('input', { 'type': 'text', 'class': 'form-input', 'id': 'device-hostname-input', 'placeholder': _('Please enter hostname'), 'style': 'flex: 1;' }),
                            E('button', { 'class': 'cbi-button cbi-button-positive', 'id': 'hostname-save-btn', 'style': 'flex-shrink: 0;' }, _('Save'))
                        ]),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, _('Set Hostname'))
                    ]),
                    // 定时限速
                    E('div', { 'id': 'schedule-limit-tab' }, [
                        // 描述和添加规则按钮
                        E('div', { 'style': 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;' }, [
                            E('span', { 'style': 'font-size: 0.875rem; opacity: 0.7;' }, _('Set rate limit rules for different time periods')),
                            E('button', {
                                'type': 'button',
                                'class': 'cbi-button cbi-button-action',
                                'id': 'schedule-add-rule-btn',
                                'style': 'display: flex; align-items: center; gap: 4px;'
                            }, [
                                E('span', {}, '+'),
                                _('Add Rule')
                            ])
                        ]),
                        // 规则列表区域
                        E('div', { 'class': 'schedule-rules-list', 'id': 'schedule-rules-list' })
                    ])
                ]),
                E('div', { 'class': 'bandix_modal-footer' }, [
                    E('button', { 'class': 'cbi-button cbi-button-reset', 'id': 'bandix_modal-close' }, _('Close'))
                ])
            ])
        ]);

        document.body.appendChild(bandix_modal);

        // 创建添加规则模态框
        var addRuleModal = E('div', { 'class': 'bandix_modal-overlay', 'id': 'add-rule-bandix_modal' }, [
            E('div', { 'class': 'bandix_modal' }, [
                E('div', { 'class': 'bandix_modal-header' }, [
                    E('h3', { 'class': 'bandix_modal-title' }, _('Add Schedule Rule'))
                ]),
                E('div', { 'class': 'bandix_modal-body' }, [
                    E('div', { 'class': 'form-group' }, [
                        E('label', { 'class': 'form-label' }, _('Time Slot')),
                        E('div', { 'class': 'schedule-time-row' }, [
                            E('input', { 'type': 'time', 'class': 'schedule-time-input', 'id': 'add-rule-start-time' }),
                            E('span', {}, ' - '),
                            E('input', { 'type': 'time', 'class': 'schedule-time-input', 'id': 'add-rule-end-time' })
                        ])
                    ]),
                    E('div', { 'class': 'form-group' }, [
                        E('label', { 'class': 'form-label' }, _('Days of Week')),
                        E('div', { 'class': 'schedule-days', 'id': 'add-rule-days' }, [
                            E('button', { 'type': 'button', 'class': 'schedule-day-btn', 'data-day': '1' }, _('Mon')),
                            E('button', { 'type': 'button', 'class': 'schedule-day-btn', 'data-day': '2' }, _('Tue')),
                            E('button', { 'type': 'button', 'class': 'schedule-day-btn', 'data-day': '3' }, _('Wed')),
                            E('button', { 'type': 'button', 'class': 'schedule-day-btn', 'data-day': '4' }, _('Thu')),
                            E('button', { 'type': 'button', 'class': 'schedule-day-btn', 'data-day': '5' }, _('Fri')),
                            E('button', { 'type': 'button', 'class': 'schedule-day-btn', 'data-day': '6' }, _('Sat')),
                            E('button', { 'type': 'button', 'class': 'schedule-day-btn', 'data-day': '7' }, _('Sun'))
                        ])
                    ]),
                    E('div', { 'class': 'form-group' }, [
                        E('label', { 'class': 'form-label' }, _('Upload Limit')),
                        E('div', { 'style': 'display: flex; gap: 8px;' }, [
                            E('input', { 'type': 'number', 'class': 'form-input', 'id': 'add-rule-upload-limit-value', 'min': '0', 'step': '1', 'placeholder': '0' }),
                            E('select', { 'class': 'cbi-input-select', 'id': 'add-rule-upload-limit-unit', 'style': 'width: 100px;' })
                        ]),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, _('Tip: Enter 0 for unlimited'))
                    ]),
                    E('div', { 'class': 'form-group', 'style': 'margin-bottom: 0;' }, [
                        E('label', { 'class': 'form-label' }, _('Download Limit')),
                        E('div', { 'style': 'display: flex; gap: 8px;' }, [
                            E('input', { 'type': 'number', 'class': 'form-input', 'id': 'add-rule-download-limit-value', 'min': '0', 'step': '1', 'placeholder': '0' }),
                            E('select', { 'class': 'cbi-input-select', 'id': 'add-rule-download-limit-unit', 'style': 'width: 100px;' })
                        ]),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, _('Tip: Enter 0 for unlimited'))
                    ])
                ]),
                E('div', { 'class': 'bandix_modal-footer' }, [
                    E('button', { 'class': 'cbi-button cbi-button-reset', 'id': 'add-rule-cancel' }, _('Cancel')),
                    E('button', { 'class': 'cbi-button cbi-button-positive', 'id': 'add-rule-save' }, _('Add'))
                ])
            ])
        ]);

        document.body.appendChild(addRuleModal);

        // 创建确认对话框
        var confirmDialog = E('div', { 'class': 'bandix_modal-overlay', 'id': 'confirm-dialog-bandix_modal' }, [
            E('div', { 'class': 'bandix_modal confirm-dialog' }, [
                E('div', { 'class': 'bandix_modal-body' }, [
                    E('div', { 'class': 'confirm-dialog-title', 'id': 'confirm-dialog-title' }, _('Confirm')),
                    E('div', { 'class': 'confirm-dialog-message', 'id': 'confirm-dialog-message' }, ''),
                    E('div', { 'class': 'confirm-dialog-footer' }, [
                        E('button', { 'class': 'cbi-button cbi-button-reset', 'id': 'confirm-dialog-cancel' }, _('Cancel')),
                        E('button', { 'class': 'cbi-button cbi-button-negative', 'id': 'confirm-dialog-confirm' }, _('Confirm'))
                    ])
                ])
            ])
        ]);

        document.body.appendChild(confirmDialog);

        // 创建白名单管理弹窗
        var whitelistModal = E('div', { 'class': 'whitelist_modal-overlay', 'id': 'whitelist_modal' }, [
            E('div', { 'class': 'whitelist_modal' }, [
                E('div', { 'class': 'whitelist_modal-header' }, [
                    E('h3', { 'class': 'whitelist_modal-title' }, _('Global Rate Limit'))
                ]),
                E('div', { 'class': 'whitelist_modal-body' }, [
                    E('div', { 'class': 'whitelist_modal-row' }, [
                        E('div', {}, [
                            E('div', { 'style': 'font-weight: 600;' }, _('Enabled')),
                            E('div', { 'class': 'whitelist_modal-hint' }, _('When enabled, all devices will be rate limited. Devices in the list are exempt (whitelist).'))
                        ]),
                        E('input', { 'type': 'checkbox', 'id': 'whitelist_enabled_checkbox' })
                    ]),
                    E('div', { 'style': 'margin-top: 14px; font-weight: 600;' }, _('Default Rate Limit')),
                    E('div', { 'class': 'form-group', 'style': 'margin-top: 12px;' }, [
                        E('label', { 'class': 'form-label' }, _('Upload Limit')),
                        E('div', { 'style': 'display: flex; gap: 8px;' }, [
                            E('input', { 'type': 'number', 'min': '0', 'step': '0.01', 'class': 'form-input', 'id': 'whitelist_default_wan_tx', 'placeholder': '0', 'style': 'flex: 1;' }),
                            E('select', { 'class': 'cbi-input-select', 'id': 'whitelist_default_wan_tx_unit', 'style': 'width: 110px; flex-shrink: 0;' }, [
                                E('option', { 'value': '1024' }, 'KB/s'),
                                E('option', { 'value': '1048576' }, 'MB/s'),
                                E('option', { 'value': '1073741824' }, 'GB/s'),
                                E('option', { 'value': '125' }, 'Kbps'),
                                E('option', { 'value': '125000' }, 'Mbps'),
                                E('option', { 'value': '125000000' }, 'Gbps')
                            ])
                        ]),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, _('Tip: Enter 0 for unlimited'))
                    ]),
                    E('div', { 'class': 'form-group', 'style': 'margin-top: 12px;' }, [
                        E('label', { 'class': 'form-label' }, _('Download Limit')),
                        E('div', { 'style': 'display: flex; gap: 8px;' }, [
                            E('input', { 'type': 'number', 'min': '0', 'step': '0.01', 'class': 'form-input', 'id': 'whitelist_default_wan_rx', 'placeholder': '0', 'style': 'flex: 1;' }),
                            E('select', { 'class': 'cbi-input-select', 'id': 'whitelist_default_wan_rx_unit', 'style': 'width: 110px; flex-shrink: 0;' }, [
                                E('option', { 'value': '1024' }, 'KB/s'),
                                E('option', { 'value': '1048576' }, 'MB/s'),
                                E('option', { 'value': '1073741824' }, 'GB/s'),
                                E('option', { 'value': '125' }, 'Kbps'),
                                E('option', { 'value': '125000' }, 'Mbps'),
                                E('option', { 'value': '125000000' }, 'Gbps')
                            ])
                        ]),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, _('Tip: Enter 0 for unlimited'))
                    ]),
                    E('div', { 'style': 'display: flex; justify-content: flex-end; margin-top: 8px;' }, [
                        E('button', { 'class': 'cbi-button cbi-button-action', 'id': 'whitelist_default_save_btn' }, _('Save'))
                    ]),
                    E('div', { 'style': 'margin-top: 8px; font-weight: 600;' }, _('Exempt Devices (Whitelist)')),
                    E('div', { 'class': 'whitelist_modal-list', 'id': 'whitelist_macs_list' }, [
                        E('div', { 'style': 'text-align: center; opacity: 0.7; padding: 12px 0;' }, _('Loading...'))
                    ]),
                    E('div', { 'style': 'margin-top: 14px;' }, [
                        E('div', { 'class': 'whitelist_modal-row', 'style': 'justify-content: flex-start;' }, [
                            E('select', { 'class': 'cbi-input-select', 'id': 'whitelist_device_select', 'style': 'width: 200px; flex-shrink: 0;' }, [
                                E('option', { 'value': '' }, _('Select Device'))
                            ]),
                            E('input', { 'type': 'text', 'class': 'form-input', 'id': 'whitelist_add_mac_input', 'placeholder': 'aa:bb:cc:dd:ee:ff', 'style': 'flex: 1;' }),
                            E('button', { 'class': 'cbi-button cbi-button-positive', 'id': 'whitelist_add_mac_btn', 'style': 'flex-shrink: 0;' }, _('Add'))
                        ]),
                        E('div', { 'class': 'whitelist_modal-error', 'id': 'whitelist_modal_error' }, '')
                    ])
                ]),
                E('div', { 'class': 'whitelist_modal-footer' }, [
                    E('button', { 'class': 'cbi-button cbi-button-reset', 'id': 'whitelist_modal_close' }, _('Close'))
                ])
            ])
        ]);

        document.body.appendChild(whitelistModal);

        // 确认对话框相关变量
        var confirmDialogCallback = null;

        // 显示确认对话框
        function showConfirmDialog(title, message, onConfirm) {
            document.getElementById('confirm-dialog-title').textContent = title || _('Confirm');
            document.getElementById('confirm-dialog-message').textContent = message || '';
            confirmDialogCallback = onConfirm;

            // 应用主题颜色
            try {
                var cbiSection = document.querySelector('.cbi-section');
                var targetElement = cbiSection || document.querySelector('.main') || document.body;
                var computedStyle = window.getComputedStyle(targetElement);
                var bgColor = computedStyle.backgroundColor;
                var textColor = computedStyle.color;

                var bandix_modalElement = confirmDialog.querySelector('.bandix_modal');

                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    var rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                    if (rgbaMatch) {
                        var r = parseInt(rgbaMatch[1]);
                        var g = parseInt(rgbaMatch[2]);
                        var b = parseInt(rgbaMatch[3]);
                        var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;

                        if (alpha < 0.95) {
                            bandix_modalElement.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                        } else {
                            bandix_modalElement.style.backgroundColor = bgColor;
                        }
                    } else {
                        bandix_modalElement.style.backgroundColor = bgColor;
                    }
                }

                if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
                    bandix_modalElement.style.color = textColor;
                }
            } catch (e) { }

            confirmDialog.classList.add('show');
        }

        // 隐藏确认对话框
        function hideConfirmDialog() {
            confirmDialog.classList.remove('show');
            confirmDialogCallback = null;
        }

        // 确认对话框事件处理
        document.getElementById('confirm-dialog-confirm').addEventListener('click', function () {
            if (confirmDialogCallback) {
                confirmDialogCallback();
            }
            hideConfirmDialog();
        });

        document.getElementById('confirm-dialog-cancel').addEventListener('click', hideConfirmDialog);

        // 点击确认对话框背景关闭
        confirmDialog.addEventListener('click', function (e) {
            if (e.target === this) {
                hideConfirmDialog();
            }
        });

        function parseWhitelistState(res) {
            if (!res) return { enabled: false, macs: [] };
            if (res.success === false || res.error) {
                throw new Error(res.error || _('Failed to load whitelist'));
            }
            if (res.status && res.status !== 'success') {
                throw new Error(res.error || _('Failed to load whitelist'));
            }
            var data = res.data ? res.data : res;
            return {
                enabled: !!data.enabled,
                macs: Array.isArray(data.macs) ? data.macs : [],
                default_wan_rx_rate_limit: data.default_wan_rx_rate_limit,
                default_wan_tx_rate_limit: data.default_wan_tx_rate_limit
            };
        }

        function pickUnit(bytes) {
            var n = parseFloat(bytes);
            if (isNaN(n) || n < 0) return { value: '', unit: '1024' };
            if (n === 0) return { value: 0, unit: '1024' };

            if (n >= 125000000 && Math.abs(n / 125000000 - Math.round(n / 125000000)) < 1e-9) return { value: Math.round(n / 125000000), unit: '125000000' };
            if (n >= 125000 && Math.abs(n / 125000 - Math.round(n / 125000)) < 1e-9) return { value: Math.round(n / 125000), unit: '125000' };
            if (n >= 125 && Math.abs(n / 125 - Math.round(n / 125)) < 1e-9) return { value: Math.round(n / 125), unit: '125' };

            if (n >= 1073741824) return { value: +(n / 1073741824).toFixed(2), unit: '1073741824' };
            if (n >= 1048576) return { value: +(n / 1048576).toFixed(2), unit: '1048576' };
            return { value: +(n / 1024).toFixed(2), unit: '1024' };
        }

        function unitToBytes(valStr, unitStr) {
            var v = parseFloat((valStr || '').trim());
            var u = parseFloat(unitStr);
            if (isNaN(v) || v < 0 || isNaN(u) || u <= 0) return null;
            return Math.round(v * u);
        }

        function getDeviceLabel(d) {
            var name = d && (d.hostname || d.name) ? (d.hostname || d.name) : '';
            var ip = d && d.ip ? d.ip : '';
            var mac = d && d.mac ? d.mac : '';
            var left = name || ip || mac || '';
            var right = mac && left !== mac ? (' ' + mac) : '';
            return (left + right).trim();
        }

        function populateWhitelistDeviceSelect() {
            var sel = document.getElementById('whitelist_device_select');
            if (!sel) return;

            var keep = sel.value;
            sel.innerHTML = '';
            sel.appendChild(E('option', { 'value': '' }, _('Select Device')));

            var devices = [];
            try { devices = (latestDevices && latestDevices.length) ? latestDevices : []; } catch (e) { devices = []; }
            if (!devices.length) {
                sel.value = '';
                return;
            }

            devices.slice().sort(function (a, b) {
                return getDeviceLabel(a).localeCompare(getDeviceLabel(b));
            }).forEach(function (d) {
                if (!d || !d.mac) return;
                sel.appendChild(E('option', { 'value': d.mac }, getDeviceLabel(d)));
            });

            sel.value = keep;
        }

        function setWhitelistError(msg) {
            var el = document.getElementById('whitelist_modal_error');
            if (!el) return;
            if (msg) {
                el.textContent = msg;
                el.style.display = 'block';
            } else {
                el.textContent = '';
                el.style.display = 'none';
            }
        }

        function updateWhitelistBadge(state) {
            var badge = view.querySelector('#bandix_whitelist_badge');
            if (!badge) return;
            if (!state) {
                badge.textContent = _('Unavailable');
                badge.style.backgroundColor = '';
                return;
            }
            var text = state.enabled ? _('Enabled') : _('Disabled');
            var count = (state.macs && state.macs.length) ? state.macs.length : 0;
            badge.textContent = text + ' (' + count + ')';
            badge.style.backgroundColor = state.enabled ? '#10b981' : '#6b7280';
            badge.style.color = '#fff';
        }

        function renderWhitelistList(macs) {
            var listEl = document.getElementById('whitelist_macs_list');
            if (!listEl) return;
            listEl.innerHTML = '';

            if (!macs || macs.length === 0) {
                listEl.appendChild(E('div', { 'style': 'text-align: center; opacity: 0.7; padding: 12px 0;' }, _('No devices')));
                return;
            }

            var deviceMap = {};
            try {
                (latestDevices || []).forEach(function (d) {
                    if (d && d.mac) deviceMap[d.mac] = d;
                });
            } catch (e) { deviceMap = {}; }

            macs.slice().sort().forEach(function (mac) {
                var d = deviceMap[mac];
                var hostname = d && d.hostname ? d.hostname : '';
                var ip = d && d.ip ? d.ip : '';
                var title = hostname || ip || mac;

                var item = E('div', { 'class': 'whitelist_modal-item' }, [
                    E('div', { 'style': 'display: flex; flex-direction: column; gap: 2px;' }, [
                        E('div', { 'style': 'font-weight: 600;' }, title),
                        E('div', { 'style': 'font-size: 0.75rem; opacity: 0.7;' }, [
                            ip ? (ip + ' · ') : '',
                            E('span', { 'class': 'whitelist_modal-mac' }, mac)
                        ])
                    ]),
                    E('button', { 'class': 'cbi-button cbi-button-negative', 'style': 'padding: 4px 10px;' }, _('Delete'))
                ]);

                item.querySelector('button').addEventListener('click', function () {
                    showConfirmDialog(
                        _('Delete'),
                        _('Remove this device from the list?'),
                        function () {
                            callDeleteRateLimitWhitelist(mac).then(function () {
                                return loadWhitelistModal();
                            }).then(function () {
                                return refreshWhitelistStatus();
                            }).catch(function (e) {
                                setWhitelistError(e && e.message ? e.message : _('Failed'));
                            });
                        }
                    );
                });

                listEl.appendChild(item);
            });
        }

        function loadWhitelistModal() {
            setWhitelistError('');
            var listEl = document.getElementById('whitelist_macs_list');
            if (listEl) listEl.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 12px 0;">' + _('Loading...') + '</div>';

            return callGetRateLimitWhitelist().then(function (res) {
                var state = parseWhitelistState(res);
                var checkbox = document.getElementById('whitelist_enabled_checkbox');
                if (checkbox) checkbox.checked = !!state.enabled;
                var rxEl = document.getElementById('whitelist_default_wan_rx');
                var txEl = document.getElementById('whitelist_default_wan_tx');
                var rxUnitEl = document.getElementById('whitelist_default_wan_rx_unit');
                var txUnitEl = document.getElementById('whitelist_default_wan_tx_unit');
                var rxPicked = pickUnit(state.default_wan_rx_rate_limit);
                var txPicked = pickUnit(state.default_wan_tx_rate_limit);
                if (rxEl) rxEl.value = (rxPicked.value !== '') ? String(rxPicked.value) : '';
                if (txEl) txEl.value = (txPicked.value !== '') ? String(txPicked.value) : '';
                if (rxUnitEl) rxUnitEl.value = rxPicked.unit;
                if (txUnitEl) txUnitEl.value = txPicked.unit;
                renderWhitelistList(state.macs);
                return state;
            }).catch(function (e) {
                var msg = (e && e.message) ? e.message : _('Failed to load whitelist');
                setWhitelistError(msg);
                if (listEl) listEl.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 12px 0;">' + _('Failed') + '</div>';
                return null;
            });
        }

        function refreshWhitelistStatus() {
            return callGetRateLimitWhitelist().then(function (res) {
                var state = parseWhitelistState(res);
                updateWhitelistBadge(state);
                return state;
            }).catch(function () {
                updateWhitelistBadge(null);
                return null;
            });
        }

        function showWhitelistModal() {
            whitelistModal.classList.add('show');
            populateWhitelistDeviceSelect();
            try {
                var sel = document.getElementById('whitelist_device_select');
                if (sel && !sel.__bandixBound) {
                    sel.addEventListener('change', function () {
                        var macInput = document.getElementById('whitelist_add_mac_input');
                        if (macInput && this.value) macInput.value = this.value;
                    });
                    sel.__bandixBound = true;
                }
            } catch (e) { }
            loadWhitelistModal();
        }

        function hideWhitelistModal() {
            whitelistModal.classList.remove('show');
            setWhitelistError('');
        }

        document.getElementById('whitelist_modal_close').addEventListener('click', hideWhitelistModal);

        document.getElementById('whitelist_enabled_checkbox').addEventListener('change', function () {
            var checkbox = this;
            checkbox.disabled = true;
            setWhitelistError('');
            callSetRateLimitWhitelistEnabled(checkbox.checked ? 1 : 0).then(function () {
                return loadWhitelistModal();
            }).then(function () {
                return refreshWhitelistStatus();
            }).catch(function (e) {
                setWhitelistError(e && e.message ? e.message : _('Failed'));
            }).finally(function () {
                checkbox.disabled = false;
            });
        });

        document.getElementById('whitelist_add_mac_btn').addEventListener('click', function () {
            var input = document.getElementById('whitelist_add_mac_input');
            if (!input) return;
            var sel = document.getElementById('whitelist_device_select');
            var mac = (input.value || '').trim();
            if (!mac && sel && sel.value) mac = sel.value;
            var macRe = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;
            if (!macRe.test(mac)) {
                setWhitelistError(_('Invalid MAC address'));
                return;
            }

            var btn = this;
            btn.disabled = true;
            setWhitelistError('');

            callAddRateLimitWhitelist(mac).then(function () {
                input.value = '';
                if (sel) sel.value = '';
                return loadWhitelistModal();
            }).then(function () {
                return refreshWhitelistStatus();
            }).catch(function (e) {
                setWhitelistError(e && e.message ? e.message : _('Failed'));
            }).finally(function () {
                btn.disabled = false;
            });
        });

        document.getElementById('whitelist_default_save_btn').addEventListener('click', function () {
            var rxEl = document.getElementById('whitelist_default_wan_rx');
            var txEl = document.getElementById('whitelist_default_wan_tx');
            var rxUnitEl = document.getElementById('whitelist_default_wan_rx_unit');
            var txUnitEl = document.getElementById('whitelist_default_wan_tx_unit');
            if (!rxEl || !txEl || !rxUnitEl || !txUnitEl) return;

            var rxBytes = unitToBytes(rxEl.value, rxUnitEl.value);
            var txBytes = unitToBytes(txEl.value, txUnitEl.value);
            if (rxBytes == null || txBytes == null) {
                setWhitelistError(_('Invalid value'));
                return;
            }

            var btn = this;
            btn.disabled = true;
            setWhitelistError('');

            callSetDefaultRateLimit(rxBytes, txBytes).then(function () {
                return loadWhitelistModal();
            }).then(function () {
                return refreshWhitelistStatus();
            }).catch(function (e) {
                setWhitelistError(e && e.message ? e.message : _('Failed'));
            }).finally(function () {
                btn.disabled = false;
            });
        });

        // 日期选择按钮事件处理（添加规则模态框）
        var addRuleDayButtons = addRuleModal.querySelectorAll('.schedule-day-btn');
        addRuleDayButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                this.classList.toggle('active');
            });
        });

        // 显示添加规则模态框
        function showAddRuleModal() {
            if (!currentDevice) return;

            var addRuleModalEl = document.getElementById('add-rule-bandix_modal');
            var speedUnit = uci.get('bandix', 'traffic', 'speed_unit') || 'bytes';

            // 动态填充单位选择器
            var uploadUnitSelect = document.getElementById('add-rule-upload-limit-unit');
            var downloadUnitSelect = document.getElementById('add-rule-download-limit-unit');

            uploadUnitSelect.innerHTML = '';
            downloadUnitSelect.innerHTML = '';

            if (speedUnit === 'bits') {
                uploadUnitSelect.appendChild(E('option', { 'value': '125' }, 'Kbps'));
                uploadUnitSelect.appendChild(E('option', { 'value': '125000' }, 'Mbps'));
                uploadUnitSelect.appendChild(E('option', { 'value': '125000000' }, 'Gbps'));

                downloadUnitSelect.appendChild(E('option', { 'value': '125' }, 'Kbps'));
                downloadUnitSelect.appendChild(E('option', { 'value': '125000' }, 'Mbps'));
                downloadUnitSelect.appendChild(E('option', { 'value': '125000000' }, 'Gbps'));
            } else {
                uploadUnitSelect.appendChild(E('option', { 'value': '1024' }, 'KB/s'));
                uploadUnitSelect.appendChild(E('option', { 'value': '1048576' }, 'MB/s'));
                uploadUnitSelect.appendChild(E('option', { 'value': '1073741824' }, 'GB/s'));

                downloadUnitSelect.appendChild(E('option', { 'value': '1024' }, 'KB/s'));
                downloadUnitSelect.appendChild(E('option', { 'value': '1048576' }, 'MB/s'));
                downloadUnitSelect.appendChild(E('option', { 'value': '1073741824' }, 'GB/s'));
            }

            // 重置表单
            resetAddRuleForm();

            // 应用主题颜色
            try {
                var cbiSection = document.querySelector('.cbi-section');
                var targetElement = cbiSection || document.querySelector('.main') || document.body;
                var computedStyle = window.getComputedStyle(targetElement);
                var bgColor = computedStyle.backgroundColor;
                var textColor = computedStyle.color;

                var bandix_modalElement = addRuleModalEl.querySelector('.bandix_modal');

                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    var rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                    if (rgbaMatch) {
                        var r = parseInt(rgbaMatch[1]);
                        var g = parseInt(rgbaMatch[2]);
                        var b = parseInt(rgbaMatch[3]);
                        var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;

                        if (alpha < 0.95) {
                            bandix_modalElement.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                        } else {
                            bandix_modalElement.style.backgroundColor = bgColor;
                        }
                    } else {
                        bandix_modalElement.style.backgroundColor = bgColor;
                    }
                }

                if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
                    bandix_modalElement.style.color = textColor;
                }
            } catch (e) { }

            // 显示模态框
            addRuleModalEl.classList.add('show');
        }

        // 隐藏添加规则模态框
        function hideAddRuleModal() {
            var addRuleModalEl = document.getElementById('add-rule-bandix_modal');
            addRuleModalEl.classList.remove('show');
        }

        // 重置添加规则表单
        function resetAddRuleForm() {
            document.getElementById('add-rule-start-time').value = '00:00';
            document.getElementById('add-rule-end-time').value = '23:59';
            // 默认选中所有7天 - 重新获取按钮引用
            var dayButtons = addRuleModal.querySelectorAll('.schedule-day-btn');
            dayButtons.forEach(function (btn) {
                btn.classList.add('active');
            });
            var speedUnit = uci.get('bandix', 'traffic', 'speed_unit') || 'bytes';
            document.getElementById('add-rule-upload-limit-value').value = '0';
            document.getElementById('add-rule-download-limit-value').value = '0';
            document.getElementById('add-rule-upload-limit-unit').value = speedUnit === 'bits' ? '125' : '1024';
            document.getElementById('add-rule-download-limit-unit').value = speedUnit === 'bits' ? '125' : '1024';
        }

        // 添加规则按钮事件处理
        var scheduleAddRuleBtn = document.getElementById('schedule-add-rule-btn');
        if (scheduleAddRuleBtn) {
            scheduleAddRuleBtn.addEventListener('click', function () {
                showAddRuleModal();
            });
        }

        // 添加规则模态框取消按钮
        document.getElementById('add-rule-cancel').addEventListener('click', hideAddRuleModal);

        // 保存定时限速规则（从添加规则模态框）
        document.getElementById('add-rule-save').addEventListener('click', function () {
            if (!currentDevice) {
                console.error('No current device selected');
                return;
            }

            var saveButton = this;
            var originalText = saveButton.textContent;

            // 显示加载状态
            saveButton.innerHTML = '<span class="loading-spinner"></span>' + _('Adding...');
            saveButton.classList.add('btn-loading');
            saveButton.disabled = true;

            var startTime = document.getElementById('add-rule-start-time').value;
            var endTime = document.getElementById('add-rule-end-time').value;
            // HTML5 time 输入不支持 24:00，将 23:59 转换为 24:00 表示全天
            if (endTime === '23:59') {
                endTime = '24:00';
            }

            // 重新获取日期按钮引用，确保获取最新状态
            var addRuleModalEl = document.getElementById('add-rule-bandix_modal');
            var dayButtons = addRuleModalEl.querySelectorAll('.schedule-day-btn');
            var selectedDays = [];
            dayButtons.forEach(function (btn) {
                if (btn.classList.contains('active')) {
                    selectedDays.push(parseInt(btn.getAttribute('data-day')));
                }
            });

            if (!startTime || !endTime) {
                ui.addNotification(null, E('p', {}, _('Please set time slot')), 'error');
                saveButton.innerHTML = originalText;
                saveButton.classList.remove('btn-loading');
                saveButton.disabled = false;
                return;
            }

            if (selectedDays.length === 0) {
                ui.addNotification(null, E('p', {}, _('Please select at least one day')), 'error');
                saveButton.innerHTML = originalText;
                saveButton.classList.remove('btn-loading');
                saveButton.disabled = false;
                return;
            }

            var speedUnit = uci.get('bandix', 'traffic', 'speed_unit') || 'bytes';
            var scheduleUploadValue = parseInt(document.getElementById('add-rule-upload-limit-value').value) || 0;
            var scheduleUploadUnit = parseInt(document.getElementById('add-rule-upload-limit-unit').value);
            var scheduleUploadLimit = scheduleUploadValue > 0 ? scheduleUploadValue * scheduleUploadUnit : 0;

            var scheduleDownloadValue = parseInt(document.getElementById('add-rule-download-limit-value').value) || 0;
            var scheduleDownloadUnit = parseInt(document.getElementById('add-rule-download-limit-unit').value);
            var scheduleDownloadLimit = scheduleDownloadValue > 0 ? scheduleDownloadValue * scheduleDownloadUnit : 0;

            console.log('Calling setScheduleLimit:', {
                mac: currentDevice.mac,
                startTime: startTime,
                endTime: endTime,
                days: selectedDays,
                uploadLimit: scheduleUploadLimit,
                downloadLimit: scheduleDownloadLimit
            });

            callSetScheduleLimit(
                currentDevice.mac,
                startTime,
                endTime,
                JSON.stringify(selectedDays),
                scheduleUploadLimit,
                scheduleDownloadLimit
            ).then(function (result) {
                console.log('setScheduleLimit result:', result);
                // 恢复按钮状态
                saveButton.innerHTML = originalText;
                saveButton.classList.remove('btn-loading');
                saveButton.disabled = false;

                // 隐藏模态框
                hideAddRuleModal();

                // 重置表单
                resetAddRuleForm();

                // 刷新规则列表
                loadScheduleRules();
                updateDeviceData();
            }).catch(function (error) {
                console.error('Failed to add schedule rule:', error);
                // 恢复按钮状态
                saveButton.innerHTML = originalText;
                saveButton.classList.remove('btn-loading');
                saveButton.disabled = false;
                ui.addNotification(null, E('p', {}, _('Failed to add schedule rule: ') + (error.message || error)), 'error');
            });
        });

        // 模态框事件处理
        var currentDevice = null;
        var showRateLimitModal;

        // 显示模态框
        showRateLimitModal = function (device) {
            currentDevice = device;
            var bandix_modal = document.getElementById('rate-limit-bandix_modal');
            var deviceSummary = document.getElementById('bandix_modal-device-summary');
            // 清空定时限速规则列表并加载
            var rulesList = document.getElementById('schedule-rules-list');
            if (rulesList) {
                rulesList.innerHTML = '<div class="schedule-rules-empty">' +
                    _('No scheduled rules yet, click "Add Rule" to start setting') +
                    '</div>';
            }

            // 加载定时限速规则列表
            loadScheduleRules();

            // 更新设备信息
            deviceSummary.innerHTML = E('div', {}, [
                E('div', { 'class': 'device-summary-name' }, device.hostname || device.ip),
                E('div', { 'class': 'device-summary-details' }, device.ip + ' (' + device.mac + ')')
            ]).innerHTML;

            // 设置当前hostname值
            document.getElementById('device-hostname-input').value = device.hostname || '';

            // 应用 cbi-section 的颜色到模态框
            try {
                // 优先从 cbi-section 获取颜色
                var cbiSection = document.querySelector('.cbi-section');
                var targetElement = cbiSection || document.querySelector('.main') || document.body;
                var computedStyle = window.getComputedStyle(targetElement);
                var bgColor = computedStyle.backgroundColor;
                var textColor = computedStyle.color;

                // 获取模态框元素
                var bandix_modalElement = bandix_modal.querySelector('.bandix_modal');

                // 确保背景色不透明
                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    var rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                    if (rgbaMatch) {
                        var r = parseInt(rgbaMatch[1]);
                        var g = parseInt(rgbaMatch[2]);
                        var b = parseInt(rgbaMatch[3]);
                        var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;

                        if (alpha < 0.95) {
                            bandix_modalElement.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                        } else {
                            bandix_modalElement.style.backgroundColor = bgColor;
                        }
                    } else {
                        bandix_modalElement.style.backgroundColor = bgColor;
                    }
                } else {
                    // 如果无法获取背景色，尝试从其他 cbi-section 获取
                    var allCbiSections = document.querySelectorAll('.cbi-section');
                    var foundBgColor = false;
                    for (var i = 0; i < allCbiSections.length; i++) {
                        var sectionStyle = window.getComputedStyle(allCbiSections[i]);
                        var sectionBg = sectionStyle.backgroundColor;
                        if (sectionBg && sectionBg !== 'rgba(0, 0, 0, 0)' && sectionBg !== 'transparent') {
                            var rgbaMatch = sectionBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                            if (rgbaMatch) {
                                var r = parseInt(rgbaMatch[1]);
                                var g = parseInt(rgbaMatch[2]);
                                var b = parseInt(rgbaMatch[3]);
                                var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
                                if (alpha < 0.95) {
                                    bandix_modalElement.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                                } else {
                                    bandix_modalElement.style.backgroundColor = sectionBg;
                                }
                            } else {
                                bandix_modalElement.style.backgroundColor = sectionBg;
                            }
                            foundBgColor = true;
                            break;
                        }
                    }
                    // 如果无法获取背景色，CSS 会通过媒体查询自动处理暗色模式
                    if (!foundBgColor) {
                        // 不设置背景色，让 CSS 媒体查询处理
                    }
                }

                // 应用文字颜色
                if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
                    bandix_modalElement.style.color = textColor;
                } else {
                    if (cbiSection) {
                        var sectionTextColor = window.getComputedStyle(cbiSection).color;
                        if (sectionTextColor && sectionTextColor !== 'rgba(0, 0, 0, 0)') {
                            bandix_modalElement.style.color = sectionTextColor;
                        }
                    }
                }
            } catch (e) {
                // 如果出错，CSS 会通过媒体查询自动处理暗色模式
                // 不设置样式，让 CSS 处理
            }

            // 显示模态框并添加动画
            bandix_modal.classList.add('show');
        }

        // 隐藏模态框
        function hideRateLimitModal() {
            var bandix_modal = document.getElementById('rate-limit-bandix_modal');
            bandix_modal.classList.remove('show');

            // 等待动画完成后清理
            setTimeout(function () {
                currentDevice = null;
            }, 300);
        }

        // 加载定时限速规则列表
        function loadScheduleRules() {
            if (!currentDevice) return;

            var rulesList = document.getElementById('schedule-rules-list');
            if (!rulesList) return;

            rulesList.innerHTML = '<div style="text-align: center; padding: 20px; opacity: 0.6; font-size: 0.875rem;">' + _('Loading...') + '</div>';

            callGetScheduleLimits().then(function (res) {
                // 检查响应格式
                if (!res) {
                    rulesList.innerHTML = '<div style="text-align: center; padding: 20px; opacity: 0.6; font-size: 0.875rem;">' + _('No schedule rules') + '</div>';
                    return;
                }

                // 检查是否有错误
                if (res.success === false || res.error) {
                    var errorMsg = res.error || _('Failed to load schedule rules');
                    rulesList.innerHTML = '<div style="text-align: center; padding: 20px; opacity: 0.6; font-size: 0.875rem; color: #ef4444;">' + errorMsg + '</div>';
                    return;
                }

                // 检查数据格式
                var limits = [];
                if (res.data && res.data.limits && Array.isArray(res.data.limits)) {
                    limits = res.data.limits;
                } else if (Array.isArray(res.limits)) {
                    // 兼容不同的响应格式
                    limits = res.limits;
                } else if (Array.isArray(res)) {
                    // 如果直接返回数组
                    limits = res;
                }

                var speedUnit = uci.get('bandix', 'traffic', 'speed_unit') || 'bytes';

                // 过滤出当前设备的规则
                var deviceRules = limits.filter(function (rule) {
                    return rule && rule.mac === currentDevice.mac;
                });

                // 清空列表
                rulesList.innerHTML = '';

                if (deviceRules.length === 0) {
                    rulesList.innerHTML = '<div class="schedule-rules-empty">' +
                        _('No scheduled rules yet, click "Add Rule" to start setting') +
                        '</div>';
                    return;
                }

                // 显示所有规则（支持多个规则）
                deviceRules.forEach(function (rule) {
                    var daysText = '';
                    // days 范围是 1-7 (Monday-Sunday)
                    var dayNames = {
                        1: _('Mon'),
                        2: _('Tue'),
                        3: _('Wed'),
                        4: _('Thu'),
                        5: _('Fri'),
                        6: _('Sat'),
                        7: _('Sun')
                    };
                    if (rule.time_slot && rule.time_slot.days && Array.isArray(rule.time_slot.days)) {
                        daysText = rule.time_slot.days.map(function (d) { return dayNames[d] || d; }).join(', ');
                    }

                    var startTime = rule.time_slot && rule.time_slot.start ? rule.time_slot.start : '';
                    var endTime = rule.time_slot && rule.time_slot.end ? rule.time_slot.end : '';
                    var uploadLimit = rule.wan_tx_rate_limit || 0;
                    var downloadLimit = rule.wan_rx_rate_limit || 0;

                    var ruleItem = E('div', { 'class': 'schedule-rule-item' }, [
                        E('div', { 'class': 'schedule-rule-info' }, [
                            E('div', { 'class': 'schedule-rule-time' }, startTime + ' - ' + endTime),
                            E('div', { 'class': 'schedule-rule-days' }, daysText),
                            E('div', { 'class': 'schedule-rule-limits' },
                                '↑ ' + formatByterate(uploadLimit, speedUnit) +
                                ' / ↓ ' + formatByterate(downloadLimit, speedUnit)
                            )
                        ]),
                        E('button', {
                            'class': 'schedule-rule-delete',
                            'title': _('Delete')
                        }, _('Delete'))
                    ]);

                    ruleItem.querySelector('.schedule-rule-delete').addEventListener('click', function () {
                        showConfirmDialog(
                            _('Delete Schedule Rule'),
                            _('Are you sure you want to delete this schedule rule?'),
                            function () {
                                var days = rule.time_slot && rule.time_slot.days ? JSON.stringify(rule.time_slot.days) : '[]';
                                callDeleteScheduleLimit(
                                    rule.mac,
                                    startTime,
                                    endTime,
                                    days
                                ).then(function () {
                                    loadScheduleRules();
                                    updateDeviceData();
                                }).catch(function (error) {
                                    ui.addNotification(null, E('p', {}, _('Failed to delete schedule rule')), 'error');
                                });
                            }
                        );
                    });

                    rulesList.appendChild(ruleItem);
                });
            }).catch(function (error) {
                console.error('Failed to load schedule rules:', error);
                var errorMsg = _('Failed to load schedule rules');
                if (error && error.message) {
                    errorMsg += ': ' + error.message;
                }
                rulesList.innerHTML = '<div style="text-align: center; padding: 20px; opacity: 0.6; font-size: 0.875rem; color: #ef4444;">' + errorMsg + '</div>';
            });
        }

        // 保存 hostname
        function saveHostname() {
            if (!currentDevice) return;

            var saveButton = document.getElementById('hostname-save-btn');
            var originalText = saveButton.textContent;

            // 获取hostname值
            var newHostname = document.getElementById('device-hostname-input').value.trim();

            // 如果hostname没有变化，不需要保存
            if (newHostname === (currentDevice.hostname || '')) {
                return;
            }

            // 显示加载状态
            saveButton.innerHTML = '<span class="loading-spinner"></span>' + _('Saving...');
            saveButton.classList.add('btn-loading');
            saveButton.disabled = true;

            callSetHostname(currentDevice.mac, newHostname).then(function (result) {
                // 恢复按钮状态
                saveButton.innerHTML = originalText;
                saveButton.classList.remove('btn-loading');
                saveButton.disabled = false;

                // 更新当前设备信息
                currentDevice.hostname = newHostname;

                // 刷新设备数据
                updateDeviceData();
            }).catch(function (error) {
                // 恢复按钮状态
                saveButton.innerHTML = originalText;
                saveButton.classList.remove('btn-loading');
                saveButton.disabled = false;
                ui.addNotification(null, E('p', {}, _('Failed to set hostname')), 'error');
            });
        }

        // 绑定 hostname 保存按钮事件
        document.getElementById('hostname-save-btn').addEventListener('click', saveHostname);

        // 绑定关闭按钮事件
        document.getElementById('bandix_modal-close').addEventListener('click', hideRateLimitModal);

        // 历史趋势：状态与工具
        var latestDevices = [];
        var lastHistoryData = null; // 最近一次拉取的原始 metrics 数据
        var isHistoryLoading = false; // 防止轮询重入

        // 定时限速规则：全局存储
        var allScheduleRules = []; // 存储所有设备的定时限速规则
        var isScheduleRulesLoading = false; // 防止轮询重入

        // 获取所有定时限速规则
        function fetchAllScheduleRules() {
            if (isScheduleRulesLoading) return Promise.resolve();
            isScheduleRulesLoading = true;

            return callGetScheduleLimits().then(function (res) {
                isScheduleRulesLoading = false;

                if (!res) {
                    allScheduleRules = [];
                    return;
                }

                // 检查是否有错误
                if (res.success === false || res.error) {
                    allScheduleRules = [];
                    return;
                }

                // 检查数据格式
                var limits = [];
                if (res.data && res.data.limits && Array.isArray(res.data.limits)) {
                    limits = res.data.limits;
                } else if (Array.isArray(res.limits)) {
                    limits = res.limits;
                } else if (Array.isArray(res)) {
                    limits = res;
                }

                allScheduleRules = limits || [];
            }).catch(function (error) {
                isScheduleRulesLoading = false;
                console.error('Failed to fetch schedule rules:', error);
                allScheduleRules = [];
            });
        }

        // 判断规则是否在当前时间生效
        function isRuleActive(rule) {
            if (!rule || !rule.time_slot) return false;

            var now = new Date();
            var currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
            // 转换为 1-7 (Monday-Sunday)
            var dayOfWeek = currentDay === 0 ? 7 : currentDay;

            // 检查是否在规则指定的日期中
            var days = rule.time_slot.days || [];
            if (!Array.isArray(days) || days.length === 0) return false;
            if (days.indexOf(dayOfWeek) === -1) return false;

            // 获取当前时间（HH:MM格式）
            var currentTime = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
            var startTime = rule.time_slot.start || '';
            var endTime = rule.time_slot.end || '';

            if (!startTime || !endTime) return false;

            // 处理 24:00 的情况
            if (endTime === '24:00') {
                endTime = '23:59';
            }

            // 比较时间
            if (startTime <= endTime) {
                // 正常情况：开始时间 <= 结束时间
                return currentTime >= startTime && currentTime <= endTime;
            } else {
                // 跨天情况：开始时间 > 结束时间（例如 22:00 - 06:00）
                return currentTime >= startTime || currentTime <= endTime;
            }
        }

        // 获取设备当前生效的规则
        function getActiveRulesForDevice(mac) {
            if (!allScheduleRules || allScheduleRules.length === 0) return [];

            return allScheduleRules.filter(function (rule) {
                return rule && rule.mac === mac && isRuleActive(rule);
            });
        }

        // 合并多个生效规则的限制值
        // 返回合并后的上传和下载限制（取所有规则中非零的最小值）
        function mergeActiveRulesLimits(activeRules) {
            if (!activeRules || activeRules.length === 0) {
                return { uploadLimit: 0, downloadLimit: 0 };
            }

            var uploadLimits = [];
            var downloadLimits = [];

            activeRules.forEach(function (rule) {
                var uploadLimit = rule.wan_tx_rate_limit || 0;
                var downloadLimit = rule.wan_rx_rate_limit || 0;

                // 只收集非零的限制值
                if (uploadLimit > 0) {
                    uploadLimits.push(uploadLimit);
                }
                if (downloadLimit > 0) {
                    downloadLimits.push(downloadLimit);
                }
            });

            // 取最小值（如果有多个规则都有限制，取最严格的限制）
            var mergedUploadLimit = uploadLimits.length > 0 ? Math.min.apply(Math, uploadLimits) : 0;
            var mergedDownloadLimit = downloadLimits.length > 0 ? Math.min.apply(Math, downloadLimits) : 0;

            return {
                uploadLimit: mergedUploadLimit,
                downloadLimit: mergedDownloadLimit
            };
        }

        // 获取多个规则的时间段显示文本
        // 如果所有规则的时间段相同，显示时间段；如果不同，显示"多个时间段"
        function getTimeSlotDisplayText(activeRules) {
            if (!activeRules || activeRules.length === 0) {
                return '';
            }

            if (activeRules.length === 1) {
                // 单个规则，直接显示时间段
                var rule = activeRules[0];
                var startTime = rule.time_slot && rule.time_slot.start ? rule.time_slot.start : '';
                var endTime = rule.time_slot && rule.time_slot.end ? rule.time_slot.end : '';
                return startTime + '-' + endTime;
            }

            // 多个规则，检查时间段是否相同
            var firstRule = activeRules[0];
            var firstStartTime = firstRule.time_slot && firstRule.time_slot.start ? firstRule.time_slot.start : '';
            var firstEndTime = firstRule.time_slot && firstRule.time_slot.end ? firstRule.time_slot.end : '';

            var allSame = true;
            for (var i = 1; i < activeRules.length; i++) {
                var rule = activeRules[i];
                var startTime = rule.time_slot && rule.time_slot.start ? rule.time_slot.start : '';
                var endTime = rule.time_slot && rule.time_slot.end ? rule.time_slot.end : '';

                if (startTime !== firstStartTime || endTime !== firstEndTime) {
                    allSame = false;
                    break;
                }
            }

            if (allSame) {
                // 所有规则时间段相同，显示时间段和规则数量
                return firstStartTime + '-' + firstEndTime + ' (' + activeRules.length + ' ' + _('rules') + ')';
            } else {
                // 时间段不同，显示"多个时间段"
                return _('Multiple time slots') + ' (' + activeRules.length + ' ' + _('rules') + ')';
            }
        }

        // 排序状态管理
        var currentSortBy = localStorage.getItem('bandix_sort_by') || 'online'; // 默认按在线状态排序
        var currentSortOrder = localStorage.getItem('bandix_sort_order') === 'true'; // false = 降序, true = 升序
        // 当鼠标悬停在历史图表上时，置为 true，轮询将暂停刷新（实现"鼠标在趋势图上时不自动滚动"）
        var historyHover = false;
        // 鼠标悬停时的索引（独立于 canvas.__bandixChart，避免重绘覆盖问题）
        var historyHoverIndex = null;
        // 缩放功能相关变量
        var zoomEnabled = false; // 缩放是否启用
        var zoomScale = 1; // 缩放比例
        var zoomOffsetX = 0; // X轴偏移
        var zoomTimer = null; // 延迟启用缩放的计时器

        function updateDeviceOptions(devices) {
            var select = document.getElementById('history-device-select');
            if (!select) return;

            // 对设备列表进行排序：在线设备在前，离线设备在后，然后按IP地址从小到大排序
            var sortedDevices = devices.slice().sort(function (a, b) {
                var aOnline = isDeviceOnline(a);
                var bOnline = isDeviceOnline(b);

                // 首先按在线状态排序：在线设备在前
                if (aOnline && !bOnline) return -1;
                if (!aOnline && bOnline) return 1;

                // 在线状态相同时，按IP地址排序
                var aIp = a.ip || '';
                var bIp = b.ip || '';

                // 将IP地址转换为数字进行比较
                var aIpParts = aIp.split('.').map(function (part) { return parseInt(part) || 0; });
                var bIpParts = bIp.split('.').map(function (part) { return parseInt(part) || 0; });

                // 逐段比较IP地址
                for (var i = 0; i < 4; i++) {
                    var aPart = aIpParts[i] || 0;
                    var bPart = bIpParts[i] || 0;
                    if (aPart !== bPart) {
                        return aPart - bPart;
                    }
                }

                // IP地址相同时，按MAC地址排序
                return (a.mac || '').localeCompare(b.mac || '');
            });

            // 对比是否需要更新
            var currentValues = Array.from(select.options).map(o => o.value);
            var desiredValues = [''].concat(sortedDevices.map(d => d.mac));
            var same = currentValues.length === desiredValues.length && currentValues.every((v, i) => v === desiredValues[i]);
            if (same) return;

            var prev = select.value;
            // 重建选项
            select.innerHTML = '';
            select.appendChild(E('option', { 'value': '' }, _('All Devices')));
            sortedDevices.forEach(function (d) {
                var label = (d.hostname || d.ip || d.mac || '-') + (d.ip ? ' (' + d.ip + ')' : '') + (d.mac ? ' [' + d.mac + ']' : '');
                select.appendChild(E('option', { 'value': d.mac }, label));
            });
            // 尽量保留之前选择
            if (desiredValues.indexOf(prev) !== -1) select.value = prev;
        }

        function getTypeKeys(type) {
            if (type === 'lan') return { up: 'lan_tx_rate', down: 'lan_rx_rate' };
            if (type === 'wan') return { up: 'wan_tx_rate', down: 'wan_rx_rate' };
            return { up: 'total_tx_rate', down: 'total_rx_rate' };
        }

        // 历史图表使用实时数据

        function fetchMetricsData(mac) {
            // 通过 ubus RPC 获取，避免跨域与鉴权问题
            return callGetMetrics(mac || '').then(function (res) { return res || { metrics: [] }; });
        }

        // 将数组数组格式转换为对象数组格式（实时数据格式：13个字段）
        // 输入格式: [[ts_ms, total_rx_rate, total_tx_rate, lan_rx_rate, lan_tx_rate, wan_rx_rate, wan_tx_rate, total_rx_bytes, total_tx_bytes, lan_rx_bytes, lan_tx_bytes, wan_rx_bytes, wan_tx_bytes], ...]
        // 输出格式: [{ts_ms, total_rx_rate, total_tx_rate, ...}, ...]
        function convertMetricsArrayToObjects(metricsArray) {
            if (!Array.isArray(metricsArray)) {
                return [];
            }

            return metricsArray.map(function (arr) {
                // 实时数据格式（13个字段）
                return {
                    ts_ms: arr[0] || 0,
                    total_rx_rate: arr[1] || 0,
                    total_tx_rate: arr[2] || 0,
                    lan_rx_rate: arr[3] || 0,
                    lan_tx_rate: arr[4] || 0,
                    wan_rx_rate: arr[5] || 0,
                    wan_tx_rate: arr[6] || 0,
                    total_rx_bytes: arr[7] || 0,
                    total_tx_bytes: arr[8] || 0,
                    lan_rx_bytes: arr[9] || 0,
                    lan_tx_bytes: arr[10] || 0,
                    wan_rx_bytes: arr[11] || 0,
                    wan_tx_bytes: arr[12] || 0,
                    is_aggregated: false
                };
            }).filter(function (item) { return item !== null; });
        }

        // 辅助函数：使用当前缩放设置绘制图表
        function drawHistoryChartWithZoom(canvas, labels, upSeries, downSeries) {
            drawHistoryChart(canvas, labels, upSeries, downSeries, zoomScale, zoomOffsetX);
        }

        // 更新缩放倍率显示
        function updateZoomLevelDisplay() {
            var zoomLevelElement = document.getElementById('history-zoom-level');
            if (!zoomLevelElement) return;

            // 如果是窄主题，隐藏 zoom 显示
            var themeType = getThemeType();
            if (themeType === 'narrow') {
                zoomLevelElement.style.display = 'none';
                return;
            }

            if (zoomScale <= 1) {
                zoomLevelElement.style.display = 'none';
            } else {
                zoomLevelElement.style.display = 'inline-block';
                zoomLevelElement.textContent = _('Zoom') + ': ' + zoomScale.toFixed(1) + 'x';
            }
        }

        function drawHistoryChart(canvas, labels, upSeries, downSeries, scale, offsetX) {
            if (!canvas) return;

            // 缩放参数默认值
            scale = scale || 1;
            offsetX = offsetX || 0;

            var dpr = window.devicePixelRatio || 1;
            var rect = canvas.getBoundingClientRect();
            var cssWidth = rect.width;
            var cssHeight = rect.height;
            canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
            canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
            var ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            var width = cssWidth;
            var height = cssHeight;

            // 检测是否为移动端
            var isMobile = width <= 768;

            // 预留更大边距，避免标签被裁剪（移动端使用更小的边距）
            var padding = isMobile
                ? { left: 50, right: 20, top: 12, bottom: 28 }
                : { left: 90, right: 50, top: 16, bottom: 36 };

            // 背景
            ctx.clearRect(0, 0, width, height);

            // 根据缩放和偏移处理数据
            var originalLabels = labels;
            var originalUpSeries = upSeries;
            var originalDownSeries = downSeries;

            if (scale > 1) {
                var totalLen = labels.length;
                var visibleLen = Math.ceil(totalLen / scale);
                var startIdx = Math.max(0, Math.floor(offsetX));
                var endIdx = Math.min(totalLen, startIdx + visibleLen);

                labels = labels.slice(startIdx, endIdx);
                upSeries = upSeries.slice(startIdx, endIdx);
                downSeries = downSeries.slice(startIdx, endIdx);
            }

            var speedUnit = uci.get('bandix', 'traffic', 'speed_unit') || 'bytes';
            var maxVal = 0;
            for (var i = 0; i < upSeries.length; i++) maxVal = Math.max(maxVal, upSeries[i] || 0);
            for (var j = 0; j < downSeries.length; j++) maxVal = Math.max(maxVal, downSeries[j] || 0);
            if (!isFinite(maxVal) || maxVal <= 0) maxVal = 1;

            // 动态测量Y轴最大标签宽度，增大左边距
            var fontSize = isMobile ? 10 : 12;
            ctx.font = fontSize + 'px sans-serif';
            var maxLabelText = formatByterate(maxVal, speedUnit);
            var zeroLabelText = formatByterate(0, speedUnit);
            var maxLabelWidth = Math.max(ctx.measureText(maxLabelText).width, ctx.measureText(zeroLabelText).width);
            padding.left = Math.max(padding.left, Math.ceil(maxLabelWidth) + (isMobile ? 20 : 30));
            // 保证右侧时间不被裁剪
            var rightMin = isMobile ? 20 : 50; // 最小右边距
            padding.right = Math.max(padding.right, rightMin);

            var innerW = Math.max(1, width - padding.left - padding.right);
            var innerH = Math.max(1, height - padding.top - padding.bottom);

            // 记录用于交互的几何信息；保留已有的 hoverIndex 避免在重绘时丢失
            var prevHover = (canvas.__bandixChart && typeof canvas.__bandixChart.hoverIndex === 'number') ? canvas.__bandixChart.hoverIndex : undefined;
            canvas.__bandixChart = {
                padding: padding,
                innerW: innerW,
                innerH: innerH,
                width: width,
                height: height,
                labels: labels,
                upSeries: upSeries,
                downSeries: downSeries,
                // 缩放相关信息
                scale: scale,
                offsetX: offsetX,
                originalLabels: originalLabels,
                originalUpSeries: originalUpSeries,
                originalDownSeries: originalDownSeries
            };
            if (typeof prevHover === 'number') canvas.__bandixChart.hoverIndex = prevHover;

            // 网格与Y轴刻度（更细更淡）
            var gridLines = 4;
            ctx.strokeStyle = 'rgba(148,163,184,0.08)';
            ctx.lineWidth = 0.8;
            for (var g = 0; g <= gridLines; g++) {
                var y = padding.top + (innerH * g / gridLines);
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.stroke();
                var val = Math.round(maxVal * (gridLines - g) / gridLines);
                ctx.fillStyle = '#9ca3af';
                ctx.font = fontSize + 'px sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                var yLabelY = (g === gridLines) ? y - 4 : y; // 底部刻度上移，避免贴近X轴
                ctx.fillText(formatByterate(val, speedUnit), padding.left - (isMobile ? 6 : 8), yLabelY);
            }

            function drawAreaSeries(series, color, gradientFrom, gradientTo) {
                if (!series || series.length === 0) return;
                var n = series.length;
                var stepX = n > 1 ? (innerW / (n - 1)) : 0;

                // 先绘制填充区域路径
                ctx.beginPath();
                for (var k = 0; k < n; k++) {
                    var v = Math.max(0, series[k] || 0);
                    var x = padding.left + (n > 1 ? stepX * k : innerW / 2);
                    var y = padding.top + innerH - (v / maxVal) * innerH;
                    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                // 关闭到底部以形成区域
                ctx.lineTo(padding.left + innerW, padding.top + innerH);
                ctx.lineTo(padding.left, padding.top + innerH);
                ctx.closePath();

                // 创建渐变填充
                var grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + innerH);
                grad.addColorStop(0, gradientFrom);
                grad.addColorStop(1, gradientTo);
                ctx.fillStyle = grad;
                ctx.fill();

                // 然后绘制细线
                ctx.beginPath();
                for (var k2 = 0; k2 < n; k2++) {
                    var v2 = Math.max(0, series[k2] || 0);
                    var x2 = padding.left + (n > 1 ? stepX * k2 : innerW / 2);
                    var y2 = padding.top + innerH - (v2 / maxVal) * innerH;
                    if (k2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
                }
                ctx.strokeStyle = color;
                // 移动端使用稍粗的线条以便更好地显示
                ctx.lineWidth = isMobile ? 1.5 : 1.2;
                ctx.stroke();

                // 圆点已移除，只保留线条
            }

            // 橙色上行，青色下行，使用半透明渐变
            drawAreaSeries(upSeries, BANDIX_COLOR_UPLOAD, 'rgba(249,115,22,0.16)', 'rgba(249,115,22,0.02)');
            drawAreaSeries(downSeries, BANDIX_COLOR_DOWNLOAD, 'rgba(6,182,212,0.12)', 'rgba(6,182,212,0.02)');

            // X 轴时间标签（首尾）
            if (labels && labels.length > 0) {
                ctx.fillStyle = '#9ca3af';
                ctx.font = fontSize + 'px sans-serif';
                ctx.textBaseline = 'top';
                var firstX = padding.left;
                var lastX = width - padding.right;
                var yBase = height - padding.bottom + (isMobile ? 2 : 4);
                // 左侧时间靠左对齐
                ctx.textAlign = 'left';
                ctx.fillText(labels[0], firstX, yBase);
                // 右侧时间靠右对齐，避免被裁剪
                if (labels.length > 1) {
                    ctx.textAlign = 'right';
                    ctx.fillText(labels[labels.length - 1], lastX, yBase);
                }
            }

            // 如果存在 hoverIndex，则绘制垂直虚线（鼠标对着的 x 轴）
            // 移动端不绘制虚线
            try {
                if (isMobile) return; // 移动端不绘制悬浮虚线

                var info = canvas.__bandixChart || {};
                var useIdx = null;
                if (typeof historyHoverIndex === 'number') useIdx = historyHoverIndex;
                else if (typeof info.hoverIndex === 'number') useIdx = info.hoverIndex;
                if (useIdx !== null && info.labels && info.labels.length > 0) {
                    var n = info.labels.length;
                    var stepX = n > 1 ? (innerW / (n - 1)) : 0;
                    var hoverIdx = useIdx;

                    // 在缩放状态下，需要将原始索引转换为显示索引
                    if (scale > 1 && originalLabels && originalLabels.length > 0) {
                        var startIdx = Math.floor(offsetX || 0);
                        hoverIdx = useIdx - startIdx;
                        // 检查索引是否在当前显示范围内
                        if (hoverIdx < 0 || hoverIdx >= n) {
                            hoverIdx = null; // 不在显示范围内，不绘制虚线
                        }
                    }

                    if (hoverIdx !== null) {
                        hoverIdx = Math.max(0, Math.min(n - 1, hoverIdx));
                        var hoverX = info.padding.left + (n > 1 ? stepX * hoverIdx : innerW / 2);
                        ctx.save();
                        ctx.strokeStyle = 'rgba(156,163,175,0.9)';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([6, 4]);
                        ctx.beginPath();
                        ctx.moveTo(hoverX, padding.top);
                        ctx.lineTo(hoverX, padding.top + innerH);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.restore();
                    }
                }
            } catch (e) { /* 安全兜底 */ }
        }

        function msToTimeLabel(ts) {
            var d = new Date(ts);
            var hh = ('' + d.getHours()).padStart(2, '0');
            var mm = ('' + d.getMinutes()).padStart(2, '0');
            var ss = ('' + d.getSeconds()).padStart(2, '0');
            return hh + ':' + mm + ':' + ss;
        }

        // 完整日期时间格式（用于聚合数据）
        function msToFullDateTimeLabel(ts) {
            var d = new Date(ts);
            var year = d.getFullYear();
            var month = ('' + (d.getMonth() + 1)).padStart(2, '0');
            var day = ('' + d.getDate()).padStart(2, '0');
            var hh = ('' + d.getHours()).padStart(2, '0');
            var mm = ('' + d.getMinutes()).padStart(2, '0');
            var ss = ('' + d.getSeconds()).padStart(2, '0');
            return year + '-' + month + '-' + day + ' ' + hh + ':' + mm + ':' + ss;
        }

        function buildTooltipHtml(point) {
            if (!point) return '';
            var lines = [];
            var typeSel = (typeof document !== 'undefined' ? document.getElementById('history-type-select') : null);
            var selType = (typeSel && typeSel.value) ? typeSel.value : 'total';
            var speedUnit = uci.get('bandix', 'traffic', 'speed_unit') || 'bytes';
            var isAggregated = point.is_aggregated || false;

            function row(label, val) {
                lines.push('<div class="ht-row"><span class="ht-key">' + label + '</span><span class="ht-val">' + val + '</span></div>');
            }

            function rateValue(key) {
                return formatByterate(point[key] || 0, speedUnit);
            }

            function bytesValue(key) {
                return formatSize(point[key] || 0);
            }

            function labelsFor(type) {
                if (type === 'lan') return { up: _('LAN Upload'), down: _('LAN Download') };
                if (type === 'wan') return { up: _('WAN Upload'), down: _('WAN Download') };
                return { up: _('Total Upload'), down: _('Total Download') };
            }

            function rateKeysFor(type) {
                if (type === 'lan') return { up: 'lan_tx_rate', down: 'lan_rx_rate' };
                if (type === 'wan') return { up: 'wan_tx_rate', down: 'wan_rx_rate' };
                return { up: 'total_tx_rate', down: 'total_rx_rate' };
            }

            function bytesKeysFor(type) {
                if (type === 'lan') return { up: 'lan_tx_bytes', down: 'lan_rx_bytes' };
                if (type === 'wan') return { up: 'wan_tx_bytes', down: 'wan_rx_bytes' };
                return { up: 'total_tx_bytes', down: 'total_rx_bytes' };
            }

            // 标题：聚合数据显示完整日期时间，实时数据只显示时间
            if (isAggregated) {
                lines.push('<div class="ht-title">' + msToFullDateTimeLabel(point.ts_ms) + '</div>');
                // 注意：当前版本只支持实时数据，不显示聚合统计标签
            } else {
                lines.push('<div class="ht-title">' + msToTimeLabel(point.ts_ms) + '</div>');
            }

            // 关键信息：选中类型的上下行速率（大号显示）
            var kpiLabels = labelsFor(selType);
            var kpiRateKeys = rateKeysFor(selType);

            if (isAggregated) {
                // 聚合数据：显示 P95 值（主要指标）
                lines.push(
                    '<div class="ht-kpis">' +
                    '<div class="ht-kpi up">' +
                    '<div class="ht-k-label">' + _('WAN Upload') + ' (P95)</div>' +
                    '<div class="ht-k-value">' + formatByterate(point.wan_tx_rate_p95 || 0, speedUnit) + '</div>' +
                    '</div>' +
                    '<div class="ht-kpi down">' +
                    '<div class="ht-k-label">' + _('WAN Download') + ' (P95)</div>' +
                    '<div class="ht-k-value">' + formatByterate(point.wan_rx_rate_p95 || 0, speedUnit) + '</div>' +
                    '</div>' +
                    '</div>'
                );

                // 详细统计信息
                lines.push('<div class="ht-divider"></div>');
                lines.push('<div class="ht-section-title">' + _('Upload Statistics') + '</div>');
                row(_('Average'), formatByterate(point.wan_tx_rate_avg || 0, speedUnit));
                row(_('Maximum'), formatByterate(point.wan_tx_rate_max || 0, speedUnit));
                row(_('Minimum'), formatByterate(point.wan_tx_rate_min || 0, speedUnit));
                row('P90', formatByterate(point.wan_tx_rate_p90 || 0, speedUnit));
                row('P95', formatByterate(point.wan_tx_rate_p95 || 0, speedUnit));
                row('P99', formatByterate(point.wan_tx_rate_p99 || 0, speedUnit));

                lines.push('<div class="ht-section-title" style="margin-top: 8px;">' + _('Download Statistics') + '</div>');
                row(_('Average'), formatByterate(point.wan_rx_rate_avg || 0, speedUnit));
                row(_('Maximum'), formatByterate(point.wan_rx_rate_max || 0, speedUnit));
                row(_('Minimum'), formatByterate(point.wan_rx_rate_min || 0, speedUnit));
                row('P90', formatByterate(point.wan_rx_rate_p90 || 0, speedUnit));
                row('P95', formatByterate(point.wan_rx_rate_p95 || 0, speedUnit));
                row('P99', formatByterate(point.wan_rx_rate_p99 || 0, speedUnit));

                // 累计流量（只显示 WAN）
                lines.push('<div class="ht-divider"></div>');
                lines.push('<div class="ht-section-title">' + _('Cumulative Traffic') + '</div>');
                row(_('WAN Uploaded'), bytesValue('wan_tx_bytes'));
                row(_('WAN Downloaded'), bytesValue('wan_rx_bytes'));
            } else {
                // 实时数据：显示实时速率
                lines.push(
                    '<div class="ht-kpis">' +
                    '<div class="ht-kpi up">' +
                    '<div class="ht-k-label">' + kpiLabels.up + '</div>' +
                    '<div class="ht-k-value">' + rateValue(kpiRateKeys.up) + '</div>' +
                    '</div>' +
                    '<div class="ht-kpi down">' +
                    '<div class="ht-k-label">' + kpiLabels.down + '</div>' +
                    '<div class="ht-k-value">' + rateValue(kpiRateKeys.down) + '</div>' +
                    '</div>' +
                    '</div>'
                );

                // 次要信息：其余类型的速率（精简展示）
                var otherTypes = ['total', 'lan', 'wan'].filter(function (t) { return t !== selType; });
                if (otherTypes.length) {
                    lines.push('<div class="ht-section-title">' + _('Other Rates') + '</div>');
                    otherTypes.forEach(function (t) {
                        var lbs = labelsFor(t);
                        var ks = rateKeysFor(t);
                        row(lbs.up, rateValue(ks.up));
                        row(lbs.down, rateValue(ks.down));
                    });
                }

                // 累计：区分LAN 流量与公网
                lines.push('<div class="ht-divider"></div>');
                lines.push('<div class="ht-section-title">' + _('Cumulative') + '</div>');
                row(_('LAN Uploaded'), bytesValue('lan_tx_bytes'));
                row(_('LAN Downloaded'), bytesValue('lan_rx_bytes'));
                row(_('WAN Uploaded'), bytesValue('wan_tx_bytes'));
                row(_('WAN Downloaded'), bytesValue('wan_rx_bytes'));
                row(_('Total Uploaded'), bytesValue('total_tx_bytes'));
                row(_('Total Downloaded'), bytesValue('total_rx_bytes'));
            }

            return lines.join('');
        }

        // 辅助函数：比较IP地址（小的在前）
        function compareIP(aIp, bIp) {
            var aIpParts = (aIp || '').split('.').map(function (part) { return parseInt(part) || 0; });
            var bIpParts = (bIp || '').split('.').map(function (part) { return parseInt(part) || 0; });

            for (var i = 0; i < 4; i++) {
                var aPart = aIpParts[i] || 0;
                var bPart = bIpParts[i] || 0;
                if (aPart !== bPart) {
                    return aPart - bPart; // 小的IP在前
                }
            }
            return 0;
        }

        // 排序逻辑函数
        function sortDevices(devices, sortBy, ascending) {
            if (!devices || !Array.isArray(devices)) return devices;

            var sortedDevices = devices.slice();

            switch (sortBy) {
                case 'online':
                    sortedDevices.sort(function (a, b) {
                        var aOnline = isDeviceOnline(a);
                        var bOnline = isDeviceOnline(b);

                        // 如果在线状态不同，在线设备优先
                        if (aOnline !== bOnline) {
                            return ascending ? (aOnline ? 1 : -1) : (aOnline ? -1 : 1);
                        }

                        // 在线状态相同时，按IP地址排序（小的在前）
                        var ipCompare = compareIP(a.ip, b.ip);
                        if (ipCompare !== 0) return ipCompare;

                        // IP地址也相同时，按MAC地址排序
                        return (a.mac || '').localeCompare(b.mac || '');
                    });
                    break;

                case 'lan_speed':
                    sortedDevices.sort(function (a, b) {
                        // 先按在线状态排序（在线在前）
                        var aOnline = isDeviceOnline(a);
                        var bOnline = isDeviceOnline(b);
                        if (aOnline !== bOnline) {
                            return aOnline ? -1 : 1;
                        }

                        // 在线状态相同时，按LAN速度排序
                        var aSpeed = (a.lan_tx_rate || 0) + (a.lan_rx_rate || 0);
                        var bSpeed = (b.lan_tx_rate || 0) + (b.lan_rx_rate || 0);
                        if (aSpeed !== bSpeed) {
                            return ascending ? (aSpeed - bSpeed) : (bSpeed - aSpeed);
                        }

                        // 速度相同时，按IP地址排序
                        return compareIP(a.ip, b.ip);
                    });
                    break;

                case 'wan_speed':
                    sortedDevices.sort(function (a, b) {
                        // 先按在线状态排序（在线在前）
                        var aOnline = isDeviceOnline(a);
                        var bOnline = isDeviceOnline(b);
                        if (aOnline !== bOnline) {
                            return aOnline ? -1 : 1;
                        }

                        // 在线状态相同时，按WAN速度排序
                        var aSpeed = (a.wan_tx_rate || 0) + (a.wan_rx_rate || 0);
                        var bSpeed = (b.wan_tx_rate || 0) + (b.wan_rx_rate || 0);
                        if (aSpeed !== bSpeed) {
                            return ascending ? (aSpeed - bSpeed) : (bSpeed - aSpeed);
                        }

                        // 速度相同时，按IP地址排序
                        return compareIP(a.ip, b.ip);
                    });
                    break;

                case 'lan_traffic':
                    sortedDevices.sort(function (a, b) {
                        // 先按在线状态排序（在线在前）
                        var aOnline = isDeviceOnline(a);
                        var bOnline = isDeviceOnline(b);
                        if (aOnline !== bOnline) {
                            return aOnline ? -1 : 1;
                        }

                        // 在线状态相同时，按LAN流量排序
                        var aTraffic = (a.lan_tx_bytes || 0) + (a.lan_rx_bytes || 0);
                        var bTraffic = (b.lan_tx_bytes || 0) + (b.lan_rx_bytes || 0);
                        if (aTraffic !== bTraffic) {
                            return ascending ? (aTraffic - bTraffic) : (bTraffic - aTraffic);
                        }

                        // 流量相同时，按IP地址排序
                        return compareIP(a.ip, b.ip);
                    });
                    break;

                case 'wan_traffic':
                    sortedDevices.sort(function (a, b) {
                        // 先按在线状态排序（在线在前）
                        var aOnline = isDeviceOnline(a);
                        var bOnline = isDeviceOnline(b);
                        if (aOnline !== bOnline) {
                            return aOnline ? -1 : 1;
                        }

                        // 在线状态相同时，按WAN流量排序
                        var aTraffic = (a.wan_tx_bytes || 0) + (a.wan_rx_bytes || 0);
                        var bTraffic = (b.wan_tx_bytes || 0) + (b.wan_rx_bytes || 0);
                        if (aTraffic !== bTraffic) {
                            return ascending ? (aTraffic - bTraffic) : (bTraffic - aTraffic);
                        }

                        // 流量相同时，按IP地址排序
                        return compareIP(a.ip, b.ip);
                    });
                    break;

                default:
                    // 默认按在线状态和IP地址排序
                    sortedDevices.sort(function (a, b) {
                        var aOnline = isDeviceOnline(a);
                        var bOnline = isDeviceOnline(b);

                        if (aOnline !== bOnline) {
                            return aOnline ? -1 : 1;
                        }

                        // 在线状态相同时，按IP地址排序（小的在前）
                        var ipCompare = compareIP(a.ip, b.ip);
                        if (ipCompare !== 0) return ipCompare;

                        // IP相同时，按MAC地址排序
                        return (a.mac || '').localeCompare(b.mac || '');
                    });
            }

            return sortedDevices;
        }

        // 判断设备是否在线（基于 last_online_ts）
        function isDeviceOnline(device) {
            // 如果没有 last_online_ts 字段，使用原有的 online 字段
            if (typeof device.last_online_ts === 'undefined') {
                return device.online !== false;
            }

            // 如果 last_online_ts 为 0 或无效值，认为离线
            if (!device.last_online_ts || device.last_online_ts <= 0) {
                return false;
            }

            // 计算当前时间与最后在线时间的差值（毫秒）
            var currentTime = Date.now();
            // 如果时间戳小于1000000000000，说明是秒级时间戳，需要转换为毫秒
            var lastOnlineTime = device.last_online_ts < 1000000000000 ? device.last_online_ts * 1000 : device.last_online_ts;
            var timeDiff = currentTime - lastOnlineTime;

            // 从UCI配置获取离线超时时间（秒），默认10分钟
            var offlineTimeoutSeconds = uci.get('bandix', 'traffic', 'offline_timeout') || 600;
            var offlineThreshold = offlineTimeoutSeconds * 1000; // 转换为毫秒

            return timeDiff <= offlineThreshold;
        }

        // 格式化最后上线时间
        function formatLastOnlineTime(lastOnlineTs) {
            if (!lastOnlineTs || lastOnlineTs <= 0) {
                return _('Never Online');
            }

            // 如果时间戳小于1000000000000，说明是秒级时间戳，需要转换为毫秒
            var lastOnlineTime = lastOnlineTs < 1000000000000 ? lastOnlineTs * 1000 : lastOnlineTs;
            var currentTime = Date.now();
            var timeDiff = currentTime - lastOnlineTime;

            // 转换为分钟
            var minutesDiff = Math.floor(timeDiff / (60 * 1000));

            // 1分钟以内显示"刚刚"
            if (minutesDiff < 1) {
                return _('Just Now');
            }

            // 10分钟以内显示具体的"几分钟前"
            if (minutesDiff <= 10) {
                return minutesDiff + _('min ago');
            }

            // 转换为小时
            var hoursDiff = Math.floor(timeDiff / (60 * 60 * 1000));

            // 如果不满1小时，显示分钟
            if (hoursDiff < 1) {
                return minutesDiff + _('min ago');
            }

            // 转换为天
            var daysDiff = Math.floor(timeDiff / (24 * 60 * 60 * 1000));

            // 如果不满1天，显示小时（忽略分钟）
            if (daysDiff < 1) {
                return hoursDiff + _('h ago');
            }

            // 转换为月（按30天计算）
            var monthsDiff = Math.floor(daysDiff / 30);

            // 如果不满1个月，显示天（忽略小时）
            if (monthsDiff < 1) {
                return daysDiff + _('days ago');
            }

            // 转换为年（按365天计算）
            var yearsDiff = Math.floor(daysDiff / 365);

            // 如果不满1年，显示月（忽略天）
            if (yearsDiff < 1) {
                return monthsDiff + _('months ago');
            }

            // 超过1年，显示年（忽略月）
            return yearsDiff + _('years ago');
        }

        // 精确时间格式
        function formatLastOnlineExactTime(lastOnlineTs) {
            if (!lastOnlineTs || lastOnlineTs <= 0) {
                return '-';
            }

            var lastOnlineTime = lastOnlineTs < 1000000000000 ? lastOnlineTs * 1000 : lastOnlineTs;
            var date = new Date(lastOnlineTime);

            if (isNaN(date.getTime())) {
                return '-';
            }

            function pad(value) {
                return value < 10 ? '0' + value : value;
            }

            return date.getFullYear() + '-' +
                pad(date.getMonth() + 1) + '-' +
                pad(date.getDate()) + ' ' +
                pad(date.getHours()) + ':' +
                pad(date.getMinutes()) + ':' +
                pad(date.getSeconds());
        }

        function formatRetentionSeconds(seconds) {
            if (!seconds || seconds <= 0) return '';

            // 固定值映射
            if (seconds === 600) {
                return _('Last 10 Minutes');
            }
            if (seconds === 900) {
                return _('Last 15 Minutes');
            }
            if (seconds === 1800) {
                return _('Last 30 Minutes');
            }
            if (seconds === 3600) {
                return _('Last 1 Hour');
            }
            if (seconds === 86400) {
                return _('Last 24 Hours');
            }
            if (seconds === 604800) {
                return _('Last 7 Days');
            }
            if (seconds === 2592000) {
                return _('Last 30 Days');
            }

            var value;
            var unitKey;
            if (seconds < 60) {
                value = Math.round(seconds);
                unitKey = _('seconds');
            } else if (seconds < 3600) {
                value = Math.round(seconds / 60);
                if (value < 1) value = 1;
                unitKey = _('minutes');
            } else if (seconds < 86400) {
                value = Math.round(seconds / 3600);
                if (value < 1) value = 1;
                unitKey = _('hours');
            } else if (seconds < 604800) {
                value = Math.round(seconds / 86400);
                if (value < 1) value = 1;
                unitKey = _('days');
            } else {
                value = Math.round(seconds / 604800);
                if (value < 1) value = 1;
                unitKey = _('weeks');
            }

            return _('Last') + ' ' + value + ' ' + unitKey;
        }

        // 移动端数据采样函数：最多显示指定数量的点，保留首尾点
        function downsampleForMobile(data, labels, upSeries, downSeries, maxPoints) {
            if (!data || data.length <= maxPoints) {
                return {
                    data: data,
                    labels: labels,
                    upSeries: upSeries,
                    downSeries: downSeries,
                    indices: data.map(function (_, i) { return i; }) // 原始索引映射
                };
            }

            var n = data.length;
            var sampledData = [];
            var sampledLabels = [];
            var sampledUp = [];
            var sampledDown = [];
            var indices = []; // 记录每个采样点对应的原始数据索引

            // 均匀采样，保留首尾点
            var step = (n - 1) / (maxPoints - 1);

            for (var i = 0; i < maxPoints; i++) {
                var idx = Math.round(i * step);
                // 确保索引在有效范围内
                idx = Math.min(idx, n - 1);

                sampledData.push(data[idx]);
                sampledLabels.push(labels[idx]);
                sampledUp.push(upSeries[idx]);
                sampledDown.push(downSeries[idx]);
                indices.push(idx); // 保存原始索引
            }

            // 确保首尾点被包含
            if (indices[0] !== 0) {
                sampledData[0] = data[0];
                sampledLabels[0] = labels[0];
                sampledUp[0] = upSeries[0];
                sampledDown[0] = downSeries[0];
                indices[0] = 0;
            }
            if (indices[indices.length - 1] !== n - 1) {
                var lastIdx = sampledData.length - 1;
                sampledData[lastIdx] = data[n - 1];
                sampledLabels[lastIdx] = labels[n - 1];
                sampledUp[lastIdx] = upSeries[lastIdx];
                sampledDown[lastIdx] = downSeries[lastIdx];
                indices[lastIdx] = n - 1;
            }

            return {
                data: sampledData,
                labels: sampledLabels,
                upSeries: sampledUp,
                downSeries: sampledDown,
                indices: indices
            };
        }

        function refreshHistory() {
            // 若鼠标在历史图上悬停，则暂停刷新以避免自动滚动
            if (historyHover) return Promise.resolve();
            var mac = document.getElementById('history-device-select')?.value || '';
            var type = document.getElementById('history-type-select')?.value || 'total';
            var canvas = document.getElementById('history-canvas');
            var tooltip = document.getElementById('history-tooltip');
            if (!canvas) return Promise.resolve();

            if (isHistoryLoading) return Promise.resolve();
            isHistoryLoading = true;



            return fetchMetricsData(mac).then(function (res) {
                // 将数组数组格式转换为对象数组格式
                var rawMetrics = res && res.metrics ? res.metrics : [];
                var data = convertMetricsArrayToObjects(rawMetrics);
                lastHistoryData = data;

                var retentionBadge = document.getElementById('history-retention');
                if (retentionBadge) {
                    var text = formatRetentionSeconds(res && res.retention_seconds);
                    retentionBadge.textContent = text || '';
                }

                if (!data.length) {
                    var ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawHistoryChart(canvas, [], [], [], 1, 0);
                    return;
                }

                // 按时间升序排序
                var filtered = data.slice();
                filtered.sort(function (a, b) { return (a.ts_ms || 0) - (b.ts_ms || 0); });

                // 检测是否为移动端
                var screenWidth = window.innerWidth || document.documentElement.clientWidth;
                var isMobileScreen = screenWidth <= 768;

                var displayData = filtered; // 用于 tooltip 显示的原始数据
                var indexMapping = null; // 采样后的索引映射到原始数据的索引
                var timeRangeBadge = document.getElementById('history-time-range');

                // 移动端：只显示最近 20 秒的数据
                if (isMobileScreen && filtered.length > 0) {
                    var currentTime = Date.now();
                    var twentySecondsAgo = currentTime - 20000; // 20 秒前

                    // 过滤出最近 20 秒的数据
                    var recentData = filtered.filter(function (item) {
                        var ts = item.ts_ms || 0;
                        // 如果时间戳是秒级，转换为毫秒
                        if (ts < 1000000000000) ts = ts * 1000;
                        return ts >= twentySecondsAgo;
                    });

                    // 如果没有最近 20 秒的数据，使用最后 20 个数据点（或全部，如果少于 20 个）
                    if (recentData.length === 0 && filtered.length > 0) {
                        recentData = filtered.slice(-20); // 取最后 20 个点
                    }

                    // 如果数据点超过 20 个，进行采样
                    if (recentData.length > 20) {
                        var keys = getTypeKeys(type);
                        var tempUpSeries = recentData.map(function (x) { return x[keys.up] || 0; });
                        var tempDownSeries = recentData.map(function (x) { return x[keys.down] || 0; });
                        var tempLabels = recentData.map(function (x) { return msToTimeLabel(x.ts_ms); });

                        var sampled = downsampleForMobile(recentData, tempLabels, tempUpSeries, tempDownSeries, 20);
                        filtered = sampled.data;
                        // 索引映射：sampled.indices 是 recentData 中的索引，直接使用即可
                        indexMapping = sampled.indices;
                    } else {
                        filtered = recentData;
                        // 创建完整的索引映射（1:1），索引直接对应 recentData 的索引
                        indexMapping = recentData.map(function (_, i) { return i; });
                    }

                    // 保存原始数据用于 tooltip（recentData 的索引与 indexMapping 对应）
                    displayData = recentData;
                } else {
                    // PC端：显示所有数据，创建完整的索引映射（1:1）
                    indexMapping = filtered.map(function (_, i) { return i; });
                }

                var keys = getTypeKeys(type);
                var upSeries = filtered.map(function (x) { return x[keys.up] || 0; });
                var downSeries = filtered.map(function (x) { return x[keys.down] || 0; });
                var labels = filtered.map(function (x) { return msToTimeLabel(x.ts_ms); });

                // 保存索引映射到 canvas，供 tooltip 使用
                if (canvas) {
                    canvas.__bandixIndexMapping = indexMapping;
                    canvas.__bandixDisplayData = displayData; // 保存用于 tooltip 的原始数据
                }

                drawHistoryChartWithZoom(canvas, labels, upSeries, downSeries);

                // 绑定或更新鼠标事件用于展示浮窗
                function findNearestIndex(evt) {
                    var rect = canvas.getBoundingClientRect();
                    var x = evt.clientX - rect.left;
                    var info = canvas.__bandixChart;
                    if (!info || !info.labels || info.labels.length === 0) return -1;

                    // 当前显示的数据长度（缩放后）
                    var n = info.labels.length;
                    var stepX = n > 1 ? (info.innerW / (n - 1)) : 0;
                    var minIdx = 0;
                    var minDist = Infinity;

                    // 在当前显示的数据范围内找最近的点
                    for (var k = 0; k < n; k++) {
                        var px = info.padding.left + (n > 1 ? stepX * k : info.innerW / 2);
                        var dist = Math.abs(px - x);
                        if (dist < minDist) { minDist = dist; minIdx = k; }
                    }

                    // 如果处于缩放状态，需要将显示索引映射回原始数据索引
                    if (info.scale && info.scale > 1 && info.originalLabels) {
                        var startIdx = Math.floor(info.offsetX || 0);
                        minIdx = startIdx + minIdx;
                    }

                    // 使用索引映射将显示索引转换为原始数据索引（移动端采样后需要）
                    var indexMapping = canvas.__bandixIndexMapping;
                    if (indexMapping && indexMapping[minIdx] !== undefined) {
                        return indexMapping[minIdx];
                    }

                    return minIdx;
                }

                function onMove(evt) {
                    // 移动端禁用悬浮功能
                    var screenWidth = window.innerWidth || document.documentElement.clientWidth;
                    if (screenWidth <= 768) {
                        if (tooltip) tooltip.style.display = 'none';
                        return;
                    }

                    if (!tooltip) return;
                    var idx = findNearestIndex(evt);

                    // 优先使用 displayData（移动端过滤后的数据），否则使用 lastHistoryData
                    var dataSource = (canvas && canvas.__bandixDisplayData) ? canvas.__bandixDisplayData : lastHistoryData;

                    if (idx < 0 || !dataSource || !dataSource[idx]) {
                        tooltip.style.display = 'none';
                        // 清除 hover 状态并请求重绘去掉虚线
                        historyHover = false;
                        try { if (canvas && canvas.__bandixChart) { delete canvas.__bandixChart.hoverIndex; drawHistoryChart(canvas, canvas.__bandixChart.originalLabels || [], canvas.__bandixChart.originalUpSeries || [], canvas.__bandixChart.originalDownSeries || [], zoomScale, zoomOffsetX); } } catch (e) { }
                        return;
                    }
                    var point = dataSource[idx];
                    // 设置 hover 状态，暂停历史轮询刷新
                    historyHover = true;
                    historyHoverIndex = idx;
                    // 立即重绘以显示垂直虚线
                    try { drawHistoryChart(canvas, canvas.__bandixChart && canvas.__bandixChart.originalLabels ? canvas.__bandixChart.originalLabels : labels, canvas.__bandixChart && canvas.__bandixChart.originalUpSeries ? canvas.__bandixChart.originalUpSeries : upSeries, canvas.__bandixChart && canvas.__bandixChart.originalDownSeries ? canvas.__bandixChart.originalDownSeries : downSeries, zoomScale, zoomOffsetX); } catch (e) { }
                    tooltip.innerHTML = buildTooltipHtml(point);

                    // 应用主题颜色到 tooltip，使用 cbi-section 的颜色
                    try {
                        // 优先从 cbi-section 获取颜色（历史趋势卡片就是 cbi-section）
                        var cbiSection = document.querySelector('.cbi-section');
                        var targetElement = cbiSection || document.querySelector('.main') || document.body;
                        var computedStyle = window.getComputedStyle(targetElement);
                        var bgColor = computedStyle.backgroundColor;
                        var textColor = computedStyle.color;

                        // 确保背景色不透明
                        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                            // 检查是否是 rgba/rgb 格式，如果是半透明则转换为不透明
                            var rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                            if (rgbaMatch) {
                                var r = parseInt(rgbaMatch[1]);
                                var g = parseInt(rgbaMatch[2]);
                                var b = parseInt(rgbaMatch[3]);
                                var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;

                                // 如果 alpha < 0.95，使用不透明版本
                                if (alpha < 0.95) {
                                    tooltip.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                                } else {
                                    tooltip.style.backgroundColor = bgColor;
                                }
                            } else {
                                tooltip.style.backgroundColor = bgColor;
                            }
                        } else {
                            // 如果无法获取背景色，尝试从其他 cbi-section 获取
                            var allCbiSections = document.querySelectorAll('.cbi-section');
                            var foundBgColor = false;
                            for (var i = 0; i < allCbiSections.length; i++) {
                                var sectionStyle = window.getComputedStyle(allCbiSections[i]);
                                var sectionBg = sectionStyle.backgroundColor;
                                if (sectionBg && sectionBg !== 'rgba(0, 0, 0, 0)' && sectionBg !== 'transparent') {
                                    var rgbaMatch = sectionBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                                    if (rgbaMatch) {
                                        var r = parseInt(rgbaMatch[1]);
                                        var g = parseInt(rgbaMatch[2]);
                                        var b = parseInt(rgbaMatch[3]);
                                        var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
                                        if (alpha < 0.95) {
                                            tooltip.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                                        } else {
                                            tooltip.style.backgroundColor = sectionBg;
                                        }
                                    } else {
                                        tooltip.style.backgroundColor = sectionBg;
                                    }
                                    foundBgColor = true;
                                    break;
                                }
                            }
                            // 如果无法获取背景色，CSS 会通过媒体查询自动处理暗色模式
                            if (!foundBgColor) {
                                // 不设置背景色，让 CSS 媒体查询处理
                            }
                        }

                        if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
                            tooltip.style.color = textColor;
                        } else {
                            // 如果无法获取文字颜色，从 cbi-section 获取
                            if (cbiSection) {
                                var sectionTextColor = window.getComputedStyle(cbiSection).color;
                                if (sectionTextColor && sectionTextColor !== 'rgba(0, 0, 0, 0)') {
                                    tooltip.style.color = sectionTextColor;
                                }
                                // 否则使用 CSS 默认颜色（已通过媒体查询设置）
                            }
                            // 否则使用 CSS 默认颜色（已通过媒体查询设置）
                        }

                        // 边框和阴影由 CSS 媒体查询自动处理
                    } catch (e) {
                        // 如果出错，CSS 会通过媒体查询自动处理暗色模式
                        // 不设置样式，让 CSS 处理
                    }

                    // 先显示以计算尺寸
                    tooltip.style.display = 'block';
                    tooltip.style.left = '-9999px';
                    tooltip.style.top = '-9999px';
                    var tw = tooltip.offsetWidth || 0;
                    var th = tooltip.offsetHeight || 0;
                    var padding = 20;
                    var maxX = (typeof window !== 'undefined' ? window.innerWidth : document.documentElement.clientWidth) - 4;
                    var maxY = (typeof window !== 'undefined' ? window.innerHeight : document.documentElement.clientHeight) - 4;
                    var cx = evt.clientX;
                    var cy = evt.clientY;

                    // 检测是否为移动端
                    var isMobileScreen = maxX <= 768;

                    var baseX, baseY;
                    if (isMobileScreen) {
                        // 移动端：居中显示在触摸点下方
                        baseX = Math.max(4, Math.min(maxX - tw - 4, cx - tw / 2));
                        baseY = cy + padding; // 显示在触摸点下方
                        // 如果下方空间不足，显示在上方
                        if (baseY + th > maxY) {
                            baseY = cy - th - padding;
                        }
                    } else {
                        // PC端：右上（水平向右）
                        baseX = cx + padding;
                        baseY = cy - th - padding; // 上方
                        // 若右侧溢出，改为左上
                        if (baseX + tw > maxX) {
                            baseX = cx - tw - padding;
                        }
                    }
                    // 边界收缩
                    if (baseX < 4) baseX = 4;
                    if (baseY < 4) baseY = 4;

                    tooltip.style.left = baseX + 'px';
                    tooltip.style.top = baseY + 'px';
                }

                function onLeave() {
                    if (tooltip) tooltip.style.display = 'none';
                    // 清除 hover 状态并请求重绘去掉虚线
                    historyHover = false;
                    historyHoverIndex = null;
                    // 重置缩放状态
                    if (zoomTimer) {
                        clearTimeout(zoomTimer);
                        zoomTimer = null;
                    }
                    zoomEnabled = false;
                    zoomScale = 1;
                    zoomOffsetX = 0;
                    // 更新缩放倍率显示
                    updateZoomLevelDisplay();
                    // 清除canvas中的hover信息
                    if (canvas && canvas.__bandixChart) {
                        delete canvas.__bandixChart.hoverIndex;
                    }
                    try { drawHistoryChart(canvas, canvas.__bandixChart && canvas.__bandixChart.originalLabels ? canvas.__bandixChart.originalLabels : labels, canvas.__bandixChart && canvas.__bandixChart.originalUpSeries ? canvas.__bandixChart.originalUpSeries : upSeries, canvas.__bandixChart && canvas.__bandixChart.originalDownSeries ? canvas.__bandixChart.originalDownSeries : downSeries, 1, 0); } catch (e) { }
                }

                // 鼠标进入事件：启动延迟计时器
                canvas.onmouseenter = function () {
                    if (zoomTimer) clearTimeout(zoomTimer);
                    zoomTimer = setTimeout(function () {
                        zoomEnabled = true;
                        zoomTimer = null;
                    }, 1000); // 1秒后启用缩放
                };

                // 鼠标滚轮事件：处理缩放
                canvas.onwheel = function (evt) {
                    if (!zoomEnabled) return;
                    evt.preventDefault();

                    var delta = evt.deltaY > 0 ? 0.9 : 1.1;
                    var newScale = zoomScale * delta;

                    // 限制缩放范围
                    if (newScale < 1) newScale = 1;
                    if (newScale > 10) newScale = 10;

                    var rect = canvas.getBoundingClientRect();
                    var mouseX = evt.clientX - rect.left;
                    var info = canvas.__bandixChart;
                    if (!info || !info.originalLabels) return;

                    // 计算鼠标在数据中的相对位置
                    var relativeX = (mouseX - info.padding.left) / info.innerW;
                    var totalLen = info.originalLabels.length;
                    var mouseDataIndex = relativeX * totalLen;

                    // 调整偏移以保持鼠标位置为缩放中心
                    var oldVisibleLen = totalLen / zoomScale;
                    var newVisibleLen = totalLen / newScale;
                    var centerShift = (oldVisibleLen - newVisibleLen) * (mouseDataIndex / totalLen);

                    zoomScale = newScale;
                    zoomOffsetX = Math.max(0, Math.min(totalLen - newVisibleLen, zoomOffsetX + centerShift));

                    // 更新缩放倍率显示
                    updateZoomLevelDisplay();

                    // 重绘图表 - 保持当前的hover状态
                    try {
                        drawHistoryChart(canvas, info.originalLabels, info.originalUpSeries, info.originalDownSeries, zoomScale, zoomOffsetX);
                        // 如果有当前的hover索引，重新绘制虚线
                        if (typeof historyHoverIndex === 'number' && canvas.__bandixChart) {
                            canvas.__bandixChart.hoverIndex = historyHoverIndex;
                        }
                    } catch (e) { }
                };

                // 检测是否为移动端
                var screenWidth = window.innerWidth || document.documentElement.clientWidth;
                var isMobileScreen = screenWidth <= 768;

                // 移动端禁用悬浮功能，PC端启用
                if (!isMobileScreen) {
                    canvas.onmousemove = onMove;
                    canvas.onmouseleave = onLeave;
                } else {
                    // 移动端：不绑定任何悬浮相关事件
                    // 确保 tooltip 在移动端不显示
                    if (tooltip) {
                        tooltip.style.display = 'none';
                    }
                }
            }).catch(function () {
                var ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawHistoryChart(canvas, [], [], [], 1, 0);
                // ui.addNotification(null, E('p', {}, _('Unable to fetch history data')), 'error');
            }).finally(function () {
                isHistoryLoading = false;
            });
        }

        // 历史趋势：事件绑定（延迟执行以确保 DOM 已加载）
        function initHistoryControls() {
            var typeSel = document.getElementById('history-type-select');
            var devSel = document.getElementById('history-device-select');
            if (typeSel) typeSel.value = 'total';

            // 初始化缩放倍率显示
            updateZoomLevelDisplay();

            // 历史图表始终显示实时数据

            function onFilterChange() {
                refreshHistory();
                // 同步刷新表格（立即生效，不等轮询）
                try { window.__bandixRenderTable && window.__bandixRenderTable(); } catch (e) { }
            }
            if (typeSel) typeSel.addEventListener('change', onFilterChange);
            if (devSel) devSel.addEventListener('change', onFilterChange);

            window.addEventListener('resize', function () {
                // 窗口大小改变时，重新刷新历史数据以应用移动端过滤逻辑
                refreshHistory();
            });

            // 首次加载
            refreshHistory();
        }

        // 延迟执行以确保 DOM 已加载
        setTimeout(initHistoryControls, 0);

        // 历史趋势轮询（实时数据每1秒，其他时间范围每30秒）
        // 使用 poll.add 但根据时间范围动态调整
        poll.add(function () {
            return refreshHistory();
        }, 1);



        // 存储移动端卡片展开状态（设备MAC地址集合）
        var expandedDeviceCards = new Set();

        // 定义更新设备数据的函数
        function updateDeviceData() {
            var devicePeriod = localStorage.getItem('bandix_device_period') || 'all';
            if (!/^(today|week|month|year|all)$/.test(devicePeriod)) devicePeriod = 'all';
            
            var timeRange = getTimeRangeForPeriod(devicePeriod);
            
            return Promise.all([
                (devicePeriod === 'all') ? callStatus() : callStatus(timeRange.start_ms, timeRange.end_ms),
                fetchAllScheduleRules()
            ]).then(function (results) {
                var result = results[0];
                var trafficDiv = document.getElementById('traffic-status');
                var deviceCountDiv = document.getElementById('device-count');
                var statsGrid = document.getElementById('stats-grid');
                var speedUnit = uci.get('bandix', 'traffic', 'speed_unit') || 'bytes';

                var stats = result;
                if (!stats || !stats.devices) {
                    if (trafficDiv) {
                        trafficDiv.innerHTML = '<div class="error">' + _('Unable to fetch data') + '</div>';
                    }
                    return;
                }

                // 更新设备计数
                if (deviceCountDiv) {
                    var onlineCount = stats.devices.filter(d => isDeviceOnline(d)).length;
                    deviceCountDiv.textContent = _('Online Devices') + ': ' + onlineCount + ' / ' + stats.devices.length;
                }

                // 计算统计数据（包含所有设备）
                var totalLanUp = stats.devices.reduce((sum, d) => sum + (d.lan_tx_bytes || 0), 0);
                var totalLanDown = stats.devices.reduce((sum, d) => sum + (d.lan_rx_bytes || 0), 0);
                var totalWanUp = stats.devices.reduce((sum, d) => sum + (d.wan_tx_bytes || 0), 0);
                var totalWanDown = stats.devices.reduce((sum, d) => sum + (d.wan_rx_bytes || 0), 0);
                var totalLanSpeedUp = stats.devices.reduce((sum, d) => sum + (d.lan_tx_rate || 0), 0);
                var totalLanSpeedDown = stats.devices.reduce((sum, d) => sum + (d.lan_rx_rate || 0), 0);
                var totalWanSpeedUp = stats.devices.reduce((sum, d) => sum + (d.wan_tx_rate || 0), 0);
                var totalWanSpeedDown = stats.devices.reduce((sum, d) => sum + (d.wan_rx_rate || 0), 0);
                var totalSpeedUp = totalLanSpeedUp + totalWanSpeedUp;
                var totalSpeedDown = totalLanSpeedDown + totalWanSpeedDown;
                var totalUp = totalLanUp + totalWanUp;
                var totalDown = totalLanDown + totalWanDown;

                // 更新统计卡片
                statsGrid.innerHTML = '';

                // LAN 流量卡片
                statsGrid.appendChild(E('div', { 'class': 'cbi-section' }, [
                    E('div', { 'class': 'stats-card-title' }, _('LAN Traffic')),
                    E('div', { 'style': 'display: flex; flex-direction: column; gap: 8px;' }, [
                        // 上传行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: ' + BANDIX_COLOR_UPLOAD + '; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                            E('span', { 'style': 'color: ' + BANDIX_COLOR_UPLOAD + '; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalLanSpeedUp, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #64748b; margin-left: 4px;' }, '(' + formatSize(totalLanUp) + ')')
                        ]),
                        // 下载行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: ' + BANDIX_COLOR_DOWNLOAD + '; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                            E('span', { 'style': 'color: ' + BANDIX_COLOR_DOWNLOAD + '; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalLanSpeedDown, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #64748b; margin-left: 4px;' }, '(' + formatSize(totalLanDown) + ')')
                        ])
                    ])
                ]));

                // WAN 流量卡片
                statsGrid.appendChild(E('div', { 'class': 'cbi-section' }, [
                    E('div', { 'class': 'stats-card-title' }, _('WAN Traffic')),
                    E('div', { 'style': 'display: flex; flex-direction: column; gap: 8px;' }, [
                        // 上传行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: ' + BANDIX_COLOR_UPLOAD + '; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                            E('span', { 'style': 'color: ' + BANDIX_COLOR_UPLOAD + '; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalWanSpeedUp, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #64748b; margin-left: 4px;' }, '(' + formatSize(totalWanUp) + ')')
                        ]),
                        // 下载行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: ' + BANDIX_COLOR_DOWNLOAD + '; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                            E('span', { 'style': 'color: ' + BANDIX_COLOR_DOWNLOAD + '; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalWanSpeedDown, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #64748b; margin-left: 4px;' }, '(' + formatSize(totalWanDown) + ')')
                        ])
                    ])
                ]));

                // 总流量卡片
                statsGrid.appendChild(E('div', { 'class': 'cbi-section' }, [
                    E('div', { 'class': 'stats-card-title' }, _('Total')),
                    E('div', { 'style': 'display: flex; flex-direction: column; gap: 8px;' }, [
                        // 上传行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: ' + BANDIX_COLOR_UPLOAD + '; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                            E('span', { 'style': 'color: ' + BANDIX_COLOR_UPLOAD + '; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalSpeedUp, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #64748b; margin-left: 4px;' }, '(' + formatSize(totalUp) + ')')
                        ]),
                        // 下载行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: ' + BANDIX_COLOR_DOWNLOAD + '; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                            E('span', { 'style': 'color: ' + BANDIX_COLOR_DOWNLOAD + '; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalSpeedDown, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #64748b; margin-left: 4px;' }, '(' + formatSize(totalDown) + ')')
                        ])
                    ])
                ]));

                // 创建表头点击处理函数
                function createSortableHeader(text, sortKey) {
                    var th = E('th', {
                        'class': 'sortable' + (currentSortBy === sortKey ? ' active ' + (currentSortOrder ? 'asc' : 'desc') : ''),
                        'data-sort': sortKey
                    }, text);

                    th.addEventListener('click', function () {
                        var newSortBy = this.getAttribute('data-sort');
                        if (currentSortBy === newSortBy) {
                            // 同一列，切换升降序
                            currentSortOrder = !currentSortOrder;
                        } else {
                            // 不同列，默认降序（对于速度和流量，降序更有意义）
                            currentSortBy = newSortBy;
                            currentSortOrder = false; // 所有排序默认降序
                        }

                        // 保存状态
                        localStorage.setItem('bandix_sort_by', currentSortBy);
                        localStorage.setItem('bandix_sort_order', currentSortOrder.toString());

                        // 触发重新渲染
                        if (window.__bandixRenderTable) {
                            window.__bandixRenderTable();
                        }
                    });

                    return th;
                }

                // 创建分栏表头（速度 | 用量）
                function createSplitHeader(text, speedKey, trafficKey) {
                    var th = E('th', {});

                    var header = E('div', { 'class': 'th-split-header' }, [
                        E('span', {}, text)
                    ]);

                    var controls = E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' });

                    // 速度排序按钮
                    var speedBtn = E('div', {
                        'class': 'th-split-section' + (currentSortBy === speedKey ? ' active' : ''),
                        'data-sort': speedKey,
                        'title': _('Sort by Speed')
                    }, [
                        E('span', { 'class': 'th-split-icon' }, '⚡'),
                        E('span', { 'style': 'font-size: 0.75rem;' }, currentSortBy === speedKey ? (currentSortOrder ? '↑' : '↓') : '')
                    ]);

                    // 分隔线
                    var divider = E('div', { 'class': 'th-split-divider' });

                    // 用量排序按钮
                    var trafficBtn = E('div', {
                        'class': 'th-split-section' + (currentSortBy === trafficKey ? ' active' : ''),
                        'data-sort': trafficKey,
                        'title': _('Sort by Traffic')
                    }, [
                        E('span', { 'class': 'th-split-icon' }, '∑'),
                        E('span', { 'style': 'font-size: 0.75rem;' }, currentSortBy === trafficKey ? (currentSortOrder ? '↑' : '↓') : '')
                    ]);

                    controls.appendChild(speedBtn);
                    controls.appendChild(divider);
                    controls.appendChild(trafficBtn);
                    header.appendChild(controls);
                    th.appendChild(header);

                    // 速度按钮点击事件
                    speedBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        var newSortBy = this.getAttribute('data-sort');
                        if (currentSortBy === newSortBy) {
                            currentSortOrder = !currentSortOrder;
                        } else {
                            currentSortBy = newSortBy;
                            currentSortOrder = false; // 速度默认降序
                        }
                        localStorage.setItem('bandix_sort_by', currentSortBy);
                        localStorage.setItem('bandix_sort_order', currentSortOrder.toString());
                        if (window.__bandixRenderTable) {
                            window.__bandixRenderTable();
                        }
                    });

                    // 用量按钮点击事件
                    trafficBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        var newSortBy = this.getAttribute('data-sort');
                        if (currentSortBy === newSortBy) {
                            currentSortOrder = !currentSortOrder;
                        } else {
                            currentSortBy = newSortBy;
                            currentSortOrder = false; // 用量默认降序
                        }
                        localStorage.setItem('bandix_sort_by', currentSortBy);
                        localStorage.setItem('bandix_sort_order', currentSortOrder.toString());
                        if (window.__bandixRenderTable) {
                            window.__bandixRenderTable();
                        }
                    });

                    return th;
                }

                // 创建表格
                var table = E('table', { 'class': 'bandix-table' }, [
                    E('thead', {}, [
                        E('tr', {}, [
                            createSortableHeader(_('Device Info'), 'online'),
                            createSplitHeader(_('LAN Traffic'), 'lan_speed', 'lan_traffic'),
                            createSplitHeader(_('WAN Traffic'), 'wan_speed', 'wan_traffic'),
                            E('th', {}, _('Schedule Rules')),
                            E('th', {}, _('Actions'))
                        ])
                    ]),
                    E('tbody', {})
                ]);

                var tbody = table.querySelector('tbody');

                // 创建移动端卡片容器
                var cardsContainer = E('div', { 'class': 'device-list-cards' });

                // 过滤：按选择设备
                var selectedMac = (typeof document !== 'undefined' ? (document.getElementById('history-device-select')?.value || '') : '');
                var filteredDevices = (!selectedMac) ? stats.devices : stats.devices.filter(function (d) { return (d.mac === selectedMac); });

                // 应用排序
                filteredDevices = sortDevices(filteredDevices, currentSortBy, currentSortOrder);

                // 检查是否有任何设备有 IPv6 地址
                var hasAnyIPv6 = filteredDevices.some(function (device) {
                    var lanIPv6 = filterLanIPv6(device.ipv6_addresses);
                    return lanIPv6.length > 0;
                });

                // 填充数据
                filteredDevices.forEach(function (device) {
                    var isOnline = isDeviceOnline(device);

                    // 根据主题类型决定按钮显示内容
                    var themeType = getThemeType();
                    var buttonText = themeType === 'narrow' ? '⚙' : _('Settings');

                    var actionButton = E('button', {
                        'class': 'cbi-button cbi-button-action',
                        'title': _('Settings')
                    }, buttonText);

                    // 绑定点击事件
                    actionButton.addEventListener('click', function () {
                        showRateLimitModal(device);
                    });

                    // 获取当前显示模式
                    // 移动端强制使用 SimpleMode
                    var screenWidth = window.innerWidth || document.documentElement.clientWidth;
                    var isMobileScreen = screenWidth <= 768;
                    var deviceMode = isMobileScreen ? 'simple' : (localStorage.getItem('bandix_device_mode') || 'simple');
                    var isDetailedMode = deviceMode === 'detailed';

                    // 构建设备信息元素
                    var deviceInfoElements = [
                        E('div', { 'class': 'device-name' }, [
                            E('span', {
                                'class': 'device-status ' + (isOnline ? 'online' : 'offline')
                            }),
                            device.hostname || '-'
                        ]),
                        E('div', { 'class': 'device-ip' }, [
                            device.connection_type ? E('span', {
                                'class': 'device-connection-type',
                                'title': device.connection_type === 'wifi' ? _('Wireless') : _('Wired')
                            }, device.connection_type === 'wifi' ? '📶' : '🔗') : '',
                            device.ip
                        ])
                    ];

                    // 详细模式下显示更多信息
                    if (isDetailedMode) {
                        // 只有当有设备有 IPv6 时才添加 IPv6 行
                        if (hasAnyIPv6) {
                            var lanIPv6 = filterLanIPv6(device.ipv6_addresses);
                            if (lanIPv6.length > 0) {
                                var allIPv6 = device.ipv6_addresses ? device.ipv6_addresses.join(', ') : '';
                                deviceInfoElements.push(E('div', {
                                    'class': 'device-ipv6',
                                    'title': allIPv6
                                }, lanIPv6.join(', ')));
                            } else {
                                deviceInfoElements.push(E('div', { 'class': 'device-ipv6' }, '-'));
                            }
                        }

                        // 添加 MAC 和最后上线信息
                        deviceInfoElements.push(
                            E('div', { 'class': 'device-mac' }, device.mac),
                            E('div', { 'class': 'device-last-online' }, [
                                E('span', {}, _('Last Online') + ': '),
                                E('span', { 'class': 'device-last-online-value' }, formatLastOnlineTime(device.last_online_ts)),
                                E('span', { 'class': 'device-last-online-exact' }, formatLastOnlineExactTime(device.last_online_ts))
                            ])
                        );
                    }

                    var row = E('tr', {}, [
                        // 设备信息
                        E('td', {}, [
                            E('div', { 'class': 'device-info' }, deviceInfoElements)
                        ]),

                        // LAN 流量
                        E('td', {}, [
                            E('div', { 'class': 'traffic-info' }, [
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon upload' }, '↑'),
                                    E('span', { 'class': 'traffic-speed lan' }, formatByterate(device.lan_tx_rate || 0, speedUnit)),
                                    E('span', { 'class': 'traffic-total' }, '(' + formatSize(device.lan_tx_bytes || 0) + ')')
                                ]),
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon download' }, '↓'),
                                    E('span', { 'class': 'traffic-speed lan' }, formatByterate(device.lan_rx_rate || 0, speedUnit)),
                                    E('span', { 'class': 'traffic-total' }, '(' + formatSize(device.lan_rx_bytes || 0) + ')')
                                ])
                            ])
                        ]),

                        // WAN 流量
                        E('td', {}, [
                            E('div', { 'class': 'traffic-info' }, [
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon upload' }, '↑'),
                                    E('span', { 'class': 'traffic-speed wan' }, formatByterate(device.wan_tx_rate || 0, speedUnit)),
                                    E('span', { 'class': 'traffic-total' }, '(' + formatSize(device.wan_tx_bytes || 0) + ')')
                                ]),
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon download' }, '↓'),
                                    E('span', { 'class': 'traffic-speed wan' }, formatByterate(device.wan_rx_rate || 0, speedUnit)),
                                    E('span', { 'class': 'traffic-total' }, '(' + formatSize(device.wan_rx_bytes || 0) + ')')
                                ])
                            ])
                        ]),

                        // 定时限速规则
                        (function () {
                            var activeRules = getActiveRulesForDevice(device.mac);
                            var allDeviceRules = allScheduleRules.filter(function (r) { return r && r.mac === device.mac; });

                            var rulesInfo = E('div', { 'class': 'schedule-rules-info' }, []);

                            if (allDeviceRules.length === 0) {
                                rulesInfo.appendChild(E('div', { 'style': 'font-size: 0.75rem; opacity: 0.6;' }, '-'));
                            } else {
                                // 显示规则总数
                                rulesInfo.appendChild(E('div', {
                                    'style': 'font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;'
                                }, allDeviceRules.length + ' ' + (allDeviceRules.length === 1 ? _('rule') : _('rules'))));

                                // 显示当前生效的规则
                                if (activeRules.length > 0) {
                                    // 合并多个规则的限制值
                                    var mergedLimits = mergeActiveRulesLimits(activeRules);
                                    var uploadLimit = mergedLimits.uploadLimit;
                                    var downloadLimit = mergedLimits.downloadLimit;

                                    // 显示限速值（箭头固定颜色，文字默认颜色）
                                    var limitsContainer = E('div', {
                                        'style': 'font-size: 0.75rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;'
                                    });

                                    // 上传限速（橙色箭头）
                                    var uploadSpan = E('span', {});
                                    uploadSpan.appendChild(E('span', { 'style': 'color: ' + BANDIX_COLOR_UPLOAD + ';' }, '↑'));
                                    uploadSpan.appendChild(document.createTextNode(uploadLimit > 0 ? formatByterate(uploadLimit, speedUnit) : _('Unlimited')));
                                    limitsContainer.appendChild(uploadSpan);

                                    // 下载限速（青色箭头）
                                    var downloadSpan = E('span', {});
                                    downloadSpan.appendChild(E('span', { 'style': 'color: ' + BANDIX_COLOR_DOWNLOAD + ';' }, '↓'));
                                    downloadSpan.appendChild(document.createTextNode(downloadLimit > 0 ? formatByterate(downloadLimit, speedUnit) : _('Unlimited')));
                                    limitsContainer.appendChild(downloadSpan);

                                    rulesInfo.appendChild(limitsContainer);
                                } else {
                                    rulesInfo.appendChild(E('div', {
                                        'style': 'font-size: 0.75rem; opacity: 0.5;'
                                    }, _('No active rule')));
                                }
                            }

                            // PC 端添加鼠标悬浮事件（显示所有规则）- 只要有规则就绑定事件
                            var screenWidth = window.innerWidth || document.documentElement.clientWidth;
                            if (screenWidth > 768 && allDeviceRules.length > 0) {
                                rulesInfo.onmouseenter = function (evt) {
                                    var tooltip = document.getElementById('schedule-rules-tooltip');
                                    if (!tooltip) return;

                                    var html = buildScheduleRulesTooltipHtml(allDeviceRules, activeRules, speedUnit);
                                    if (!html) return;

                                    tooltip.innerHTML = html;

                                    // 应用主题颜色
                                    try {
                                        var cbiSection = document.querySelector('.cbi-section');
                                        var targetElement = cbiSection || document.querySelector('.main') || document.body;
                                        var computedStyle = window.getComputedStyle(targetElement);
                                        var bgColor = computedStyle.backgroundColor;
                                        var textColor = computedStyle.color;

                                        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                                            var rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                                            if (rgbaMatch) {
                                                var r = parseInt(rgbaMatch[1]);
                                                var g = parseInt(rgbaMatch[2]);
                                                var b = parseInt(rgbaMatch[3]);
                                                var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
                                                if (alpha < 0.95) {
                                                    tooltip.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                                                } else {
                                                    tooltip.style.backgroundColor = bgColor;
                                                }
                                            } else {
                                                tooltip.style.backgroundColor = bgColor;
                                            }
                                        }

                                        if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
                                            tooltip.style.color = textColor;
                                        }
                                    } catch (e) { }

                                    // 先隐藏，设置内容后再显示以计算尺寸
                                    tooltip.style.display = 'block';
                                    tooltip.style.visibility = 'hidden';
                                    tooltip.style.left = '-9999px';
                                    tooltip.style.top = '-9999px';

                                    // 强制浏览器计算尺寸
                                    var tw = tooltip.offsetWidth || 0;
                                    var th = tooltip.offsetHeight || 0;

                                    if (tw === 0 || th === 0) {
                                        tooltip.style.display = 'none';
                                        return;
                                    }

                                    tooltip.style.visibility = 'visible';

                                    var padding = 12;
                                    var maxX = window.innerWidth - 4;
                                    var maxY = window.innerHeight - 4;

                                    var rect = evt.currentTarget.getBoundingClientRect();
                                    var cx = rect.left + rect.width / 2;
                                    var cy = rect.top + rect.height / 2;

                                    // 计算位置：优先显示在右侧，如果空间不足则显示在左侧
                                    var baseX = cx + padding;
                                    var baseY = cy - th / 2;

                                    if (baseX + tw > maxX) {
                                        baseX = cx - tw - padding;
                                    }

                                    if (baseY < 4) baseY = 4;
                                    if (baseY + th > maxY) baseY = maxY - th - 4;

                                    tooltip.style.left = baseX + 'px';
                                    tooltip.style.top = baseY + 'px';
                                };

                                rulesInfo.onmouseleave = function () {
                                    var tooltip = document.getElementById('schedule-rules-tooltip');
                                    if (tooltip) {
                                        tooltip.style.display = 'none';
                                        tooltip.style.visibility = 'visible';
                                    }
                                };

                                rulesInfo.onmousemove = function (evt) {
                                    var tooltip = document.getElementById('schedule-rules-tooltip');
                                    if (!tooltip || tooltip.style.display === 'none') return;

                                    var tw = tooltip.offsetWidth || 0;
                                    var th = tooltip.offsetHeight || 0;
                                    var padding = 12;
                                    var maxX = window.innerWidth - 4;
                                    var maxY = window.innerHeight - 4;

                                    var rect = evt.currentTarget.getBoundingClientRect();
                                    var cx = rect.left + rect.width / 2;
                                    var cy = rect.top + rect.height / 2;

                                    var baseX = cx + padding;
                                    var baseY = cy - th / 2;

                                    if (baseX + tw > maxX) {
                                        baseX = cx - tw - padding;
                                    }

                                    if (baseY < 4) baseY = 4;
                                    if (baseY + th > maxY) baseY = maxY - th - 4;

                                    tooltip.style.left = baseX + 'px';
                                    tooltip.style.top = baseY + 'px';
                                };
                            }

                            return E('td', {}, rulesInfo);
                        })(),

                        // 操作
                        E('td', {}, [
                            actionButton
                        ])
                    ]);

                    tbody.appendChild(row);

                    // 创建移动端卡片
                    var card = E('div', { 'class': 'device-card' }, [
                        // 卡片头部
                        E('div', { 'class': 'device-card-header' }, [
                            E('div', { 'class': 'device-card-name' }, [
                                E('span', { 'class': 'device-status ' + (isOnline ? 'online' : 'offline') }),
                                E('div', {}, [
                                    E('div', { 'style': 'font-weight: 600;' }, device.hostname || '-'),
                                    E('div', { 'class': 'device-card-ip' }, [
                                        device.connection_type ? E('span', {
                                            'class': 'device-connection-type',
                                            'title': device.connection_type === 'wifi' ? _('Wireless') : _('Wired')
                                        }, device.connection_type === 'wifi' ? '📶' : '🔗') : '',
                                        device.ip
                                    ])
                                ])
                            ]),
                            E('div', { 'class': 'device-card-action' }, [
                                (function () {
                                    var cardActionBtn = E('button', {
                                        'class': 'cbi-button cbi-button-action',
                                        'title': _('Settings')
                                    }, buttonText);
                                    cardActionBtn.addEventListener('click', function () {
                                        showRateLimitModal(device);
                                    });
                                    return cardActionBtn;
                                })()
                            ])
                        ]),
                        // 卡片主要内容（WAN流量）
                        E('div', { 'class': 'device-card-content' }, [
                            // WAN流量
                            E('div', { 'class': 'device-card-section' }, [
                                E('div', { 'class': 'device-card-section-label' }, _('WAN Traffic')),
                                E('div', { 'class': 'device-card-traffic' }, [
                                    E('div', { 'class': 'device-card-traffic-row' }, [
                                        E('span', { 'style': 'color: ' + BANDIX_COLOR_UPLOAD + '; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                                        E('span', { 'style': 'font-weight: 600;' }, formatByterate(device.wan_tx_rate || 0, speedUnit)),
                                        E('span', { 'style': 'font-size: 0.75rem; opacity: 0.7;' }, '(' + formatSize(device.wan_tx_bytes || 0) + ')')
                                    ]),
                                    E('div', { 'class': 'device-card-traffic-row' }, [
                                        E('span', { 'style': 'color: ' + BANDIX_COLOR_DOWNLOAD + '; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                                        E('span', { 'style': 'font-weight: 600;' }, formatByterate(device.wan_rx_rate || 0, speedUnit)),
                                        E('span', { 'style': 'font-size: 0.75rem; opacity: 0.7;' }, '(' + formatSize(device.wan_rx_bytes || 0) + ')')
                                    ])
                                ])
                            ])
                        ]),
                        // 定时限速规则
                        (function () {
                            var activeRules = getActiveRulesForDevice(device.mac);
                            var allDeviceRules = allScheduleRules.filter(function (r) { return r && r.mac === device.mac; });

                            if (allDeviceRules.length === 0) {
                                return E('div', { 'class': 'device-card-section device-card-rules' }, [
                                    E('div', { 'class': 'device-card-section-label' }, _('Schedule Rules')),
                                    E('div', { 'class': 'device-card-rules-empty' }, '-')
                                ]);
                            }

                            var rulesContent = E('div', { 'class': 'device-card-rules-content' });

                            // 显示规则总数
                            rulesContent.appendChild(E('div', {
                                'class': 'device-card-rules-count'
                            }, allDeviceRules.length + ' ' + (allDeviceRules.length === 1 ? _('rule') : _('rules'))));

                            if (activeRules.length > 0) {
                                // 合并多个规则的限制值
                                var mergedLimits = mergeActiveRulesLimits(activeRules);
                                var uploadLimit = mergedLimits.uploadLimit;
                                var downloadLimit = mergedLimits.downloadLimit;

                                // 显示限速值
                                var limitsText = [];
                                limitsText.push('↑' + (uploadLimit > 0 ? formatByterate(uploadLimit, speedUnit) : _('Unlimited')));
                                limitsText.push('↓' + (downloadLimit > 0 ? formatByterate(downloadLimit, speedUnit) : _('Unlimited')));

                                rulesContent.appendChild(E('div', {
                                    'class': 'device-card-rules-active-time'
                                }, limitsText.join(' ')));
                            } else {
                                rulesContent.appendChild(E('div', {
                                    'class': 'device-card-rules-inactive'
                                }, _('No active rule')));
                            }

                            return E('div', { 'class': 'device-card-section device-card-rules' }, [
                                E('div', { 'class': 'device-card-section-label' }, _('Schedule Rules')),
                                rulesContent
                            ]);
                        })(),
                        // LAN流量（直接显示，不需要展开/收起）
                        E('div', { 'class': 'device-card-section', 'style': 'margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0, 0, 0, 0.1);' }, [
                            E('div', { 'class': 'device-card-section-label' }, _('LAN Traffic')),
                            E('div', { 'class': 'device-card-traffic' }, [
                                E('div', { 'class': 'device-card-traffic-row' }, [
                                    E('span', { 'style': 'color: ' + BANDIX_COLOR_UPLOAD + '; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                                    E('span', { 'style': 'font-weight: 600;' }, formatByterate(device.lan_tx_rate || 0, speedUnit)),
                                    E('span', { 'style': 'font-size: 0.75rem; opacity: 0.7;' }, '(' + formatSize(device.lan_tx_bytes || 0) + ')')
                                ]),
                                E('div', { 'class': 'device-card-traffic-row' }, [
                                    E('span', { 'style': 'color: ' + BANDIX_COLOR_DOWNLOAD + '; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                                    E('span', { 'style': 'font-weight: 600;' }, formatByterate(device.lan_rx_rate || 0, speedUnit)),
                                    E('span', { 'style': 'font-size: 0.75rem; opacity: 0.7;' }, '(' + formatSize(device.lan_rx_bytes || 0) + ')')
                                ])
                            ])
                        ])
                    ]);

                    cardsContainer.appendChild(card);
                });

                // 更新表格内容
                trafficDiv.innerHTML = '';
                trafficDiv.appendChild(table);
                trafficDiv.appendChild(cardsContainer);
                // 暴露一个立即重绘表格的函数，供筛选变化时调用
                try {
                    window.__bandixRenderTable = function () {
                        // 重新触发完整的数据更新和渲染
                        updateDeviceData();
                    };
                } catch (e) { }

                // 更新历史趋势中的设备下拉
                try {
                    latestDevices = stats.devices || [];
                    updateDeviceOptions(latestDevices);
                } catch (e) { }
            });
        }

        // 初始化统计控件（延迟执行，确保 DOM 已渲染）

        // 更新统计数据
        var usageRankingShowAll = false;
        var usageRankingData = [];
        var USAGE_RANKING_DEFAULT_LIMIT = 10;
        var usageRankingCustomRange = null; // 存储自定义时间范围
        
        // Traffic Timeline 独立的时间范围管理
        var trafficIncrementsCustomRange = null;
        
        // 格式化时间范围显示 - 总是显示完整日期时间
        function formatTimeRange(startMs, endMs) {
            if (!startMs || !endMs) return '';
            
            var startDate = new Date(startMs);
            var endDate = new Date(endMs);
            
            var formatDateTime = function(date) {
                var year = date.getFullYear();
                var month = (date.getMonth() + 1).toString().padStart(2, '0');
                var day = date.getDate().toString().padStart(2, '0');
                var hours = date.getHours().toString().padStart(2, '0');
                var minutes = date.getMinutes().toString().padStart(2, '0');
                return year + '/' + month + '/' + day + ' ' + hours + ':' + minutes;
            };
            
            return formatDateTime(startDate) + ' - ' + formatDateTime(endDate);
        }
        
        function renderUsageRanking(data, showAll) {
            var container = document.getElementById('usage-ranking-container');
            if (!container) return;

            if (data.length === 0) {
                container.innerHTML = '<div class="loading-state">' + _('No data') + '</div>';
                return;
            }

            var displayData = showAll ? data : data.slice(0, USAGE_RANKING_DEFAULT_LIMIT);
            var rankingList = E('div', { 'class': 'usage-ranking-list' });

            displayData.forEach(function (item) {
                var rankingItem = E('div', {
                    'class': 'usage-ranking-item',
                    'style': '--progress-width: ' + (item.percentage || 0) + '%;'
                }, [
                    E('div', { 'class': 'usage-ranking-rank' }, (item.rank || '-')),
                    E('div', { 'class': 'usage-ranking-info' }, [
                        E('div', { 'class': 'usage-ranking-device' }, [
                            E('div', { 'class': 'usage-ranking-name' }, item.hostname || item.ip || item.mac || '-'),
                            E('div', { 'class': 'usage-ranking-meta' }, [
                                E('span', {}, item.ip || '-'),
                                E('span', {}, item.mac || '-'),
                                E('span', { 'class': 'usage-ranking-meta-total' }, formatSize(item.total_bytes || 0))
                            ])
                        ]),
                        E('div', { 'class': 'usage-ranking-stats' }, [
                            E('div', { 'class': 'usage-ranking-traffic' }, [
                                E('span', { 'class': 'usage-ranking-traffic-item tx' }, [
                                    E('span', { 'class': 'usage-ranking-traffic-arrow' }, '↑'),
                                    E('span', {}, formatSize(item.tx_bytes || 0))
                                ]),
                                E('span', { 'class': 'usage-ranking-traffic-item rx' }, [
                                    E('span', { 'class': 'usage-ranking-traffic-arrow' }, '↓'),
                                    E('span', {}, formatSize(item.rx_bytes || 0))
                                ]),
                                E('span', { 'class': 'usage-ranking-traffic-item total' }, [
                                    E('span', {}, formatSize(item.total_bytes || 0))
                                ])
                            ]),
                            E('div', { 'class': 'usage-ranking-percentage' }, (item.percentage || 0).toFixed(1) + '%')
                        ])
                    ])
                ]);

                rankingList.appendChild(rankingItem);
            });

            container.innerHTML = '';
            container.appendChild(rankingList);

            // 如果设备数量超过默认限制，显示控制栏
            if (data.length > USAGE_RANKING_DEFAULT_LIMIT) {
                var controls = E('div', { 'class': 'usage-ranking-controls' }, [
                    E('span', { 'class': 'usage-ranking-info-text' },
                        showAll
                            ? _('Showing all %d devices').format(data.length)
                            : _('Showing top %d of %d devices').format(displayData.length, data.length)
                    ),
                    E('button', {
                        'class': 'usage-ranking-toggle-btn',
                        'onclick': function () {
                            usageRankingShowAll = !usageRankingShowAll;
                            renderUsageRanking(usageRankingData, usageRankingShowAll);
                        }
                    }, showAll ? _('Show Top %d').format(USAGE_RANKING_DEFAULT_LIMIT) : _('Show All'))
                ]);
                container.appendChild(controls);
            }
        }

        function updateTrafficStatistics(customRange, callback) {
            // 准备查询参数
            var startMs = null;
            var endMs = null;
            var networkTypeSelect = document.getElementById('usage-ranking-network-type');
            var networkType = networkTypeSelect ? networkTypeSelect.value : 'wan';
            if (customRange && customRange.start_ms && customRange.end_ms) {
                startMs = customRange.start_ms;
                endMs = customRange.end_ms;
                console.log('Querying with custom range:', { start_ms: startMs, end_ms: endMs, network_type: networkType });
            } else {
                console.log('Querying with default range (no params), network_type:', networkType);
            }

            // 获取设备用量排行
            callGetTrafficUsageRanking(startMs, endMs, networkType).then(function (result) {
                console.log('Query result:', result);
                if (!result || !result.rankings) {
                    return;
                }

                usageRankingData = result.rankings;
                
                // 更新时间范围显示（包含上下行流量和总流量）
                var timeRangeEl = document.getElementById('usage-ranking-timerange');
                if (timeRangeEl && result.start_ms && result.end_ms) {
                    var timeRangeText = formatTimeRange(result.start_ms, result.end_ms);
                    var parts = [];
                    if (result.total_tx_bytes !== undefined && result.total_tx_bytes !== null) {
                        parts.push('↑' + formatSize(result.total_tx_bytes));
                    }
                    if (result.total_rx_bytes !== undefined && result.total_rx_bytes !== null) {
                        parts.push('↓' + formatSize(result.total_rx_bytes));
                    }
                    if (result.total_bytes !== undefined && result.total_bytes !== null) {
                        parts.push(formatSize(result.total_bytes));
                    }
                    if (parts.length > 0) {
                        timeRangeText += ' · ' + parts.join(' · ');
                    }
                    timeRangeEl.textContent = timeRangeText;
                }
                
                // 更新设备下拉框 - 获取完整的设备列表
                if (typeof latestDevices !== 'undefined' && latestDevices.length > 0) {
                    updateDeviceSelectForIncrements(latestDevices);
                } else {
                    // 如果还没有设备数据，先获取设备数据
                    callStatus().then(function(deviceResult) {
                        if (deviceResult && deviceResult.devices) {
                            latestDevices = deviceResult.devices;
                            updateDeviceSelectForIncrements(latestDevices);
                        }
                    }).catch(function(err) {
                        console.error('Failed to load device list for timeline:', err);
                    });
                }
                
                renderUsageRanking(usageRankingData, usageRankingShowAll);
                
                // 调用回调函数
                if (callback) callback();
            }).catch(function (err) {
                console.error('Failed to load usage ranking:', err);
                var container = document.getElementById('usage-ranking-container');
                if (container) {
                    container.innerHTML = '<div class="error-state">' + _('Failed to load data') + '</div>';
                }
                
                // 调用回调函数（即使失败也要移除 loading）
                if (callback) callback();
            });

        }
        
        function normalizeTrafficIncrementItem(item) {
            if (!item) return null;

            var tsMs = item.ts_ms;
            if (!tsMs && item.start_ts_ms) tsMs = item.start_ts_ms;
            if (!tsMs && item.end_ts_ms) tsMs = item.end_ts_ms;

            var rxBytes = (item.rx_bytes !== undefined && item.rx_bytes !== null) ? item.rx_bytes : null;
            var txBytes = (item.tx_bytes !== undefined && item.tx_bytes !== null) ? item.tx_bytes : null;
            var totalBytes = (item.total_bytes !== undefined && item.total_bytes !== null) ? item.total_bytes : null;

            if (rxBytes === null) {
                rxBytes = (item.wan_rx_bytes_inc || 0) + (item.lan_rx_bytes_inc || 0);
            }
            if (txBytes === null) {
                txBytes = (item.wan_tx_bytes_inc || 0) + (item.lan_tx_bytes_inc || 0);
            }
            if (totalBytes === null) {
                totalBytes = rxBytes + txBytes;
            }

            return Object.assign({}, item, {
                ts_ms: tsMs || 0,
                rx_bytes: rxBytes || 0,
                tx_bytes: txBytes || 0,
                total_bytes: totalBytes || 0
            });
        }

        function normalizeTrafficIncrementsList(increments) {
            if (!Array.isArray(increments)) return [];
            return increments.map(normalizeTrafficIncrementItem).filter(function (x) { return x; });
        }

        // 更新时间序列增量数据（使用 Traffic Timeline 自己的时间范围）
        function updateTrafficIncrements(startMs, endMs, aggregation, mac, callback) {
            // 如果没有传入时间范围，使用独立的时间范围变量
            if (!startMs || !endMs) {
                if (trafficIncrementsCustomRange) {
                    startMs = trafficIncrementsCustomRange.start_ms;
                    endMs = trafficIncrementsCustomRange.end_ms;
                }
            }
            
            // 获取筛选条件
            var aggregationSelect = document.getElementById('traffic-increments-aggregation');
            var macSelect = document.getElementById('traffic-increments-mac');
            var networkTypeSelect = document.getElementById('traffic-increments-network-type');
            
            var selectedAggregation = aggregation || (aggregationSelect ? aggregationSelect.value : 'hourly');
            var selectedMac = mac || (macSelect ? macSelect.value : 'all');
            var selectedNetworkType = networkTypeSelect ? networkTypeSelect.value : 'all';
            
            // 如果选择的是 "all"，传递 null 使用默认值
            if (selectedMac === 'all') {
                selectedMac = null;
            }
            if (!selectedNetworkType) {
                selectedNetworkType = null;
            }
            
            callGetTrafficUsageIncrements(startMs, endMs, selectedAggregation, selectedMac, selectedNetworkType).then(function (result) {
                if (!result || !result.increments) {
                    var container = document.getElementById('traffic-increments-container');
                    if (container) {
                        container.innerHTML = '<div class="loading-state">' + _('No data') + '</div>';
                    }
                    // 调用回调函数以移除 loading 状态
                    if (callback) callback();
                    return;
                }

                var normalizedIncrements = normalizeTrafficIncrementsList(result.increments);
                
                // 更新时间范围显示（包含上下行流量和总流量）
                var timeRangeEl = document.getElementById('traffic-increments-timerange');
                if (timeRangeEl && result.start_ms && result.end_ms) {
                    var timeRangeText = formatTimeRange(result.start_ms, result.end_ms);
                    var parts = [];
                    if (result.total_tx_bytes !== undefined && result.total_tx_bytes !== null) {
                        parts.push('↑' + formatSize(result.total_tx_bytes));
                    }
                    if (result.total_rx_bytes !== undefined && result.total_rx_bytes !== null) {
                        parts.push('↓' + formatSize(result.total_rx_bytes));
                    }
                    if (result.total_bytes !== undefined && result.total_bytes !== null) {
                        parts.push(formatSize(result.total_bytes));
                    }
                    if (parts.length > 0) {
                        timeRangeText += ' · ' + parts.join(' · ');
                    }
                    timeRangeEl.textContent = timeRangeText;
                }

                var container = document.getElementById('traffic-increments-container');
                if (!container) {
                    // 调用回调函数以移除 loading 状态
                    if (callback) callback();
                    return;
                }

                if (normalizedIncrements.length === 0) {
                    container.innerHTML = '<div class="loading-state">' + _('No data') + '</div>';
                    // 调用回调函数以移除 loading 状态
                    if (callback) callback();
                    return;
                }

                // 创建图表容器
                var chartContainer = E('div', { 'class': 'traffic-increments-chart' });
                var canvas = E('canvas', { 'id': 'traffic-increments-chart-canvas' });
                var tooltip = E('div', { 'class': 'traffic-increments-tooltip', 'id': 'traffic-increments-tooltip' });
                chartContainer.appendChild(canvas);
                chartContainer.appendChild(tooltip);

                // 创建图例
                var legend = E('div', { 'class': 'traffic-stats-legend' }, [
                    E('div', { 'class': 'traffic-stats-legend-item' }, [
                        E('span', { 'class': 'traffic-stats-legend-dot tx' }),
                        E('span', {}, _('Upload'))
                    ]),
                    E('div', { 'class': 'traffic-stats-legend-item' }, [
                        E('span', { 'class': 'traffic-stats-legend-dot rx' }),
                        E('span', {}, _('Download'))
                    ])
                ]);

                // 创建汇总信息
                var summary = E('div', { 'class': 'traffic-increments-summary' }, [
                    E('div', { 'class': 'traffic-increments-summary-item' }, [
                        E('div', { 'class': 'traffic-increments-summary-label' }, _('Total Upload')),
                        E('div', { 'class': 'traffic-increments-summary-value' }, formatSize(result.total_tx_bytes || 0))
                    ]),
                    E('div', { 'class': 'traffic-increments-summary-item' }, [
                        E('div', { 'class': 'traffic-increments-summary-label' }, _('Total Download')),
                        E('div', { 'class': 'traffic-increments-summary-value' }, formatSize(result.total_rx_bytes || 0))
                    ]),
                    E('div', { 'class': 'traffic-increments-summary-item' }, [
                        E('div', { 'class': 'traffic-increments-summary-label' }, _('Total')),
                        E('div', { 'class': 'traffic-increments-summary-value' }, formatSize(result.total_bytes || 0))
                    ])
                ]);

                container.innerHTML = '';
                container.appendChild(chartContainer);
                container.appendChild(legend);
                container.appendChild(summary);

                // 绘制图表
                setTimeout(function () {
                    var aggregation = result.aggregation || 'hourly';
                    drawIncrementsChart(canvas, normalizedIncrements, aggregation);
                    
                    // 添加鼠标悬浮事件
                    setupChartTooltip(canvas, tooltip, normalizedIncrements, aggregation, selectedNetworkType);
                    
                    // 调用回调函数
                    if (callback) callback();
                }, 100);
            }).catch(function (err) {
                console.error('Failed to load traffic increments:', err);
                var container = document.getElementById('traffic-increments-container');
                if (container) {
                    container.innerHTML = '<div class="error-state">' + _('Failed to load data') + '</div>';
                }
                
                // 调用回调函数（即使失败也要移除 loading）
                if (callback) callback();
            });
        }
        
        // 更新设备下拉框
        function updateDeviceSelectForIncrements(devices) {
            var macSelect = document.getElementById('traffic-increments-mac');
            if (!macSelect) return;

            // 保存当前选中的值
            var currentValue = macSelect.value;

            // 清空现有选项（保留 "All Devices"）
            macSelect.innerHTML = '';
            macSelect.appendChild(E('option', { 'value': 'all' }, _('All Devices')));

            // 对设备列表进行排序：在线设备在前，离线设备在后，然后按IP地址从小到大排序
            var sortedDevices = devices.slice().sort(function (a, b) {
                var aOnline = isDeviceOnline(a);
                var bOnline = isDeviceOnline(b);

                // 首先按在线状态排序：在线设备在前
                if (aOnline && !bOnline) return -1;
                if (!aOnline && bOnline) return 1;

                // 在线状态相同时，按IP地址排序
                var aIp = a.ip || '';
                var bIp = b.ip || '';

                // 将IP地址转换为数字进行比较
                var aIpParts = aIp.split('.').map(function (part) { return parseInt(part) || 0; });
                var bIpParts = bIp.split('.').map(function (part) { return parseInt(part) || 0; });

                // 逐段比较IP地址
                for (var i = 0; i < 4; i++) {
                    var aPart = aIpParts[i] || 0;
                    var bPart = bIpParts[i] || 0;
                    if (aPart !== bPart) {
                        return aPart - bPart;
                    }
                }

                // IP地址相同时，按MAC地址排序
                return (a.mac || '').localeCompare(b.mac || '');
            });

            // 添加设备选项
            sortedDevices.forEach(function(device) {
                if (device.mac) {
                    var label = (device.hostname || device.ip || device.mac || '-') + (device.ip ? ' (' + device.ip + ')' : '') + (device.mac ? ' [' + device.mac + ']' : '');
                    var option = E('option', { 'value': device.mac }, label);
                    macSelect.appendChild(option);
                }
            });

            // 恢复之前选中的值（如果还在列表中）
            if (currentValue && currentValue !== 'all') {
                var optionExists = false;
                for (var i = 0; i < macSelect.options.length; i++) {
                    if (macSelect.options[i].value === currentValue) {
                        optionExists = true;
                        break;
                    }
                }
                if (optionExists) {
                    macSelect.value = currentValue;
                } else {
                    macSelect.value = 'all';
                }
            }
        }
        
        // 绘制时间序列增量图表
        function drawIncrementsChart(canvas, increments, aggregation) {
            if (!canvas || !increments || increments.length === 0) return;

            var dpr = window.devicePixelRatio || 1;
            var cssWidth = canvas.parentElement.offsetWidth || 600;
            var cssHeight = 300;
            
            canvas.style.width = cssWidth + 'px';
            canvas.style.height = cssHeight + 'px';
            
            canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
            canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
            
            var ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            var width = cssWidth;
            var height = cssHeight;

            // 计算最大值
            var maxValue = 0;
            increments.forEach(function (item) {
                maxValue = Math.max(maxValue, item.total_bytes || 0);
            });

            if (maxValue === 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(_('No data'), width / 2, height / 2);
                return;
            }

            // 动态测量Y轴最大标签宽度，增大左边距
            var fontSize = 12;
            ctx.font = fontSize + 'px sans-serif';
            var maxLabelText = formatSize(maxValue);
            var zeroLabelText = formatSize(0);
            var maxLabelWidth = Math.max(ctx.measureText(maxLabelText).width, ctx.measureText(zeroLabelText).width);

            var padding = { top: 20, right: 20, bottom: 40, left: 80 };
            padding.left = Math.max(padding.left, Math.ceil(maxLabelWidth) + 30); // 确保右侧时间不被裁剪
            var chartWidth = width - padding.left - padding.right;
            var chartHeight = height - padding.top - padding.bottom;

            // 清空画布
            ctx.clearRect(0, 0, width, height);

            // 轴与网格样式：对齐 Realtime Traffic Trends
            var axisTextColor = '#9ca3af';
            var gridColor = 'rgba(148,163,184,0.08)';
            ctx.font = '12px sans-serif';

            // 绘制网格线和标签
            var gridLines = 4;
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 0.8;
            for (var i = 0; i <= gridLines; i++) {
                var y = padding.top + (chartHeight / gridLines) * i;
                var value = maxValue * (1 - i / gridLines);

                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.stroke();

                ctx.fillStyle = axisTextColor;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                var yLabelY = (i === gridLines) ? y - 4 : y;
                ctx.fillText(formatSize(value), padding.left - 8, yLabelY);
            }

            // 绘制堆叠柱状图
            var barWidth = chartWidth / increments.length;
            var barDisplayWidth = barWidth * 0.7; // 柱子显示宽度（留出间距）
            
            var baseY = height - padding.bottom;

            function px(v) { return Math.round(v); }
            function pxStroke(v) { return Math.round(v) + 0.5; }
            
            increments.forEach(function (item, index) {
                var barX = padding.left + barWidth * index + (barWidth - barDisplayWidth) / 2;
                var rxHeight = chartHeight * ((item.rx_bytes || 0) / maxValue);
                var txHeight = chartHeight * ((item.tx_bytes || 0) / maxValue);
                var totalHeight = rxHeight + txHeight;

                var x = px(barX);
                var w = Math.max(1, px(barDisplayWidth));
                var totalH = px(totalHeight);
                var rxH = px(rxHeight);
                var txH = px(txHeight);
                var yBase = px(baseY);
                
                // 绘制 RX 柱子（下载，青色）- 底部
                if (rxH > 0) {
                    var rxY = yBase - rxH;
                    ctx.fillStyle = BANDIX_COLOR_DOWNLOAD;
                    ctx.fillRect(x, rxY, w, rxH);

                    // 添加边框
                    ctx.strokeStyle = '#0891b2';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(pxStroke(x), pxStroke(rxY), w, rxH);
                }

                // 绘制 TX 柱子（上传，橙色）- 堆叠在 RX 上面
                if (txH > 0) {
                    var txY = yBase - totalH;
                    ctx.fillStyle = BANDIX_COLOR_UPLOAD;
                    ctx.fillRect(x, txY, w, txH);

                    // 添加边框
                    ctx.strokeStyle = '#ea580c';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(pxStroke(x), pxStroke(txY), w, txH);
                }
            });
            
            // 保存柱子的位置信息，用于鼠标悬浮检测
            canvas.barPositions = [];
            increments.forEach(function (item, index) {
                var barX = padding.left + barWidth * index + (barWidth - barDisplayWidth) / 2;
                canvas.barPositions.push({
                    x: px(barX),
                    width: Math.max(1, px(barDisplayWidth)),
                    index: index,
                    item: item
                });
            });
            canvas.__bandixIncrements = { increments: increments, aggregation: aggregation };

            // 绘制时间标签
            ctx.fillStyle = axisTextColor;
            ctx.textAlign = 'center';
            var isMobile = window.innerWidth <= 768;
            var labelStep = Math.max(1, Math.floor(increments.length / 6));
            var isDaily = aggregation === 'daily';
            var barWidth = chartWidth / increments.length;
            
            increments.forEach(function (item, index) {
                var shouldShowLabel = false;
                
                if (isMobile) {
                    // 移动端：只显示第一个和最后一个
                    shouldShowLabel = index === 0 || index === increments.length - 1;
                } else {
                    // 桌面端：按原来的逻辑显示
                    shouldShowLabel = index % labelStep === 0 || index === increments.length - 1;
                }
                
                if (shouldShowLabel) {
                    // 标签居中显示在每个柱子组的中心
                    var x = padding.left + barWidth * (index + 0.5);
                    var date = new Date(item.ts_ms);
                    var timeStr;

                    if (isDaily) {
                        // 按天聚合：只显示日期
                        var year = date.getFullYear();
                        var month = (date.getMonth() + 1).toString().padStart(2, '0');
                        var day = date.getDate().toString().padStart(2, '0');
                        timeStr = month + '/' + day;
                    } else {
                        // 按小时聚合：显示整点小时
                        // 使用 start_ts_ms 来确定这个时间段代表哪个小时
                        var startTs = item.start_ts_ms || item.ts_ms;
                        var startDate = new Date(startTs);

                        // 使用开始时间的整点小时
                        var hour = startDate.getHours();
                        timeStr = (hour < 10 ? '0' : '') + hour + ':00';
                    }

                    ctx.fillText(timeStr, x, height - padding.bottom + 20);
                }
            });

            // 如果存在 hoverIndex，则绘制垂直虚线（鼠标对着的柱子）
            // 移动端不绘制虚线
            try {
                if (isMobile) return; // 移动端不绘制悬浮虚线

                var hoverIndex = canvas.__bandixIncrementsHoverIndex;
                if (typeof hoverIndex === 'number' && hoverIndex >= 0 && hoverIndex < increments.length) {
                    var barX = padding.left + barWidth * hoverIndex + (barWidth - barDisplayWidth) / 2;
                    var hoverX = barX + barDisplayWidth / 2; // 虚线在柱子中心

                    ctx.save();
                    ctx.strokeStyle = 'rgba(156,163,175,0.9)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.moveTo(hoverX, padding.top);
                    ctx.lineTo(hoverX, height - padding.bottom);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                }
            } catch (e) { /* 安全兜底 */ }
        }
        
        // 设置图表 tooltip
        function setupChartTooltip(canvas, tooltip, increments, aggregation, networkType) {
            if (!canvas || !tooltip || !increments || increments.length === 0) return;
            
            var formatTime = function(tsMs, isDaily) {
                var date = new Date(tsMs);
                if (isDaily) {
                    var year = date.getFullYear();
                    var month = (date.getMonth() + 1).toString().padStart(2, '0');
                    var day = date.getDate().toString().padStart(2, '0');
                    return year + '/' + month + '/' + day;
                } else {
                    var year = date.getFullYear();
                    var month = (date.getMonth() + 1).toString().padStart(2, '0');
                    var day = date.getDate().toString().padStart(2, '0');
                    var hours = date.getHours().toString().padStart(2, '0');
                    var minutes = date.getMinutes().toString().padStart(2, '0');
                    return year + '/' + month + '/' + day + ' ' + hours + ':' + minutes;
                }
            };

            var formatTimeRange = function(startTsMs, endTsMs, isDaily) {
                var startTime = formatTime(startTsMs, isDaily);
                var endTime = formatTime(endTsMs, isDaily);

                if (isDaily) {
                    return startTime + ' - ' + endTime;
                } else {
                    // 如果是同一日期，只显示一次日期
                    var startDate = new Date(startTsMs);
                    var endDate = new Date(endTsMs);
                    if (startDate.toDateString() === endDate.toDateString()) {
                        var year = startDate.getFullYear();
                        var month = (startDate.getMonth() + 1).toString().padStart(2, '0');
                        var day = startDate.getDate().toString().padStart(2, '0');
                        var startTimeOnly = startDate.getHours().toString().padStart(2, '0') + ':' +
                                          startDate.getMinutes().toString().padStart(2, '0');
                        var endTimeOnly = endDate.getHours().toString().padStart(2, '0') + ':' +
                                        endDate.getMinutes().toString().padStart(2, '0');
                        return year + '/' + month + '/' + day + ' ' + startTimeOnly + ' - ' + endTimeOnly;
                    } else {
                        return startTime + ' - ' + endTime;
                    }
                }
            };
            
            var isDaily = aggregation === 'daily';
            var padding = { top: 20, right: 20, bottom: 40, left: 80 };
            var chartWidth = (canvas.parentElement.offsetWidth || 600) - padding.left - padding.right;
            var barWidth = chartWidth / increments.length;
            var barDisplayWidth = barWidth * 0.7;
            
            canvas.addEventListener('mousemove', function(e) {
                var rect = canvas.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                
                // 检查鼠标是否在图表区域内
                if (x < padding.left || x > rect.width - padding.right ||
                    y < padding.top || y > rect.height - padding.bottom) {
                    // 清除悬浮索引并重新绘制图表以清除虚线
                    delete canvas.__bandixIncrementsHoverIndex;
                    drawIncrementsChart(canvas, increments, aggregation);
                    tooltip.style.display = 'none';
                    return;
                }
                
                // 找到对应的柱子
                var barIndex = -1;
                if (canvas.barPositions) {
                    for (var i = 0; i < canvas.barPositions.length; i++) {
                        var bar = canvas.barPositions[i];
                        if (x >= bar.x && x <= bar.x + bar.width) {
                            barIndex = bar.index;
                            break;
                        }
                    }
                }
                
                if (barIndex >= 0 && barIndex < increments.length) {
                    // 设置悬浮索引，用于绘制垂直虚线
                    var prevHoverIndex = canvas.__bandixIncrementsHoverIndex;
                    canvas.__bandixIncrementsHoverIndex = barIndex;

                    // 只有当 hoverIndex 发生变化时才重新绘制
                    if (prevHoverIndex !== barIndex) {
                        drawIncrementsChart(canvas, increments, aggregation);
                    }

                    var item = increments[barIndex];
                    var timeStr = formatTimeRange(item.start_ts_ms || item.ts_ms, item.end_ts_ms || item.ts_ms, isDaily);

                    // Get speed unit from UCI config
                    var speedUnit = uci.get('bandix', 'traffic', 'speed_unit') || 'bytes';

                    var tooltipContent = '<div class="traffic-increments-tooltip-title">' + timeStr + '</div>';

                    // 根据网络类型显示相应的section
                    if (networkType === 'wan') {
                        tooltipContent +=
                            // WAN Traffic Section
                            '<div class="traffic-increments-tooltip-section">' +
                                '<div class="traffic-increments-tooltip-section-title">' + _('WAN Traffic') + '</div>' +

                                // 用量数据（大字体，带颜色）
                                '<div class="ht-kpis">' +
                                '<div class="ht-kpi up">' +
                                '<div class="ht-k-label">WAN Upload</div>' +
                                '<div class="ht-k-value">' + formatSize(item.wan_tx_bytes_inc || 0) + '</div>' +
                                '</div>' +
                                '<div class="ht-kpi down">' +
                                '<div class="ht-k-label">WAN Download</div>' +
                                '<div class="ht-k-value">' + formatSize(item.wan_rx_bytes_inc || 0) + '</div>' +
                                '</div>' +
                                '</div>' +

                                // 速度统计分组
                                '<div class="ht-divider"></div>' +
                                '<div class="ht-section-title">' + _('Upload Statistics') + '</div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Average') + '</span><span class="ht-val">' + formatByterate(item.wan_tx_rate_avg || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">P95</span><span class="ht-val">' + formatByterate(item.wan_tx_rate_p95 || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Maximum') + '</span><span class="ht-val">' + formatByterate(item.wan_tx_rate_max || 0, speedUnit) + '</span></div>' +

                                '<div class="ht-section-title" style="margin-top: 8px;">' + _('Download Statistics') + '</div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Average') + '</span><span class="ht-val">' + formatByterate(item.wan_rx_rate_avg || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">P95</span><span class="ht-val">' + formatByterate(item.wan_rx_rate_p95 || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Maximum') + '</span><span class="ht-val">' + formatByterate(item.wan_rx_rate_max || 0, speedUnit) + '</span></div>' +
                            '</div>';
                    } else if (networkType === 'lan') {
                        tooltipContent +=
                            // LAN Traffic Section
                            '<div class="traffic-increments-tooltip-section">' +
                                '<div class="traffic-increments-tooltip-section-title">' + _('LAN Traffic') + '</div>' +

                                // 用量数据（大字体，带颜色）
                                '<div class="ht-kpis">' +
                                '<div class="ht-kpi up">' +
                                '<div class="ht-k-label">LAN Upload</div>' +
                                '<div class="ht-k-value">' + formatSize(item.lan_tx_bytes_inc || 0) + '</div>' +
                                '</div>' +
                                '<div class="ht-kpi down">' +
                                '<div class="ht-k-label">LAN Download</div>' +
                                '<div class="ht-k-value">' + formatSize(item.lan_rx_bytes_inc || 0) + '</div>' +
                                '</div>' +
                                '</div>' +

                                // 速度统计分组
                                '<div class="ht-divider"></div>' +
                                '<div class="ht-section-title">' + _('Upload Statistics') + '</div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Average') + '</span><span class="ht-val">' + formatByterate(item.lan_tx_rate_avg || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">P95</span><span class="ht-val">' + formatByterate(item.lan_tx_rate_p95 || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Maximum') + '</span><span class="ht-val">' + formatByterate(item.lan_tx_rate_max || 0, speedUnit) + '</span></div>' +

                                '<div class="ht-section-title" style="margin-top: 8px;">' + _('Download Statistics') + '</div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Average') + '</span><span class="ht-val">' + formatByterate(item.lan_rx_rate_avg || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">P95</span><span class="ht-val">' + formatByterate(item.lan_rx_rate_p95 || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Maximum') + '</span><span class="ht-val">' + formatByterate(item.lan_rx_rate_max || 0, speedUnit) + '</span></div>' +
                            '</div>';
                    } else {
                        // networkType === 'all' 或其他情况，显示所有section
                        tooltipContent +=
                            // WAN Traffic Section
                            '<div class="traffic-increments-tooltip-section">' +
                                '<div class="traffic-increments-tooltip-section-title">' + _('WAN Traffic') + '</div>' +

                                // 用量数据（大字体，带颜色）
                                '<div class="ht-kpis">' +
                                '<div class="ht-kpi up">' +
                                '<div class="ht-k-label">WAN Upload</div>' +
                                '<div class="ht-k-value">' + formatSize(item.wan_tx_bytes_inc || 0) + '</div>' +
                                '</div>' +
                                '<div class="ht-kpi down">' +
                                '<div class="ht-k-label">WAN Download</div>' +
                                '<div class="ht-k-value">' + formatSize(item.wan_rx_bytes_inc || 0) + '</div>' +
                                '</div>' +
                                '</div>' +

                                // 速度统计分组
                                '<div class="ht-divider"></div>' +
                                '<div class="ht-section-title">' + _('Upload Statistics') + '</div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Average') + '</span><span class="ht-val">' + formatByterate(item.wan_tx_rate_avg || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">P95</span><span class="ht-val">' + formatByterate(item.wan_tx_rate_p95 || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Maximum') + '</span><span class="ht-val">' + formatByterate(item.wan_tx_rate_max || 0, speedUnit) + '</span></div>' +

                                '<div class="ht-section-title" style="margin-top: 8px;">' + _('Download Statistics') + '</div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Average') + '</span><span class="ht-val">' + formatByterate(item.wan_rx_rate_avg || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">P95</span><span class="ht-val">' + formatByterate(item.wan_rx_rate_p95 || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Maximum') + '</span><span class="ht-val">' + formatByterate(item.wan_rx_rate_max || 0, speedUnit) + '</span></div>' +
                            '</div>' +

                            // LAN Traffic Section
                            '<div class="traffic-increments-tooltip-section">' +
                                '<div class="traffic-increments-tooltip-section-title">' + _('LAN Traffic') + '</div>' +

                                // 用量数据（大字体，带颜色）
                                '<div class="ht-kpis">' +
                                '<div class="ht-kpi up">' +
                                '<div class="ht-k-label">LAN Upload</div>' +
                                '<div class="ht-k-value">' + formatSize(item.lan_tx_bytes_inc || 0) + '</div>' +
                                '</div>' +
                                '<div class="ht-kpi down">' +
                                '<div class="ht-k-label">LAN Download</div>' +
                                '<div class="ht-k-value">' + formatSize(item.lan_rx_bytes_inc || 0) + '</div>' +
                                '</div>' +
                                '</div>' +

                                // 速度统计分组
                                '<div class="ht-divider"></div>' +
                                '<div class="ht-section-title">' + _('Upload Statistics') + '</div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Average') + '</span><span class="ht-val">' + formatByterate(item.lan_tx_rate_avg || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">P95</span><span class="ht-val">' + formatByterate(item.lan_tx_rate_p95 || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Maximum') + '</span><span class="ht-val">' + formatByterate(item.lan_tx_rate_max || 0, speedUnit) + '</span></div>' +

                                '<div class="ht-section-title" style="margin-top: 8px;">' + _('Download Statistics') + '</div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Average') + '</span><span class="ht-val">' + formatByterate(item.lan_rx_rate_avg || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">P95</span><span class="ht-val">' + formatByterate(item.lan_rx_rate_p95 || 0, speedUnit) + '</span></div>' +
                                '<div class="ht-row"><span class="ht-key">' + _('Maximum') + '</span><span class="ht-val">' + formatByterate(item.lan_rx_rate_max || 0, speedUnit) + '</span></div>' +
                            '</div>';
                    }

                    tooltip.innerHTML = tooltipContent;

                    tooltip.style.display = 'block';

                    // 强制重新计算布局以获取正确的尺寸
                    tooltip.offsetHeight; // 触发重新计算

                    // 获取tooltip的实际尺寸
                    var tooltipWidth = tooltip.offsetWidth || 280;
                    var tooltipHeight = tooltip.offsetHeight || 200;

                    var tooltipX = e.clientX - rect.left + 20;
                    var tooltipY = e.clientY - rect.top - 20;

                    // 确保 tooltip 不超出画布边界
                    if (tooltipX + tooltipWidth > rect.width) {
                        tooltipX = e.clientX - rect.left - tooltipWidth - 20;
                    }
                    if (tooltipY + tooltipHeight > rect.height) {
                        tooltipY = e.clientY - rect.top - tooltipHeight - 20;
                    }

                    // 确保tooltip不会超出左侧边界
                    if (tooltipX < 0) {
                        tooltipX = 10;
                    }
                    // 确保tooltip不会超出顶部边界
                    if (tooltipY < 0) {
                        tooltipY = 10;
                    }

                    tooltip.style.left = tooltipX + 'px';
                    tooltip.style.top = tooltipY + 'px';
                } else {
                    // 清除悬浮索引
                    delete canvas.__bandixIncrementsHoverIndex;
                    tooltip.style.display = 'none';
                }
            });
            
            canvas.addEventListener('mouseleave', function() {
                // 清除悬浮索引并重新绘制图表以清除虚线
                delete canvas.__bandixIncrementsHoverIndex;
                drawIncrementsChart(canvas, increments, aggregation);
                tooltip.style.display = 'none';
            });
        }

        // 轮询获取数据
        poll.add(updateDeviceData, 1);

        // 轮询获取定时限速规则（每5秒）
        poll.add(function () {
            return fetchAllScheduleRules().then(function () {
                // 规则更新后，重新渲染表格以显示最新的规则状态
                if (window.__bandixRenderTable) {
                    window.__bandixRenderTable();
                }
            });
        }, 5000);

        // Traffic Statistics 不再自动刷新，改为手动查询

        // 立即执行一次，不等待轮询
        updateDeviceData();
        refreshWhitelistStatus();
        fetchAllScheduleRules();
        updateTrafficStatistics();
        
        // 初始化时间范围查询功能
        setTimeout(function() {
            var startDateInput = document.getElementById('usage-ranking-start-date');
            var endDateInput = document.getElementById('usage-ranking-end-date');
            var queryBtn = document.getElementById('usage-ranking-query-btn');
            var resetBtn = document.getElementById('usage-ranking-reset-btn');
            var networkTypeSelect = document.getElementById('usage-ranking-network-type');
            var timeline = document.getElementById('usage-ranking-timeline');
            var timelineRange = document.getElementById('usage-ranking-timeline-range');
			var sectionEl = startDateInput ? (startDateInput.closest('.traffic-stats-section') || document) : document;
            var presetBtns = sectionEl.querySelectorAll('.usage-ranking-query-presets .cbi-button[data-preset]');
            
            if (!presetBtns.length || !startDateInput || !endDateInput || !queryBtn || !resetBtn) {
                console.error('Time range query elements not found');
                return;
            }
            
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var todayMs = today.getTime();
            
            var formatDateInput = function(date) {
                var year = date.getFullYear();
                var month = (date.getMonth() + 1).toString().padStart(2, '0');
                var day = date.getDate().toString().padStart(2, '0');
                return year + '-' + month + '-' + day;
            };
            
            // 设置最大日期为今天（不能选择未来）
            var todayStr = formatDateInput(today);
            startDateInput.max = todayStr;
            endDateInput.max = todayStr;
            
            var updateTimeline = function(startDate, endDate) {
                if (!timeline || !timelineRange || !startDate || !endDate) return;
                
                var startMs = new Date(startDate + 'T00:00:00').getTime();
                var endMs = new Date(endDate + 'T23:59:59').getTime();
                
                // 计算时间范围在时间轴上的位置（假设时间轴代表最近一年）
                var oneYearAgoMs = todayMs - 365 * 24 * 60 * 60 * 1000;
                var totalRange = todayMs - oneYearAgoMs;
                var selectedRange = endMs - startMs;
                
                var leftPercent = Math.max(0, ((startMs - oneYearAgoMs) / totalRange) * 100);
                var widthPercent = Math.min(100, (selectedRange / totalRange) * 100);
                
                timelineRange.style.left = leftPercent + '%';
                timelineRange.style.width = widthPercent + '%';
            };
            
            var setDateRange = function(startDate, endDate, preset) {
                startDateInput.value = formatDateInput(new Date(startDate));
                endDateInput.value = formatDateInput(new Date(endDate));
                
                // 更新快捷按钮状态
                presetBtns.forEach(function(btn) {
                    btn.className = 'cbi-button cbi-button-neutral';
                });
                if (preset) {
                    var presetBtn = sectionEl.querySelector('.usage-ranking-query-presets .cbi-button[data-preset="' + preset + '"]');
                    if (presetBtn) presetBtn.className = 'cbi-button cbi-button-positive';
                }
                
                // 更新时间轴
                updateTimeline(startDateInput.value, endDateInput.value);
            };
            
            var queryData = function() {
                var startDate = startDateInput.value;
                var endDate = endDateInput.value;

                if (!startDate || !endDate) {
                    alert(_('Please select both start and end dates'));
                    return;
                }

                var startMs = new Date(startDate + 'T00:00:00').getTime();
                var endMs = new Date(endDate + 'T23:59:59').getTime();

                if (startMs > endMs) {
                    alert(_('Start date must be earlier than end date'));
                    return;
                }

                usageRankingCustomRange = {
                    start_ms: startMs,
                    end_ms: endMs
                };

                // 设置 loading 状态（使用 bandix-loading，避免与主题的 loading 冲突导致尺寸变化）
                if (queryBtn) {
                    queryBtn.disabled = true;
                    queryBtn.classList.add('bandix-loading');
                }

                console.log('Querying with range:', usageRankingCustomRange);

                // 确保无论成功还是失败，都会移除 loading 状态
                var removeLoading = function() {
                    if (queryBtn) {
                        queryBtn.disabled = false;
                        queryBtn.classList.remove('bandix-loading');
                    }
                };

                try {
                    updateTrafficStatistics(usageRankingCustomRange, removeLoading);
                } catch (error) {
                    console.error('Query failed:', error);
                    removeLoading();
                }
            };
            
            // 快捷选项按钮事件
            presetBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var preset = this.getAttribute('data-preset');
                    var startDate, endDate;
                    
                    switch(preset) {
                        case 'today':
                            startDate = new Date(today);
                            endDate = new Date(today);
                            break;
                        case 'thisweek':
                            // 本周：周一到今天
                            var dayOfWeek = today.getDay(); // 0=周日, 1=周一, ..., 6=周六
                            var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 计算到本周一的偏移天数
                            startDate = new Date(todayMs + mondayOffset * 24 * 60 * 60 * 1000);
                            startDate.setHours(0, 0, 0, 0);
                            endDate = new Date(today);
                            break;
                        case 'lastweek':
                            // 上周：周一到周日（完整的一周）
                            var lastWeekDayOfWeek = today.getDay();
                            // 计算到上周一的偏移天数
                            var lastWeekMondayOffset = lastWeekDayOfWeek === 0 ? -13 : -6 - lastWeekDayOfWeek;
                            startDate = new Date(todayMs + lastWeekMondayOffset * 24 * 60 * 60 * 1000);
                            startDate.setHours(0, 0, 0, 0);
                            endDate = new Date(startDate);
                            endDate.setDate(endDate.getDate() + 6); // 上周日（周一+6天）
                            endDate.setHours(23, 59, 59, 999);
                            break;
                        case 'thismonth':
                            // 本月：1号到今天
                            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                            endDate = new Date(today);
                            break;
                        case 'lastmonth':
                            // 上月：1号到最后一天
                            var lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                            startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
                            endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0); // 上个月的最后一天
                            break;
                        case '7days':
                            startDate = new Date(todayMs - 6 * 24 * 60 * 60 * 1000);
                            endDate = new Date(today);
                            break;
                        case '30days':
                            startDate = new Date(todayMs - 29 * 24 * 60 * 60 * 1000);
                            endDate = new Date(today);
                            break;
                        case '90days':
                            startDate = new Date(todayMs - 89 * 24 * 60 * 60 * 1000);
                            endDate = new Date(today);
                            break;
                        case '1year':
                            startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
                            endDate = new Date(today);
                            break;
                    }
                    
                    setDateRange(startDate, endDate, preset);
                    queryData();
                });
            });
            
            // 日期输入变化事件
            startDateInput.addEventListener('change', function() {
                updateTimeline(this.value, endDateInput.value);
            });
            
            endDateInput.addEventListener('change', function() {
                updateTimeline(startDateInput.value, this.value);
            });
            
            // 查询按钮
            if (queryBtn) {
                queryBtn.addEventListener('click', queryData);
            }

            // 网络类型切换后自动查询（与 Traffic Timeline 行为一致）
            if (networkTypeSelect) {
                networkTypeSelect.addEventListener('change', function () {
                    if (queryBtn) {
                        queryBtn.disabled = true;
                        queryBtn.classList.add('bandix-loading');
                    }

                    var removeLoading = function () {
                        if (queryBtn) {
                            queryBtn.disabled = false;
                            queryBtn.classList.remove('bandix-loading');
                        }
                    };

                    try {
                        updateTrafficStatistics(usageRankingCustomRange, removeLoading);
                    } catch (e) {
                        removeLoading();
                    }
                });
            }
            
            // 重置按钮
            if (resetBtn) {
                resetBtn.addEventListener('click', function() {
                    var oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
                    setDateRange(oneYearAgo, today, '1year');
                    queryData();
                });
            }
            
            // 初始化：默认选择最近一年
            var oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            setDateRange(oneYearAgo, today, '1year');
            
            // 设置初始时间范围并自动加载数据（结束时间为当天的 23:59:59）
            var startMs = oneYearAgo.getTime();
            var endToday = new Date(today);
            endToday.setHours(23, 59, 59, 999);
            var endMs = endToday.getTime();
            usageRankingCustomRange = {
                start_ms: startMs,
                end_ms: endMs
            };
            // 使用初始时间范围重新加载数据
            updateTrafficStatistics(usageRankingCustomRange);
        }, 500);
        
        // 初始化时间序列筛选条件
        setTimeout(function() {
            var aggregationSelect = document.getElementById('traffic-increments-aggregation');
            var macSelect = document.getElementById('traffic-increments-mac');
            var networkTypeSelect = document.getElementById('traffic-increments-network-type');
            
            if (aggregationSelect) {
                aggregationSelect.addEventListener('change', function() {
                    // 使用 Traffic Timeline 自己的时间范围
                    updateTrafficIncrements();
                });
            }
            
            if (macSelect) {
                macSelect.addEventListener('change', function() {
                    // 使用 Traffic Timeline 自己的时间范围
                    updateTrafficIncrements();
                });
            }

            if (networkTypeSelect) {
                networkTypeSelect.addEventListener('change', function() {
                    updateTrafficIncrements();
                });
            }
        }, 600);
        
        // 初始化 Traffic Timeline 时间范围选择功能
        setTimeout(function() {
            var startDateInput = document.getElementById('traffic-increments-start-date');
            var endDateInput = document.getElementById('traffic-increments-end-date');
            var queryBtn = document.getElementById('traffic-increments-query-btn');
            var resetBtn = document.getElementById('traffic-increments-reset-btn');
			var sectionEl = startDateInput ? (startDateInput.closest('.traffic-stats-section') || document) : document;
            var presetBtns = sectionEl.querySelectorAll('.usage-ranking-query-presets .cbi-button[data-preset]');
            var timeline = document.getElementById('traffic-increments-timeline');
            var timelineRange = document.getElementById('traffic-increments-timeline-range');
            
            if (!presetBtns.length || !startDateInput || !endDateInput || !queryBtn || !resetBtn) {
                console.error('Traffic Timeline time range query elements not found');
                return;
            }
            
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var todayMs = today.getTime();
            
            var formatDateInput = function(date) {
                var year = date.getFullYear();
                var month = (date.getMonth() + 1).toString().padStart(2, '0');
                var day = date.getDate().toString().padStart(2, '0');
                return year + '-' + month + '-' + day;
            };
            
            // 设置最大日期为今天（不能选择未来）
            var todayStr = formatDateInput(today);
            startDateInput.max = todayStr;
            endDateInput.max = todayStr;

            var updateTimeline = function(startDate, endDate) {
                if (!timeline || !timelineRange || !startDate || !endDate) return;
                
                var startMs = new Date(startDate + 'T00:00:00').getTime();
                var endMs = new Date(endDate + 'T23:59:59').getTime();
                
                var oneYearAgoMs = todayMs - 365 * 24 * 60 * 60 * 1000;
                var totalRange = todayMs - oneYearAgoMs;
                var selectedRange = endMs - startMs;
                
                var leftPercent = Math.max(0, ((startMs - oneYearAgoMs) / totalRange) * 100);
                var widthPercent = Math.min(100, (selectedRange / totalRange) * 100);
                
                timelineRange.style.left = leftPercent + '%';
                timelineRange.style.width = widthPercent + '%';
            };
            
            var setDateRange = function(startDate, endDate, preset) {
                startDateInput.value = formatDateInput(new Date(startDate));
                endDateInput.value = formatDateInput(new Date(endDate));
                
                // 更新快捷按钮状态
                presetBtns.forEach(function(btn) {
                    btn.className = 'cbi-button cbi-button-neutral';
                });
                if (preset) {
                    var presetBtn = sectionEl.querySelector('.usage-ranking-query-presets .cbi-button[data-preset="' + preset + '"]');
                    if (presetBtn) presetBtn.className = 'cbi-button cbi-button-positive';
                }

                updateTimeline(startDateInput.value, endDateInput.value);
            };
            
            var queryData = function() {
                var startDate = startDateInput.value;
                var endDate = endDateInput.value;

                if (!startDate || !endDate) {
                    alert(_('Please select both start and end dates'));
                    return;
                }

                var startMs = new Date(startDate + 'T00:00:00').getTime();
                var endMs = new Date(endDate + 'T23:59:59').getTime();

                if (startMs > endMs) {
                    alert(_('Start date must be earlier than end date'));
                    return;
                }

                trafficIncrementsCustomRange = {
                    start_ms: startMs,
                    end_ms: endMs
                };

                // 设置 loading 状态（使用 bandix-loading，避免与主题的 loading 冲突导致尺寸变化）
                if (queryBtn) {
                    queryBtn.disabled = true;
                    queryBtn.classList.add('bandix-loading');
                }

                console.log('Traffic Timeline querying with range:', trafficIncrementsCustomRange);

                // 确保无论成功还是失败，都会移除 loading 状态
                var removeLoading = function() {
                    if (queryBtn) {
                        queryBtn.disabled = false;
                        queryBtn.classList.remove('bandix-loading');
                    }
                };

                try {
                    updateTrafficIncrements(startMs, endMs, null, null, removeLoading);
                } catch (error) {
                    console.error('Traffic Timeline query failed:', error);
                    removeLoading();
                }
            };
            
            // 快捷选项按钮事件
            presetBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var preset = this.getAttribute('data-preset');
                    var startDate, endDate;
                    
                    switch(preset) {
                        case 'today':
                            startDate = new Date(today);
                            endDate = new Date(today);
                            break;
                        case 'thisweek':
                            var dayOfWeek = today.getDay();
                            var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                            startDate = new Date(todayMs + mondayOffset * 24 * 60 * 60 * 1000);
                            startDate.setHours(0, 0, 0, 0);
                            endDate = new Date(today);
                            break;
                        case 'lastweek':
                            var lastWeekDayOfWeek = today.getDay();
                            var lastWeekMondayOffset = lastWeekDayOfWeek === 0 ? -13 : -6 - lastWeekDayOfWeek;
                            startDate = new Date(todayMs + lastWeekMondayOffset * 24 * 60 * 60 * 1000);
                            startDate.setHours(0, 0, 0, 0);
                            endDate = new Date(startDate);
                            endDate.setDate(endDate.getDate() + 6);
                            endDate.setHours(23, 59, 59, 999);
                            break;
                        case 'thismonth':
                            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                            endDate = new Date(today);
                            break;
                        case 'lastmonth':
                            var lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                            startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
                            endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
                            break;
                        case '7days':
                            startDate = new Date(todayMs - 6 * 24 * 60 * 60 * 1000);
                            endDate = new Date(today);
                            break;
                        case '30days':
                            startDate = new Date(todayMs - 29 * 24 * 60 * 60 * 1000);
                            endDate = new Date(today);
                            break;
                        case '90days':
                            startDate = new Date(todayMs - 89 * 24 * 60 * 60 * 1000);
                            endDate = new Date(today);
                            break;
                        case '1year':
                            startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
                            endDate = new Date(today);
                            break;
                    }
                    
                    setDateRange(startDate, endDate, preset);
                    queryData();
                });
            });
            
            // 查询按钮
            if (queryBtn) {
                queryBtn.addEventListener('click', queryData);
            }
            
            // 重置按钮
            if (resetBtn) {
                resetBtn.addEventListener('click', function() {
                    var oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
                    setDateRange(oneYearAgo, today, '1year');
                    queryData();
                });
            }
            
            // 初始化：默认选择最近一年
            var oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            setDateRange(oneYearAgo, today, '1year');

            startDateInput.addEventListener('change', function() {
                updateTimeline(this.value, endDateInput.value);
            });
            
            endDateInput.addEventListener('change', function() {
                updateTimeline(startDateInput.value, this.value);
            });
            
            // 设置初始时间范围并自动加载数据（不显示 loading）
            var startMs = oneYearAgo.getTime();
            var endToday = new Date(today);
            endToday.setHours(23, 59, 59, 999);
            var endMs = endToday.getTime();
            trafficIncrementsCustomRange = {
                start_ms: startMs,
                end_ms: endMs
            };
            // 自动加载数据，但不设置 loading 状态
            updateTrafficIncrements(startMs, endMs, null, null);
        }, 700);

        // 异步加载版本信息（不阻塞主流程）
        (function () {
            // 延迟执行，确保页面先完成初始化
            setTimeout(function () {
                callGetVersion().then(function (result) {
                    if (result) {
                        // 显示 luci-app-bandix 版本
                        var luciVersionEl = document.getElementById('bandix-luci-version');
                        if (luciVersionEl && result.luci_app_version) {
                            luciVersionEl.textContent = result.luci_app_version;
                        }

                        // 显示 bandix 版本
                        var coreVersionEl = document.getElementById('bandix-core-version');
                        if (coreVersionEl && result.bandix_version) {
                            coreVersionEl.textContent = result.bandix_version;
                        }
                    }
                }).catch(function (err) {
                    // 静默失败，不影响页面功能
                    console.debug('Failed to load version:', err);
                });
            }, 100);
        })();

        // 异步检查更新（不阻塞主流程）
        (function () {
            // 延迟执行，确保页面先完成初始化，更新检查可能需要网络请求
            setTimeout(function () {
                callCheckUpdate().then(function (result) {
                    if (!result) return;

                    // 检查是否有更新（luci-app-bandix 或 bandix）
                    var hasUpdate = false;
                    if (result.luci_has_update === true || result.luci_has_update === '1' || result.luci_has_update === 1) {
                        hasUpdate = true;
                    }
                    if (result.bandix_has_update === true || result.bandix_has_update === '1' || result.bandix_has_update === 1) {
                        hasUpdate = true;
                    }

                    // 显示或隐藏更新提示
                    var updateBadge = document.getElementById('bandix-update-badge');
                    if (updateBadge) {
                        if (hasUpdate) {
                            updateBadge.style.display = 'inline-block';
                            // 点击跳转到设置页面
                            updateBadge.onclick = function () {
                                window.location.href = '/cgi-bin/luci/admin/network/bandix/settings';
                            };
                            updateBadge.title = _('Update available, click to go to settings');
                        } else {
                            updateBadge.style.display = 'none';
                        }
                    }
                }).catch(function (err) {
                    // 静默失败，不影响页面功能
                    console.debug('Failed to check update:', err);
                });
            }, 500);
        })();

        // 自动适应主题背景色和文字颜色的函数（仅应用于弹窗和 tooltip）
        function applyThemeColors() {
            try {
                var prevScheme = document.documentElement.getAttribute('data-bandix-theme');
                var scheme = getLuCiColorScheme();
                document.documentElement.setAttribute('data-bandix-theme', scheme);
                var styleEl = document.getElementById('bandix-styles');
                if (styleEl && styleEl.textContent && styleEl.getAttribute('data-bandix-scheme') !== scheme) {
                    styleEl.textContent = generateStyles(scheme);
                    styleEl.setAttribute('data-bandix-scheme', scheme);
                }
                if (prevScheme && prevScheme !== scheme) {
                    var incCanvas = document.getElementById('traffic-increments-chart-canvas');
                    if (incCanvas && incCanvas.__bandixIncrements && incCanvas.__bandixIncrements.increments) {
                        drawIncrementsChart(incCanvas, incCanvas.__bandixIncrements.increments, incCanvas.__bandixIncrements.aggregation);
                    }
                }

                // 优先从 cbi-section 获取颜色
                var cbiSection = document.querySelector('.cbi-section');
                var targetElement = cbiSection || document.querySelector('.main') || document.body;
                var computedStyle = window.getComputedStyle(targetElement);
                var bgColor = computedStyle.backgroundColor;
                var textColor = computedStyle.color;

                // 如果无法获取背景色，尝试从其他 cbi-section 获取
                if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
                    var allCbiSections = document.querySelectorAll('.cbi-section');
                    for (var i = 0; i < allCbiSections.length; i++) {
                        var sectionStyle = window.getComputedStyle(allCbiSections[i]);
                        var sectionBg = sectionStyle.backgroundColor;
                        if (sectionBg && sectionBg !== 'rgba(0, 0, 0, 0)' && sectionBg !== 'transparent') {
                            bgColor = sectionBg;
                            textColor = sectionStyle.color;
                            break;
                        }
                    }
                }

                // 只应用到模态框和 tooltip，不修改页面其他元素
                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    // 应用到模态框（确保不透明）
                    var bandix_modal = document.querySelector('.bandix_modal');
                    if (bandix_modal) {
                        var rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                        if (rgbaMatch) {
                            var r = parseInt(rgbaMatch[1]);
                            var g = parseInt(rgbaMatch[2]);
                            var b = parseInt(rgbaMatch[3]);
                            var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
                            if (alpha < 0.95) {
                                bandix_modal.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                            } else {
                                bandix_modal.style.backgroundColor = bgColor;
                            }
                        } else {
                            bandix_modal.style.backgroundColor = bgColor;
                        }
                    }

                    // 应用到 tooltip（包括所有 tooltip 实例）
                    var tooltips = document.querySelectorAll('.history-tooltip, .traffic-increments-tooltip');
                    tooltips.forEach(function (tooltip) {
                        var rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                        if (rgbaMatch) {
                            var r = parseInt(rgbaMatch[1]);
                            var g = parseInt(rgbaMatch[2]);
                            var b = parseInt(rgbaMatch[3]);
                            var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
                            if (alpha < 0.95) {
                                tooltip.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                            } else {
                                tooltip.style.backgroundColor = bgColor;
                            }
                        } else {
                            tooltip.style.backgroundColor = bgColor;
                        }
                    });
                }

                // 检测文字颜色并应用（仅应用到模态框和 tooltip）
                if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
                    // 应用到模态框的文字颜色
                    var bandix_modal = document.querySelector('.bandix_modal');
                    if (bandix_modal) {
                        bandix_modal.style.color = textColor;
                    }

                    // 应用到 tooltip 的文字颜色
                    var tooltips = document.querySelectorAll('.history-tooltip, .traffic-increments-tooltip');
                    tooltips.forEach(function (tooltip) {
                        tooltip.style.color = textColor;
                    });
                }
            } catch (e) {
                // 如果检测失败，使用默认值
                console.log('Theme adaptation:', e);
            }
        }

        // 初始应用主题颜色
        setTimeout(applyThemeColors, 100);

        // 监听 DOM 变化，自动应用到新创建的元素
        if (typeof MutationObserver !== 'undefined') {
            var observer = new MutationObserver(function (mutations) {
                applyThemeColors();
            });

            setTimeout(function () {
                var container = document.querySelector('.bandix-container');
                if (container) {
                    observer.observe(container, {
                        childList: true,
                        subtree: true
                    });
                }
            }, 200);
        }

        return view;
    }
});
