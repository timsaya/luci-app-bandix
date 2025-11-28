'use strict';
'require view';
'require ui';
'require uci';
'require rpc';
'require poll';

// 暗色模式检测已改为使用 CSS 媒体查询 @media (prefers-color-scheme: dark)

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

var callStatus = rpc.declare({
    object: 'luci.bandix',
    method: 'getStatus',
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
    params: ['mac', 'start_time', 'end_time', 'days', 'wide_tx_rate_limit', 'wide_rx_rate_limit'],
    expect: { success: true }
});

var callDeleteScheduleLimit = rpc.declare({
    object: 'luci.bandix',
    method: 'deleteScheduleLimit',
    params: ['mac', 'start_time', 'end_time', 'days'],
    expect: { success: true }
});

return view.extend({
    load: function () {
        return Promise.all([
            uci.load('bandix'),
            uci.load('luci'),
            uci.load('argon').catch(function() {
                // argon 配置可能不存在，忽略错误
                return null;
            })
        ]);
    },

    render: function (data) {
        
        // 添加现代化样式
        var style = E('style', {}, `
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
            
            .device-mode-group {
                display: inline-flex;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .device-mode-btn {
                border: none;
                padding: 0 12px;
                font-size: 0.8125rem;
                line-height: 1.8;
                cursor: pointer;
                user-select: none;
                transition: all 0.15s ease;
                white-space: nowrap;
                height: 28px;
            }
            
            .device-mode-btn:hover:not(.active) {
                opacity: 0.7;
            }
            
            .device-mode-btn.active {
                background-color: #3b82f6;
                color: white;
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
                color: #f97316;
            }
            
            .traffic-icon.download {
                color: #06b6d4;
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
            .modal-overlay {
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
            
            .modal-overlay.show {
                background-color: rgba(0, 0, 0, 0.5);
                opacity: 1;
                visibility: visible;
            }
            
            .modal {
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                opacity: 0;
                transition: opacity 0.2s ease;
                background-color: rgba(255, 255, 255, 0.98);
                color: #1f2937;
            }
            
            .modal-overlay.show .modal {
                opacity: 1;
            }
            
            @media (prefers-color-scheme: dark) {
                .modal {
                    background-color: rgba(30, 30, 30, 0.98);
                    color: #e5e7eb;
                }
            }
            
            .modal-header {
                padding: 20px;
            }
            
            .modal-title {
                font-size: 1.25rem;
                font-weight: 600;
                margin: 0;
            }
            
            .modal-body {
                padding: 20px;
            }
            
            .modal-footer {
                padding: 16px 20px 20px 20px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
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
            .modal-tabs {
                display: flex;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                margin-bottom: 20px;
            }
            
            @media (prefers-color-scheme: dark) {
                .modal-tabs {
                    border-bottom-color: rgba(255, 255, 255, 0.15);
                }
            }
            
            .modal-tab {
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
                .modal-tab {
                    color: rgba(255, 255, 255, 0.6);
                }
            }
            
            .modal-tab:hover {
                color: rgba(0, 0, 0, 0.8);
                background-color: rgba(0, 0, 0, 0.02);
            }
            
            @media (prefers-color-scheme: dark) {
                .modal-tab:hover {
                    color: rgba(255, 255, 255, 0.8);
                    background-color: rgba(255, 255, 255, 0.05);
                }
            }
            
            .modal-tab.active {
                color: #3b82f6;
                border-bottom-color: #3b82f6;
                font-weight: 600;
            }
            
            .modal-tab-content {
                display: none;
            }
            
            .modal-tab-content.active {
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
            
            .confirm-dialog .modal-body {
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
            }
            .history-controls {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                align-items: center;
                padding: 12px 16px;
            }
            .history-controls .cbi-select {
                width: auto;
                min-width: 160px;
            }
            .history-card-body {
                padding: 16px;
                position: relative;
            }
            .history-legend {
                margin-left: auto;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; }
            .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
            .legend-up { background-color: #f97316; }
            .legend-down { background-color: #06b6d4; }
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
                .history-controls .cbi-select {
                    width: 100%;
                    min-width: 0;
                }
                .history-controls .form-label {
                    margin-bottom: 4px;
                }
                .history-legend {
                    margin-left: 0;
                    margin-top: 8px;
                    justify-content: center;
                }
                .history-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
                .history-card-body {
                    padding: 12px;
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
                    background-color: var(--cbi-section-bg, #fff);
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 12px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }
                
                @media (prefers-color-scheme: dark) {
                    .device-card {
                        background-color: var(--cbi-section-bg, rgba(30, 30, 30, 0.98));
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
			.history-tooltip .ht-kpi.down .ht-k-value { color: #06b6d4; }
			.history-tooltip .ht-kpi.up .ht-k-value { color: #f97316; }
			.history-tooltip .ht-divider { height: 1px; background-color: currentColor; opacity: 0.3; margin: 8px 0; }
			.history-tooltip .ht-section-title { font-weight: 600; font-size: 0.75rem; opacity: 0.7; margin: 4px 0 6px 0; }
			
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
        `);

        document.head.appendChild(style);

        var view = E('div', { 'class': 'bandix-container' }, [
            // 头部
            E('div', { 'class': 'bandix-header' }, [
                E('h1', { 'class': 'bandix-title' }, _('Bandix Traffic Monitor'))
            ]),

            // 警告提示（包含在线设备数）
            E('div', { 
                'class': 'bandix-alert' + (getThemeType() === 'wide' ? ' wide-theme' : '')
            }, [
                E('div', { 'style': 'display: flex; align-items: center; gap: 8px;' }, [
                    E('span', { 'style': 'font-size: 1rem;' }, '⚠'),
                    E('span', {}, _('Rate limiting only applies to WAN traffic.'))
                ]),
                E('div', { 'class': 'bandix-badge', 'id': 'device-count' }, _('Online Devices') + ': 0 / 0')
            ]),

            // 统计卡片
            E('div', { 'class': 'stats-grid', 'id': 'stats-grid' }),

            // 历史趋势卡片（无时间范围筛选）
            E('div', { 'class': 'cbi-section', 'id': 'history-card' }, [
                E('h3', { 'class': 'history-header', 'style': 'display: flex; align-items: center; justify-content: space-between;' }, [
                    E('span', {}, _('Traffic History')),
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
                    E('select', { 'class': 'cbi-select', 'id': 'history-device-select' }, [
                        E('option', { 'value': '' }, _('All Devices'))
                    ]),
                    E('label', { 'class': 'form-label', 'style': 'margin: 0;' }, _('Type')),
                    E('select', { 'class': 'cbi-select', 'id': 'history-type-select' }, [
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
                    E('div', { 'class': 'device-mode-group' }, [
                        E('button', { 
                            'class': 'device-mode-btn' + (localStorage.getItem('bandix_device_mode') !== 'detailed' ? ' active' : ''),
                            'data-mode': 'simple'
                        }, _('Simple Mode')),
                        E('button', { 
                            'class': 'device-mode-btn' + (localStorage.getItem('bandix_device_mode') === 'detailed' ? ' active' : ''),
                            'data-mode': 'detailed'
                        }, _('Detailed Mode'))
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
            
            allRules.forEach(function(rule, index) {
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
                var daysText = days.length > 0 ? days.map(function(d) { return dayNames[d] || d; }).join(', ') : '-';
                
                var uploadLimit = rule.wide_tx_rate_limit || 0;
                var downloadLimit = rule.wide_rx_rate_limit || 0;
                
                // 使用 isRuleActive 函数检查规则是否激活
                var isActive = isRuleActive(rule);
                
                // 箭头固定颜色（橙色和青色），样式与 WAN 字段一致
                var uploadLimitText = '<span class="srt-arrow" style="color: #f97316;">↑</span>' + (uploadLimit > 0 ? formatByterate(uploadLimit, speedUnit) : _('Unlimited'));
                var downloadLimitText = '<span class="srt-arrow" style="color: #06b6d4;">↓</span>' + (downloadLimit > 0 ? formatByterate(downloadLimit, speedUnit) : _('Unlimited'));
                
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
        
        // 设备信息模式切换
        var deviceModeButtons = view.querySelectorAll('.device-mode-btn');
        
        deviceModeButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var newMode = this.getAttribute('data-mode');
                
                // 如果已经是当前模式，不做任何操作
                if (this.classList.contains('active')) {
                    return;
                }
                
                // 保存到 localStorage
                localStorage.setItem('bandix_device_mode', newMode);
                
                // 更新按钮状态
                deviceModeButtons.forEach(function(b) {
                    b.classList.remove('active');
                });
                this.classList.add('active');
                
                // 刷新设备列表以应用新的显示模式
                updateDeviceData();
            });
        });

        // 创建限速设置模态框
        var modal = E('div', { 'class': 'modal-overlay', 'id': 'rate-limit-modal' }, [
            E('div', { 'class': 'modal' }, [
                // E('div', { 'class': 'modal-header' }, [
                //     E('h3', { 'class': 'modal-title' }, _('Device Settings'))
                // ]),
                E('div', { 'class': 'modal-body' }, [
                    E('div', { 'class': 'device-summary', 'id': 'modal-device-summary' }),
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
                E('div', { 'class': 'modal-footer' }, [
                    E('button', { 'class': 'cbi-button cbi-button-reset', 'id': 'modal-close' }, _('Close'))
                ])
            ])
        ]);

        document.body.appendChild(modal);

        // 创建添加规则模态框
        var addRuleModal = E('div', { 'class': 'modal-overlay', 'id': 'add-rule-modal' }, [
            E('div', { 'class': 'modal' }, [
                E('div', { 'class': 'modal-header' }, [
                    E('h3', { 'class': 'modal-title' }, _('Add Schedule Rule'))
                ]),
                E('div', { 'class': 'modal-body' }, [
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
                            E('select', { 'class': 'cbi-select', 'id': 'add-rule-upload-limit-unit', 'style': 'width: 100px;' })
                        ]),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, _('Tip: Enter 0 for unlimited'))
                    ]),
                    E('div', { 'class': 'form-group', 'style': 'margin-bottom: 0;' }, [
                        E('label', { 'class': 'form-label' }, _('Download Limit')),
                        E('div', { 'style': 'display: flex; gap: 8px;' }, [
                            E('input', { 'type': 'number', 'class': 'form-input', 'id': 'add-rule-download-limit-value', 'min': '0', 'step': '1', 'placeholder': '0' }),
                            E('select', { 'class': 'cbi-select', 'id': 'add-rule-download-limit-unit', 'style': 'width: 100px;' })
                        ]),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, _('Tip: Enter 0 for unlimited'))
                    ])
                ]),
                E('div', { 'class': 'modal-footer' }, [
                    E('button', { 'class': 'cbi-button cbi-button-reset', 'id': 'add-rule-cancel' }, _('Cancel')),
                    E('button', { 'class': 'cbi-button cbi-button-positive', 'id': 'add-rule-save' }, _('Add'))
                ])
            ])
        ]);

        document.body.appendChild(addRuleModal);

        // 创建确认对话框
        var confirmDialog = E('div', { 'class': 'modal-overlay', 'id': 'confirm-dialog-modal' }, [
            E('div', { 'class': 'modal confirm-dialog' }, [
                E('div', { 'class': 'modal-body' }, [
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
                
                var modalElement = confirmDialog.querySelector('.modal');
                
                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    var rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                    if (rgbaMatch) {
                        var r = parseInt(rgbaMatch[1]);
                        var g = parseInt(rgbaMatch[2]);
                        var b = parseInt(rgbaMatch[3]);
                        var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
                        
                        if (alpha < 0.95) {
                            modalElement.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                        } else {
                            modalElement.style.backgroundColor = bgColor;
                        }
                    } else {
                        modalElement.style.backgroundColor = bgColor;
                    }
                }
                
                if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
                    modalElement.style.color = textColor;
                }
            } catch(e) {}
            
            confirmDialog.classList.add('show');
        }

        // 隐藏确认对话框
        function hideConfirmDialog() {
            confirmDialog.classList.remove('show');
            confirmDialogCallback = null;
        }

        // 确认对话框事件处理
        document.getElementById('confirm-dialog-confirm').addEventListener('click', function() {
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

        // 日期选择按钮事件处理（添加规则模态框）
        var addRuleDayButtons = addRuleModal.querySelectorAll('.schedule-day-btn');
        addRuleDayButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                this.classList.toggle('active');
            });
        });

        // 显示添加规则模态框
        function showAddRuleModal() {
            if (!currentDevice) return;
            
            var addRuleModalEl = document.getElementById('add-rule-modal');
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
                
                var modalElement = addRuleModalEl.querySelector('.modal');
                
                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    var rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                    if (rgbaMatch) {
                        var r = parseInt(rgbaMatch[1]);
                        var g = parseInt(rgbaMatch[2]);
                        var b = parseInt(rgbaMatch[3]);
                        var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
                        
                        if (alpha < 0.95) {
                            modalElement.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                        } else {
                            modalElement.style.backgroundColor = bgColor;
                        }
                    } else {
                        modalElement.style.backgroundColor = bgColor;
                    }
                }
                
                if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
                    modalElement.style.color = textColor;
                }
            } catch(e) {}
            
            // 显示模态框
            addRuleModalEl.classList.add('show');
        }

        // 隐藏添加规则模态框
        function hideAddRuleModal() {
            var addRuleModalEl = document.getElementById('add-rule-modal');
            addRuleModalEl.classList.remove('show');
        }

        // 重置添加规则表单
        function resetAddRuleForm() {
            document.getElementById('add-rule-start-time').value = '00:00';
            document.getElementById('add-rule-end-time').value = '23:59';
            // 默认选中所有7天 - 重新获取按钮引用
            var dayButtons = addRuleModal.querySelectorAll('.schedule-day-btn');
            dayButtons.forEach(function(btn) {
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
            scheduleAddRuleBtn.addEventListener('click', function() {
                showAddRuleModal();
            });
        }

        // 添加规则模态框取消按钮
        document.getElementById('add-rule-cancel').addEventListener('click', hideAddRuleModal);

        // 点击添加规则模态框背景关闭
        document.getElementById('add-rule-modal').addEventListener('click', function (e) {
            if (e.target === this) {
                hideAddRuleModal();
            }
        });

        // 保存定时限速规则（从添加规则模态框）
        document.getElementById('add-rule-save').addEventListener('click', function() {
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
            var addRuleModalEl = document.getElementById('add-rule-modal');
            var dayButtons = addRuleModalEl.querySelectorAll('.schedule-day-btn');
            var selectedDays = [];
            dayButtons.forEach(function(btn) {
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
            ).then(function(result) {
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
            }).catch(function(error) {
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
            var modal = document.getElementById('rate-limit-modal');
            var deviceSummary = document.getElementById('modal-device-summary');
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
                var modalElement = modal.querySelector('.modal');
                
                // 确保背景色不透明
                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    var rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                    if (rgbaMatch) {
                        var r = parseInt(rgbaMatch[1]);
                        var g = parseInt(rgbaMatch[2]);
                        var b = parseInt(rgbaMatch[3]);
                        var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
                        
                        if (alpha < 0.95) {
                            modalElement.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                        } else {
                            modalElement.style.backgroundColor = bgColor;
                        }
                    } else {
                        modalElement.style.backgroundColor = bgColor;
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
                                    modalElement.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                                } else {
                                    modalElement.style.backgroundColor = sectionBg;
                                }
                            } else {
                                modalElement.style.backgroundColor = sectionBg;
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
                    modalElement.style.color = textColor;
                } else {
                    if (cbiSection) {
                        var sectionTextColor = window.getComputedStyle(cbiSection).color;
                        if (sectionTextColor && sectionTextColor !== 'rgba(0, 0, 0, 0)') {
                            modalElement.style.color = sectionTextColor;
                        }
                    }
                }
            } catch(e) {
                // 如果出错，CSS 会通过媒体查询自动处理暗色模式
                // 不设置样式，让 CSS 处理
            }
            
            // 显示模态框并添加动画
            modal.classList.add('show');
        }

        // 隐藏模态框
        function hideRateLimitModal() {
            var modal = document.getElementById('rate-limit-modal');
            modal.classList.remove('show');

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
            
            callGetScheduleLimits().then(function(res) {
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
                var deviceRules = limits.filter(function(rule) {
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
                deviceRules.forEach(function(rule) {
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
                        daysText = rule.time_slot.days.map(function(d) { return dayNames[d] || d; }).join(', ');
                    }
                    
                    var startTime = rule.time_slot && rule.time_slot.start ? rule.time_slot.start : '';
                    var endTime = rule.time_slot && rule.time_slot.end ? rule.time_slot.end : '';
                    var uploadLimit = rule.wide_tx_rate_limit || 0;
                    var downloadLimit = rule.wide_rx_rate_limit || 0;
                    
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
                    
                    ruleItem.querySelector('.schedule-rule-delete').addEventListener('click', function() {
                        showConfirmDialog(
                            _('Delete Schedule Rule'),
                            _('Are you sure you want to delete this schedule rule?'),
                            function() {
                                var days = rule.time_slot && rule.time_slot.days ? JSON.stringify(rule.time_slot.days) : '[]';
                                callDeleteScheduleLimit(
                                    rule.mac,
                                    startTime,
                                    endTime,
                                    days
                                ).then(function() {
                                    loadScheduleRules();
                                    updateDeviceData();
                                }).catch(function(error) {
                                    ui.addNotification(null, E('p', {}, _('Failed to delete schedule rule')), 'error');
                                });
                            }
                        );
                    });
                    
                    rulesList.appendChild(ruleItem);
                });
            }).catch(function(error) {
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

            callSetHostname(currentDevice.mac, newHostname).then(function(result) {
                // 恢复按钮状态
                saveButton.innerHTML = originalText;
                saveButton.classList.remove('btn-loading');
                saveButton.disabled = false;

                // 更新当前设备信息
                currentDevice.hostname = newHostname;
                
                // 刷新设备数据
                updateDeviceData();
            }).catch(function(error) {
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
        document.getElementById('modal-close').addEventListener('click', hideRateLimitModal);

        // 点击模态框背景关闭
        document.getElementById('rate-limit-modal').addEventListener('click', function (e) {
            if (e.target === this) {
                hideRateLimitModal();
            }
        });

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
            
            return callGetScheduleLimits().then(function(res) {
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
            }).catch(function(error) {
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
            
            return allScheduleRules.filter(function(rule) {
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
            
            activeRules.forEach(function(rule) {
                var uploadLimit = rule.wide_tx_rate_limit || 0;
                var downloadLimit = rule.wide_rx_rate_limit || 0;
                
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
            var sortedDevices = devices.slice().sort(function(a, b) {
                var aOnline = isDeviceOnline(a);
                var bOnline = isDeviceOnline(b);
                
                // 首先按在线状态排序：在线设备在前
                if (aOnline && !bOnline) return -1;
                if (!aOnline && bOnline) return 1;
                
                // 在线状态相同时，按IP地址排序
                var aIp = a.ip || '';
                var bIp = b.ip || '';
                
                // 将IP地址转换为数字进行比较
                var aIpParts = aIp.split('.').map(function(part) { return parseInt(part) || 0; });
                var bIpParts = bIp.split('.').map(function(part) { return parseInt(part) || 0; });
                
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
            if (type === 'lan') return { up: 'local_tx_rate', down: 'local_rx_rate' };
            if (type === 'wan') return { up: 'wide_tx_rate', down: 'wide_rx_rate' };
            return { up: 'total_tx_rate', down: 'total_rx_rate' };
        }

        function fetchMetricsData(mac) {
            // 通过 ubus RPC 获取，避免跨域与鉴权问题
            return callGetMetrics(mac || '').then(function (res) { return res || { metrics: [] }; });
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
            drawAreaSeries(upSeries, '#f97316', 'rgba(249,115,22,0.16)', 'rgba(249,115,22,0.02)');
            drawAreaSeries(downSeries, '#06b6d4', 'rgba(6,182,212,0.12)', 'rgba(6,182,212,0.02)');

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

		function buildTooltipHtml(point) {
			if (!point) return '';
			var lines = [];
			var typeSel = (typeof document !== 'undefined' ? document.getElementById('history-type-select') : null);
			var selType = (typeSel && typeSel.value) ? typeSel.value : 'total';
			var speedUnit = uci.get('bandix', 'traffic', 'speed_unit') || 'bytes';

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
				if (type === 'lan') return { up: 'local_tx_rate', down: 'local_rx_rate' };
				if (type === 'wan') return { up: 'wide_tx_rate', down: 'wide_rx_rate' };
				return { up: 'total_tx_rate', down: 'total_rx_rate' };
			}

			function bytesKeysFor(type) {
				if (type === 'lan') return { up: 'local_tx_bytes', down: 'local_rx_bytes' };
				if (type === 'wan') return { up: 'wide_tx_bytes', down: 'wide_rx_bytes' };
				return { up: 'total_tx_bytes', down: 'total_rx_bytes' };
			}

			lines.push('<div class="ht-title">' + msToTimeLabel(point.ts_ms) + '</div>');

			// 若选择了设备，显示设备信息
			try {
				var macSel = (typeof document !== 'undefined' ? document.getElementById('history-device-select') : null);
				var macVal = (macSel && macSel.value) ? macSel.value : '';
				if (macVal && Array.isArray(latestDevices)) {
					var dev = latestDevices.find(function(d){ return d.mac === macVal; });
					if (dev) {
						var ipv6Info = '';
						var lanIPv6 = filterLanIPv6(dev.ipv6_addresses);
						if (lanIPv6.length > 0) {
							ipv6Info = ' | IPv6: ' + lanIPv6.join(', ');
						}
						var devLabel = (dev.hostname || '-') + (dev.ip ? ' (' + dev.ip + ')' : '') + (dev.mac ? ' [' + dev.mac + ']' : '') + ipv6Info;
						lines.push('<div class="ht-device">' + _('Device') + ': ' + devLabel + '</div>');
					}
				}
			} catch (e) {}

			// 关键信息：选中类型的上下行速率（大号显示）
			var kpiLabels = labelsFor(selType);
			var kpiRateKeys = rateKeysFor(selType);
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
			row(_('Total Uploaded'), bytesValue('total_tx_bytes'));
			row(_('Total Downloaded'), bytesValue('total_rx_bytes'));
			row(_('LAN Uploaded'), bytesValue('local_tx_bytes'));
			row(_('LAN Downloaded'), bytesValue('local_rx_bytes'));
			row(_('WAN Uploaded'), bytesValue('wide_tx_bytes'));
			row(_('WAN Downloaded'), bytesValue('wide_rx_bytes'));

			return lines.join('');
        }

        // 辅助函数：比较IP地址（小的在前）
        function compareIP(aIp, bIp) {
            var aIpParts = (aIp || '').split('.').map(function(part) { return parseInt(part) || 0; });
            var bIpParts = (bIp || '').split('.').map(function(part) { return parseInt(part) || 0; });
            
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
            sortedDevices.sort(function(a, b) {
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
            sortedDevices.sort(function(a, b) {
                // 先按在线状态排序（在线在前）
                var aOnline = isDeviceOnline(a);
                var bOnline = isDeviceOnline(b);
                if (aOnline !== bOnline) {
                    return aOnline ? -1 : 1;
                }
                
                // 在线状态相同时，按LAN速度排序
                var aSpeed = (a.local_tx_rate || 0) + (a.local_rx_rate || 0);
                var bSpeed = (b.local_tx_rate || 0) + (b.local_rx_rate || 0);
                if (aSpeed !== bSpeed) {
                    return ascending ? (aSpeed - bSpeed) : (bSpeed - aSpeed);
                }
                
                // 速度相同时，按IP地址排序
                return compareIP(a.ip, b.ip);
            });
            break;
            
        case 'wan_speed':
            sortedDevices.sort(function(a, b) {
                // 先按在线状态排序（在线在前）
                var aOnline = isDeviceOnline(a);
                var bOnline = isDeviceOnline(b);
                if (aOnline !== bOnline) {
                    return aOnline ? -1 : 1;
                }
                
                // 在线状态相同时，按WAN速度排序
                var aSpeed = (a.wide_tx_rate || 0) + (a.wide_rx_rate || 0);
                var bSpeed = (b.wide_tx_rate || 0) + (b.wide_rx_rate || 0);
                if (aSpeed !== bSpeed) {
                    return ascending ? (aSpeed - bSpeed) : (bSpeed - aSpeed);
                }
                
                // 速度相同时，按IP地址排序
                return compareIP(a.ip, b.ip);
            });
            break;
            
        case 'lan_traffic':
            sortedDevices.sort(function(a, b) {
                // 先按在线状态排序（在线在前）
                var aOnline = isDeviceOnline(a);
                var bOnline = isDeviceOnline(b);
                if (aOnline !== bOnline) {
                    return aOnline ? -1 : 1;
                }
                
                // 在线状态相同时，按LAN流量排序
                var aTraffic = (a.local_tx_bytes || 0) + (a.local_rx_bytes || 0);
                var bTraffic = (b.local_tx_bytes || 0) + (b.local_rx_bytes || 0);
                if (aTraffic !== bTraffic) {
                    return ascending ? (aTraffic - bTraffic) : (bTraffic - aTraffic);
                }
                
                // 流量相同时，按IP地址排序
                return compareIP(a.ip, b.ip);
            });
            break;
            
        case 'wan_traffic':
            sortedDevices.sort(function(a, b) {
                // 先按在线状态排序（在线在前）
                var aOnline = isDeviceOnline(a);
                var bOnline = isDeviceOnline(b);
                if (aOnline !== bOnline) {
                    return aOnline ? -1 : 1;
                }
                
                // 在线状态相同时，按WAN流量排序
                var aTraffic = (a.wide_tx_bytes || 0) + (a.wide_rx_bytes || 0);
                var bTraffic = (b.wide_tx_bytes || 0) + (b.wide_rx_bytes || 0);
                if (aTraffic !== bTraffic) {
                    return ascending ? (aTraffic - bTraffic) : (bTraffic - aTraffic);
                }
                
                // 流量相同时，按IP地址排序
                return compareIP(a.ip, b.ip);
            });
            break;
            
        default:
            // 默认按在线状态和IP地址排序
            sortedDevices.sort(function(a, b) {
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
            indices: data.map(function(_, i) { return i; }) // 原始索引映射
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
                var data = Array.isArray(res && res.metrics) ? res.metrics.slice() : [];
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
                    var recentData = filtered.filter(function(item) {
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
                        indexMapping = recentData.map(function(_, i) { return i; });
                    }
                    
                    // 保存原始数据用于 tooltip（recentData 的索引与 indexMapping 对应）
                    displayData = recentData;
                } else {
                    // PC端：显示所有数据，创建完整的索引映射（1:1）
                    indexMapping = filtered.map(function(_, i) { return i; });
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
                        try { if (canvas && canvas.__bandixChart) { delete canvas.__bandixChart.hoverIndex; drawHistoryChart(canvas, canvas.__bandixChart.originalLabels || [], canvas.__bandixChart.originalUpSeries || [], canvas.__bandixChart.originalDownSeries || [], zoomScale, zoomOffsetX); } } catch(e){}
						return;
					}
                    var point = dataSource[idx];
                    // 设置 hover 状态，暂停历史轮询刷新
                    historyHover = true;
                    historyHoverIndex = idx;
                    // 立即重绘以显示垂直虚线
                    try { drawHistoryChart(canvas, canvas.__bandixChart && canvas.__bandixChart.originalLabels ? canvas.__bandixChart.originalLabels : labels, canvas.__bandixChart && canvas.__bandixChart.originalUpSeries ? canvas.__bandixChart.originalUpSeries : upSeries, canvas.__bandixChart && canvas.__bandixChart.originalDownSeries ? canvas.__bandixChart.originalDownSeries : downSeries, zoomScale, zoomOffsetX); } catch(e){}
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
					} catch(e) {
						// 如果出错，CSS 会通过媒体查询自动处理暗色模式
						// 不设置样式，让 CSS 处理
					}
					
					// 先显示以计算尺寸
					tooltip.style.display = 'block';
					tooltip.style.left = '-9999px';
					tooltip.style.top = '-9999px';
					var tw = tooltip.offsetWidth || 0;
					var th = tooltip.offsetHeight || 0;
					var padding = 12;
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
                    try { drawHistoryChart(canvas, canvas.__bandixChart && canvas.__bandixChart.originalLabels ? canvas.__bandixChart.originalLabels : labels, canvas.__bandixChart && canvas.__bandixChart.originalUpSeries ? canvas.__bandixChart.originalUpSeries : upSeries, canvas.__bandixChart && canvas.__bandixChart.originalDownSeries ? canvas.__bandixChart.originalDownSeries : downSeries, 1, 0); } catch(e){}
                }

                // 鼠标进入事件：启动延迟计时器
                canvas.onmouseenter = function() {
                    if (zoomTimer) clearTimeout(zoomTimer);
                    zoomTimer = setTimeout(function() {
                        zoomEnabled = true;
                        zoomTimer = null;
                    }, 1000); // 1秒后启用缩放
                };

                // 鼠标滚轮事件：处理缩放
                canvas.onwheel = function(evt) {
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
                    } catch(e){}
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

        // 历史趋势：事件绑定
        (function initHistoryControls() {
            var typeSel = document.getElementById('history-type-select');
            var devSel = document.getElementById('history-device-select');
            if (typeSel) typeSel.value = 'total';
            
            // 初始化缩放倍率显示
            updateZoomLevelDisplay();
			function onFilterChange() {
				refreshHistory();
				// 同步刷新表格（立即生效，不等轮询）
				try { window.__bandixRenderTable && window.__bandixRenderTable(); } catch (e) {}
			}
			if (typeSel) typeSel.addEventListener('change', onFilterChange);
			if (devSel) devSel.addEventListener('change', onFilterChange);

            window.addEventListener('resize', function () {
                // 窗口大小改变时，重新刷新历史数据以应用移动端过滤逻辑
                refreshHistory();
            });

            // 首次加载
            refreshHistory();
        })();

        // 历史趋势轮询（每1秒）
        poll.add(function () {
            return refreshHistory();
        },1);



        // 存储移动端卡片展开状态（设备MAC地址集合）
        var expandedDeviceCards = new Set();

        // 定义更新设备数据的函数
        function updateDeviceData() {
            return Promise.all([
                callStatus(),
                fetchAllScheduleRules()
            ]).then(function (results) {
                var result = results[0];
                var trafficDiv = document.getElementById('traffic-status');
                var deviceCountDiv = document.getElementById('device-count');
                var statsGrid = document.getElementById('stats-grid');
                var speedUnit = uci.get('bandix', 'traffic', 'speed_unit') || 'bytes';

                var stats = result;
                if (!stats || !stats.devices) {
                    trafficDiv.innerHTML = '<div class="error">' + _('Unable to fetch data') + '</div>';
                    return;
                }

                // 更新设备计数
                var onlineCount = stats.devices.filter(d => isDeviceOnline(d)).length;
                deviceCountDiv.textContent = _('Online Devices') + ': ' + onlineCount + ' / ' + stats.devices.length;

                // 计算统计数据（包含所有设备）
                var totalLanUp = stats.devices.reduce((sum, d) => sum + (d.local_tx_bytes || 0), 0);
                var totalLanDown = stats.devices.reduce((sum, d) => sum + (d.local_rx_bytes || 0), 0);
                var totalWanUp = stats.devices.reduce((sum, d) => sum + (d.wide_tx_bytes || 0), 0);
                var totalWanDown = stats.devices.reduce((sum, d) => sum + (d.wide_rx_bytes || 0), 0);
                var totalLanSpeedUp = stats.devices.reduce((sum, d) => sum + (d.local_tx_rate || 0), 0);
                var totalLanSpeedDown = stats.devices.reduce((sum, d) => sum + (d.local_rx_rate || 0), 0);
                var totalWanSpeedUp = stats.devices.reduce((sum, d) => sum + (d.wide_tx_rate || 0), 0);
                var totalWanSpeedDown = stats.devices.reduce((sum, d) => sum + (d.wide_rx_rate || 0), 0);
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
                            E('span', { 'style': 'color: #f97316; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                            E('span', { 'style': 'color: #f97316; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalLanSpeedUp, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #64748b; margin-left: 4px;' }, '(' + formatSize(totalLanUp) + ')')
                        ]),
                        // 下载行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #06b6d4; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                            E('span', { 'style': 'color: #06b6d4; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalLanSpeedDown, speedUnit)),
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
                            E('span', { 'style': 'color: #f97316; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                            E('span', { 'style': 'color: #f97316; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalWanSpeedUp, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #64748b; margin-left: 4px;' }, '(' + formatSize(totalWanUp) + ')')
                        ]),
                        // 下载行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #06b6d4; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                            E('span', { 'style': 'color: #06b6d4; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalWanSpeedDown, speedUnit)),
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
                            E('span', { 'style': 'color: #f97316; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                            E('span', { 'style': 'color: #f97316; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalSpeedUp, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #64748b; margin-left: 4px;' }, '(' + formatSize(totalUp) + ')')
                        ]),
                        // 下载行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #06b6d4; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                            E('span', { 'style': 'color: #06b6d4; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalSpeedDown, speedUnit)),
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
                    
                    th.addEventListener('click', function() {
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
                    speedBtn.addEventListener('click', function(e) {
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
                    trafficBtn.addEventListener('click', function(e) {
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
				var filteredDevices = (!selectedMac) ? stats.devices : stats.devices.filter(function(d){ return (d.mac === selectedMac); });

				// 应用排序
				filteredDevices = sortDevices(filteredDevices, currentSortBy, currentSortOrder);

				// 检查是否有任何设备有 IPv6 地址
				var hasAnyIPv6 = filteredDevices.some(function(device) {
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
						E('div', { 'class': 'device-ip' }, device.ip)
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
                                    E('span', { 'class': 'traffic-speed lan' }, formatByterate(device.local_tx_rate || 0, speedUnit)),
                                    E('span', { 'class': 'traffic-total' }, '(' + formatSize(device.local_tx_bytes || 0) + ')')
                                ]),
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon download' }, '↓'),
                                    E('span', { 'class': 'traffic-speed lan' }, formatByterate(device.local_rx_rate || 0, speedUnit)),
                                    E('span', { 'class': 'traffic-total' }, '(' + formatSize(device.local_rx_bytes || 0) + ')')
                                ])
                            ])
                        ]),

                        // WAN 流量
                        E('td', {}, [
                            E('div', { 'class': 'traffic-info' }, [
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon upload' }, '↑'),
                                    E('span', { 'class': 'traffic-speed wan' }, formatByterate(device.wide_tx_rate || 0, speedUnit)),
                                    E('span', { 'class': 'traffic-total' }, '(' + formatSize(device.wide_tx_bytes || 0) + ')')
                                ]),
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon download' }, '↓'),
                                    E('span', { 'class': 'traffic-speed wan' }, formatByterate(device.wide_rx_rate || 0, speedUnit)),
                                    E('span', { 'class': 'traffic-total' }, '(' + formatSize(device.wide_rx_bytes || 0) + ')')
                                ])
                            ])
                        ]),

                        // 定时限速规则
                        (function() {
                            var activeRules = getActiveRulesForDevice(device.mac);
                            var allDeviceRules = allScheduleRules.filter(function(r) { return r && r.mac === device.mac; });
                            
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
                                    uploadSpan.appendChild(E('span', { 'style': 'color: #f97316;' }, '↑'));
                                    uploadSpan.appendChild(document.createTextNode(uploadLimit > 0 ? formatByterate(uploadLimit, speedUnit) : _('Unlimited')));
                                    limitsContainer.appendChild(uploadSpan);
                                    
                                    // 下载限速（青色箭头）
                                    var downloadSpan = E('span', {});
                                    downloadSpan.appendChild(E('span', { 'style': 'color: #06b6d4;' }, '↓'));
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
                                rulesInfo.onmouseenter = function(evt) {
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
                                    } catch(e) {}
                                    
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
                                
                                rulesInfo.onmouseleave = function() {
                                    var tooltip = document.getElementById('schedule-rules-tooltip');
                                    if (tooltip) {
                                        tooltip.style.display = 'none';
                                        tooltip.style.visibility = 'visible';
                                    }
                                };
                                
                                rulesInfo.onmousemove = function(evt) {
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
                                    E('div', { 'class': 'device-card-ip' }, device.ip)
                                ])
                            ]),
                            E('div', { 'class': 'device-card-action' }, [
                                (function() {
                                    var cardActionBtn = E('button', {
                                        'class': 'cbi-button cbi-button-action',
                                        'title': _('Settings')
                                    }, buttonText);
                                    cardActionBtn.addEventListener('click', function() {
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
                                        E('span', { 'style': 'color: #f97316; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                                        E('span', { 'style': 'font-weight: 600;' }, formatByterate(device.wide_tx_rate || 0, speedUnit)),
                                        E('span', { 'style': 'font-size: 0.75rem; opacity: 0.7;' }, '(' + formatSize(device.wide_tx_bytes || 0) + ')')
                                    ]),
                                    E('div', { 'class': 'device-card-traffic-row' }, [
                                        E('span', { 'style': 'color: #06b6d4; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                                        E('span', { 'style': 'font-weight: 600;' }, formatByterate(device.wide_rx_rate || 0, speedUnit)),
                                        E('span', { 'style': 'font-size: 0.75rem; opacity: 0.7;' }, '(' + formatSize(device.wide_rx_bytes || 0) + ')')
                                    ])
                                ])
                            ])
                        ]),
                        // 定时限速规则
                        (function() {
                            var activeRules = getActiveRulesForDevice(device.mac);
                            var allDeviceRules = allScheduleRules.filter(function(r) { return r && r.mac === device.mac; });
                            
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
                                    E('span', { 'style': 'color: #f97316; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                                    E('span', { 'style': 'font-weight: 600;' }, formatByterate(device.local_tx_rate || 0, speedUnit)),
                                    E('span', { 'style': 'font-size: 0.75rem; opacity: 0.7;' }, '(' + formatSize(device.local_tx_bytes || 0) + ')')
                                ]),
                                E('div', { 'class': 'device-card-traffic-row' }, [
                                    E('span', { 'style': 'color: #06b6d4; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                                    E('span', { 'style': 'font-weight: 600;' }, formatByterate(device.local_rx_rate || 0, speedUnit)),
                                    E('span', { 'style': 'font-size: 0.75rem; opacity: 0.7;' }, '(' + formatSize(device.local_rx_bytes || 0) + ')')
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
				try { window.__bandixRenderTable = function(){
					// 重新触发完整的数据更新和渲染
					updateDeviceData();
				}; } catch (e) {}

                // 更新历史趋势中的设备下拉
                try {
                    latestDevices = stats.devices || [];
                    updateDeviceOptions(latestDevices);
                } catch (e) {}
            });
        }

        // 轮询获取数据
        poll.add(updateDeviceData, 1);
        
        // 轮询获取定时限速规则（每5秒）
        poll.add(function() {
            return fetchAllScheduleRules().then(function() {
                // 规则更新后，重新渲染表格以显示最新的规则状态
                if (window.__bandixRenderTable) {
                    window.__bandixRenderTable();
                }
            });
        }, 5000);

        // 立即执行一次，不等待轮询
        updateDeviceData();
        fetchAllScheduleRules();

        // 自动适应主题背景色和文字颜色的函数（仅应用于弹窗和 tooltip）
        function applyThemeColors() {
            try {
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
                    var modal = document.querySelector('.modal');
                    if (modal) {
                        var rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                        if (rgbaMatch) {
                            var r = parseInt(rgbaMatch[1]);
                            var g = parseInt(rgbaMatch[2]);
                            var b = parseInt(rgbaMatch[3]);
                            var alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
                            if (alpha < 0.95) {
                                modal.style.backgroundColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                            } else {
                                modal.style.backgroundColor = bgColor;
                            }
                        } else {
                            modal.style.backgroundColor = bgColor;
                        }
                    }
                    
                    // 应用到 tooltip（包括所有 tooltip 实例）
                    var tooltips = document.querySelectorAll('.history-tooltip');
                    tooltips.forEach(function(tooltip) {
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
                    var modal = document.querySelector('.modal');
                    if (modal) {
                        modal.style.color = textColor;
                    }
                    
                    // 应用到 tooltip 的文字颜色
                    var tooltips = document.querySelectorAll('.history-tooltip');
                    tooltips.forEach(function(tooltip) {
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
            var observer = new MutationObserver(function(mutations) {
                applyThemeColors();
            });
            
            setTimeout(function() {
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
