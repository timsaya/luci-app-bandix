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

var callSetRateLimit = rpc.declare({
    object: 'luci.bandix',
    method: 'setRateLimit',
    params: ['mac', 'wide_tx_rate_limit', 'wide_rx_rate_limit'],
    expect: { success: true }
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
                width: 25%;
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
                width: 15%;
            }
            
            .bandix-table th:nth-child(5),
            .bandix-table td:nth-child(5) {
                width: 9%;
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
                
                .device-card-expandable {
                    display: none;
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(0, 0, 0, 0.1);
                }
                
                @media (prefers-color-scheme: dark) {
                    .device-card-expandable {
                        border-top-color: rgba(255, 255, 255, 0.15);
                    }
                }
                
                .device-card.expanded .device-card-expandable {
                    display: block;
                }
                
                .device-card-toggle {
                    width: 100%;
                    margin-top: 8px;
                    padding: 6px;
                    font-size: 0.75rem;
                    text-align: center;
                    background: transparent;
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                    cursor: pointer;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }
                
                @media (prefers-color-scheme: dark) {
                    .device-card-toggle {
                        border-color: rgba(255, 255, 255, 0.15);
                    }
                }
                
                .device-card-toggle:hover {
                    opacity: 1;
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
                E('div', { 'class': 'modal-header' }, [
                    E('h3', { 'class': 'modal-title' }, _('Device Settings'))
                ]),
                E('div', { 'class': 'modal-body' }, [
                    E('div', { 'class': 'device-summary', 'id': 'modal-device-summary' }),
                    E('div', { 'class': 'form-group' }, [
                        E('label', { 'class': 'form-label' }, _('Hostname')),
                        E('input', { 'type': 'text', 'class': 'form-input', 'id': 'device-hostname-input', 'placeholder': _('Please enter hostname') }),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, _('Set Hostname'))
                    ]),
                    E('div', { 'class': 'form-group' }, [
                        E('label', { 'class': 'form-label' }, _('Upload Limit')),
                        E('div', { 'style': 'display: flex; gap: 8px;' }, [
                            E('input', { 'type': 'number', 'class': 'form-input', 'id': 'upload-limit-value', 'min': '0', 'step': '1', 'placeholder': '0' }),
                            E('select', { 'class': 'cbi-select', 'id': 'upload-limit-unit', 'style': 'width: 100px;' })
                        ]),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, _('Tip: Enter 0 for unlimited'))
                    ]),
                    E('div', { 'class': 'form-group' }, [
                        E('label', { 'class': 'form-label' }, _('Download Limit')),
                        E('div', { 'style': 'display: flex; gap: 8px;' }, [
                            E('input', { 'type': 'number', 'class': 'form-input', 'id': 'download-limit-value', 'min': '0', 'step': '1', 'placeholder': '0' }),
                            E('select', { 'class': 'cbi-select', 'id': 'download-limit-unit', 'style': 'width: 100px;' })
                        ]),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, _('Tip: Enter 0 for unlimited'))
                    ])
                ]),
                E('div', { 'class': 'modal-footer' }, [
                    E('button', { 'class': 'cbi-button cbi-button-reset', 'id': 'modal-cancel' }, _('Cancel')),
                    E('button', { 'class': 'cbi-button cbi-button-positive', 'id': 'modal-save' }, _('Save'))
                ])
            ])
        ]);

        document.body.appendChild(modal);

        // 模态框事件处理
        var currentDevice = null;
        var showRateLimitModal;

        // 显示模态框
        showRateLimitModal = function (device) {
            currentDevice = device;
            var modal = document.getElementById('rate-limit-modal');
            var deviceSummary = document.getElementById('modal-device-summary');
            var speedUnit = uci.get('bandix', 'traffic', 'speed_unit') || 'bytes';

            // 动态填充单位选择器
            var uploadUnitSelect = document.getElementById('upload-limit-unit');
            var downloadUnitSelect = document.getElementById('download-limit-unit');
            
            // 清空现有选项
            uploadUnitSelect.innerHTML = '';
            downloadUnitSelect.innerHTML = '';
            
            if (speedUnit === 'bits') {
                // 比特单位选项 - 直接设置为对应的字节数
                uploadUnitSelect.appendChild(E('option', { 'value': '125' }, 'Kbps'));       // 1000 bits/s / 8 = 125 bytes/s
                uploadUnitSelect.appendChild(E('option', { 'value': '125000' }, 'Mbps'));    // 1000000 bits/s / 8 = 125000 bytes/s
                uploadUnitSelect.appendChild(E('option', { 'value': '125000000' }, 'Gbps')); // 1000000000 bits/s / 8 = 125000000 bytes/s
                
                downloadUnitSelect.appendChild(E('option', { 'value': '125' }, 'Kbps'));
                downloadUnitSelect.appendChild(E('option', { 'value': '125000' }, 'Mbps'));
                downloadUnitSelect.appendChild(E('option', { 'value': '125000000' }, 'Gbps'));
            } else {
                // 字节单位选项
                uploadUnitSelect.appendChild(E('option', { 'value': '1024' }, 'KB/s'));
                uploadUnitSelect.appendChild(E('option', { 'value': '1048576' }, 'MB/s'));
                uploadUnitSelect.appendChild(E('option', { 'value': '1073741824' }, 'GB/s'));
                
                downloadUnitSelect.appendChild(E('option', { 'value': '1024' }, 'KB/s'));
                downloadUnitSelect.appendChild(E('option', { 'value': '1048576' }, 'MB/s'));
                downloadUnitSelect.appendChild(E('option', { 'value': '1073741824' }, 'GB/s'));
            }

            // 更新设备信息
            deviceSummary.innerHTML = E('div', {}, [
                E('div', { 'class': 'device-summary-name' }, device.hostname || device.ip),
                E('div', { 'class': 'device-summary-details' }, device.ip + ' (' + device.mac + ')')
            ]).innerHTML;

            // 设置当前hostname值
            document.getElementById('device-hostname-input').value = device.hostname || '';

            // 设置当前限速值
            var uploadLimit = device.wide_tx_rate_limit || 0;
            var downloadLimit = device.wide_rx_rate_limit || 0;

            // 设置上传限速值
            var uploadValue = uploadLimit;
            var uploadUnit;
            if (uploadValue === 0) {
                document.getElementById('upload-limit-value').value = 0;
                uploadUnit = speedUnit === 'bits' ? '125' : '1024';
            } else {
                if (speedUnit === 'bits') {
                    // 转换为比特单位显示
                    var uploadBits = uploadValue * 8;
                    if (uploadBits >= 1000000000) {
                        uploadValue = uploadBits / 1000000000;
                        uploadUnit = '125000000';  // Gbps对应的字节倍数
                    } else if (uploadBits >= 1000000) {
                        uploadValue = uploadBits / 1000000;
                        uploadUnit = '125000';     // Mbps对应的字节倍数
                    } else {
                        uploadValue = uploadBits / 1000;
                        uploadUnit = '125';        // Kbps对应的字节倍数
                    }
                } else {
                    // 字节单位显示
                    if (uploadValue >= 1073741824) {
                        uploadValue = uploadValue / 1073741824;
                        uploadUnit = '1073741824';
                    } else if (uploadValue >= 1048576) {
                        uploadValue = uploadValue / 1048576;
                        uploadUnit = '1048576';
                    } else {
                        uploadValue = uploadValue / 1024;
                        uploadUnit = '1024';
                    }
                }
                document.getElementById('upload-limit-value').value = Math.round(uploadValue);
            }
            document.getElementById('upload-limit-unit').value = uploadUnit;

            // 设置下载限速值
            var downloadValue = downloadLimit;
            var downloadUnit;
            if (downloadValue === 0) {
                document.getElementById('download-limit-value').value = 0;
                downloadUnit = speedUnit === 'bits' ? '125' : '1024';
            } else {
                if (speedUnit === 'bits') {
                    // 转换为比特单位显示
                    var downloadBits = downloadValue * 8;
                    if (downloadBits >= 1000000000) {
                        downloadValue = downloadBits / 1000000000;
                        downloadUnit = '125000000';  // Gbps对应的字节倍数
                    } else if (downloadBits >= 1000000) {
                        downloadValue = downloadBits / 1000000;
                        downloadUnit = '125000';     // Mbps对应的字节倍数
                    } else {
                        downloadValue = downloadBits / 1000;
                        downloadUnit = '125';        // Kbps对应的字节倍数
                    }
                } else {
                    // 字节单位显示
                    if (downloadValue >= 1073741824) {
                        downloadValue = downloadValue / 1073741824;
                        downloadUnit = '1073741824';
                    } else if (downloadValue >= 1048576) {
                        downloadValue = downloadValue / 1048576;
                        downloadUnit = '1048576';
                    } else {
                        downloadValue = downloadValue / 1024;
                        downloadUnit = '1024';
                    }
                }
                document.getElementById('download-limit-value').value = Math.round(downloadValue);
            }
            document.getElementById('download-limit-unit').value = downloadUnit;

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

        // 保存限速设置
        function saveRateLimit() {
            if (!currentDevice) return;

            var saveButton = document.getElementById('modal-save');
            var originalText = saveButton.textContent;

            // 显示加载状态
            saveButton.innerHTML = '<span class="loading-spinner"></span>' + _('Saving...');
            saveButton.classList.add('btn-loading');

            var uploadLimit = 0;
            var downloadLimit = 0;
            var speedUnit = uci.get('bandix', 'traffic', 'speed_unit') || 'bytes';

            // 获取hostname值
            var newHostname = document.getElementById('device-hostname-input').value.trim();

            // 获取上传限速值
            var uploadValue = parseInt(document.getElementById('upload-limit-value').value) || 0;
            var uploadUnit = parseInt(document.getElementById('upload-limit-unit').value);
            if (uploadValue > 0) {
                // 选择器的值已经是正确的字节倍数，直接计算即可
                uploadLimit = uploadValue * uploadUnit;
            }

            // 获取下载限速值
            var downloadValue = parseInt(document.getElementById('download-limit-value').value) || 0;
            var downloadUnit = parseInt(document.getElementById('download-limit-unit').value);
            if (downloadValue > 0) {
                // 选择器的值已经是正确的字节倍数，直接计算即可
                downloadLimit = downloadValue * downloadUnit;
            }

            // console.log("mac", currentDevice.mac)
            // console.log("uploadLimit", uploadLimit)
            // console.log("downloadLimit", downloadLimit)
            // console.log("newHostname", newHostname)

            // 创建Promise数组来并行处理hostname和限速设置
            var promises = [];

            // 如果hostname有变化，添加hostname设置Promise
            if (newHostname !== (currentDevice.hostname || '')) {
                promises.push(
                    callSetHostname(currentDevice.mac, newHostname).catch(function(error) {
                        return { hostnameError: error };
                    })
                );
            }

            // 添加限速设置Promise
            promises.push(
                callSetRateLimit(currentDevice.mac, uploadLimit, downloadLimit).catch(function(error) {
                    return { rateLimitError: error };
                })
            );

            // 并行执行所有设置
            Promise.all(promises).then(function (results) {
                // 恢复按钮状态
                saveButton.innerHTML = originalText;
                saveButton.classList.remove('btn-loading');

                var hasError = false;
                var errorMessages = [];

                // 检查结果
                results.forEach(function(result, index) {
                    if (result && result.hostnameError) {
                        hasError = true;
                        errorMessages.push(_('Failed to set hostname'));
                    } else if (result && result.rateLimitError) {
                        hasError = true;
                        errorMessages.push(_('Failed to save settings'));
                    } else if (result !== true && result !== undefined) {
                        // 检查是否有其他错误
                        if (result && result.error) {
                            hasError = true;
                            errorMessages.push(result.error);
                        }
                    }
                });

                if (hasError) {
                    ui.addNotification(null, E('p', {}, errorMessages.join(', ')), 'error');
                } else {
                    // 所有设置都成功
                    hideRateLimitModal();
                }
            }).catch(function (error) {
                // 恢复按钮状态
                saveButton.innerHTML = originalText;
                saveButton.classList.remove('btn-loading');
                ui.addNotification(null, E('p', {}, _('Failed to save settings')), 'error');
            });
        }

        // 绑定模态框事件
        document.getElementById('modal-cancel').addEventListener('click', hideRateLimitModal);
        document.getElementById('modal-save').addEventListener('click', saveRateLimit);

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
            return callStatus().then(function (result) {
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
                            E('th', {}, _('Rate Limit')),
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

                        // 限速设置
                        E('td', {}, [
                            E('div', { 'class': 'limit-info' }, [
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon upload', 'style': 'font-size: 0.75rem;' }, '↑'),
                                    E('span', { 'style': 'font-size: 0.875rem;' }, formatByterate(device.wide_tx_rate_limit || 0, speedUnit))
                                ]),
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon download', 'style': 'font-size: 0.75rem;' }, '↓'),
                                    E('span', { 'style': 'font-size: 0.875rem;' }, formatByterate(device.wide_rx_rate_limit || 0, speedUnit))
                                ]),
                            ])
                        ]),

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
                        // 卡片主要内容（WAN流量和限速）
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
                            ]),
                            // 限速设置
                            E('div', { 'class': 'device-card-section' }, [
                                E('div', { 'class': 'device-card-section-label' }, _('Rate Limit')),
                                E('div', { 'class': 'device-card-traffic' }, [
                                    E('div', { 'class': 'device-card-traffic-row' }, [
                                        E('span', { 'style': 'color: #f97316; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                                        E('span', { 'style': 'font-weight: 600;' }, formatByterate(device.wide_tx_rate_limit || 0, speedUnit))
                                    ]),
                                    E('div', { 'class': 'device-card-traffic-row' }, [
                                        E('span', { 'style': 'color: #06b6d4; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                                        E('span', { 'style': 'font-weight: 600;' }, formatByterate(device.wide_rx_rate_limit || 0, speedUnit))
                                    ])
                                ])
                            ])
                        ]),
                        // 可展开的详情（LAN流量）
                        E('div', { 'class': 'device-card-expandable' }, [
                            E('div', { 'class': 'device-card-section', 'style': 'margin-top: 0;' }, [
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
                        ]),
                        // 展开/收起按钮
                        E('button', { 'class': 'device-card-toggle' }, _('Show More'))
                    ]);
                    
                    // 检查并恢复展开状态
                    if (expandedDeviceCards.has(device.mac)) {
                        card.classList.add('expanded');
                    }
                    
                    // 绑定展开/收起功能
                    var toggleBtn = card.querySelector('.device-card-toggle');
                    toggleBtn.textContent = card.classList.contains('expanded') ? _('Show Less') : _('Show More');
                    toggleBtn.addEventListener('click', function() {
                        card.classList.toggle('expanded');
                        var isExpanded = card.classList.contains('expanded');
                        toggleBtn.textContent = isExpanded ? _('Show Less') : _('Show More');
                        // 保存展开状态
                        if (isExpanded) {
                            expandedDeviceCards.add(device.mac);
                        } else {
                            expandedDeviceCards.delete(device.mac);
                        }
                    });
                    
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

        // 立即执行一次，不等待轮询
        updateDeviceData();

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
