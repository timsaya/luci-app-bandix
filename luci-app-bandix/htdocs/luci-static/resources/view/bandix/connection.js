'use strict';
'require view';
'require ui';
'require uci';
'require rpc';
'require poll';

var BANDIX_MODAL_BG_OPENWRT2020_LIGHT = '#ffffff';
var BANDIX_MODAL_BG_OPENWRT2020_DARK = '#2a2a2a';
var BANDIX_MODAL_BG_MATERIAL_LIGHT = '#ffffff';
var BANDIX_MODAL_BG_MATERIAL_DARK = '#303030';
var BANDIX_MODAL_BG_BOOTSTRAP_LIGHT = '#ffffff';
var BANDIX_MODAL_BG_BOOTSTRAP_DARK = '#303030';
var BANDIX_MODAL_BG_ARGON_LIGHT = '#F4F5F7';
var BANDIX_MODAL_BG_ARGON_DARK = '#252526';
var BANDIX_MODAL_BG_AURORA_LIGHT = '#ffffff';
var BANDIX_MODAL_BG_AURORA_DARK = '#0E172B';
var BANDIX_MODAL_BG_KUCAT_LIGHT = '#ffffff';
var BANDIX_MODAL_BG_KUCAT_DARK = '#222D3C';

function getThemeMode() {
    var theme = uci.get('luci', 'main', 'mediaurlbase');

    if (theme === '/luci-static/openwrt2020' ||
        theme === '/luci-static/material' ||
        theme === '/luci-static/bootstrap-light') {
        return 'light';
    }

    if (theme === '/luci-static/bootstrap-dark') {
        return 'dark';
    }

    if (theme === '/luci-static/argon') {
        var argonMode = uci.get('argon', '@global[0]', 'mode');
        if (argonMode === 'light') {
            return 'light';
        }
        if (argonMode === 'dark') {
            return 'dark';
        }
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    }

    if (theme === '/luci-static/bootstrap' || theme === '/luci-static/aurora') {
        var htmlElement = document.documentElement;
        var darkMode = htmlElement.getAttribute('data-darkmode');
        return darkMode === 'true' ? 'dark' : 'light';
    }

    if (theme === '/luci-static/kucat') {
        var kucatMode = uci.get('kucat', '@basic[0]', 'mode');
        if (kucatMode === 'light') {
            return 'light';
        }
        if (kucatMode === 'dark') {
            return 'dark';
        }
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    }

    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
}

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

function getThemeColors() {
    var theme = uci.get('luci', 'main', 'mediaurlbase');
    var mode = getThemeMode();
    if (theme === '/luci-static/openwrt2020') {
        return { modalBg: mode === 'dark' ? BANDIX_MODAL_BG_OPENWRT2020_DARK : BANDIX_MODAL_BG_OPENWRT2020_LIGHT };
    }
    if (theme === '/luci-static/material') {
        return { modalBg: mode === 'dark' ? BANDIX_MODAL_BG_MATERIAL_DARK : BANDIX_MODAL_BG_MATERIAL_LIGHT };
    }
    if (theme === '/luci-static/bootstrap-light' || theme === '/luci-static/bootstrap') {
        return { modalBg: mode === 'dark' ? BANDIX_MODAL_BG_BOOTSTRAP_DARK : BANDIX_MODAL_BG_BOOTSTRAP_LIGHT };
    }
    if (theme === '/luci-static/bootstrap-dark') {
        return { modalBg: BANDIX_MODAL_BG_BOOTSTRAP_DARK };
    }
    if (theme === '/luci-static/argon') {
        return { modalBg: mode === 'dark' ? BANDIX_MODAL_BG_ARGON_DARK : BANDIX_MODAL_BG_ARGON_LIGHT };
    }
    if (theme === '/luci-static/aurora') {
        return { modalBg: mode === 'dark' ? BANDIX_MODAL_BG_AURORA_DARK : BANDIX_MODAL_BG_AURORA_LIGHT };
    }
    if (theme === '/luci-static/kucat') {
        return { modalBg: mode === 'dark' ? BANDIX_MODAL_BG_KUCAT_DARK : BANDIX_MODAL_BG_KUCAT_LIGHT };
    }
    return { modalBg: mode === 'dark' ? BANDIX_MODAL_BG_OPENWRT2020_DARK : BANDIX_MODAL_BG_OPENWRT2020_LIGHT };
}

function formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
}

// 格式化设备名称
function formatDeviceName(device) {
    if (device.host && device.host !== '') {
        return device.host;
    }
    return device.ip4 || device.mac || _('Unknown Device');
}

// RPC调用
var callGetConnection = rpc.declare({
    object: 'luci.bandix',
    method: 'getConnection',
    expect: {}
});

var callGetConnectionFlows = rpc.declare({
    object: 'luci.bandix',
    method: 'getConnectionFlows',
    params: ['ip', 'protocol', 'state'],
    expect: {}
});

return view.extend({
    load: function () {
        return Promise.all([
            uci.load('bandix'),
            uci.load('luci'),
            uci.load('argon').catch(function () {
                return null;
            })
        ]);
    },

    render: function (data) {
        var connectionEnabled = uci.get('bandix', 'connections', 'enabled') === '1';
        var themeColors = getThemeColors();

        // 创建样式
        var style = E('style', {}, `
            .bandix-connection-container {
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
            
            .bandix-badge {
                border-radius: 4px;
                padding: 4px 10px;
                font-size: 0.875rem;
            }
            
            .bandix-alert {
                border-radius: 4px;
                padding: 10px 12px;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 0.875rem;
            }
            
            /* 只在宽模式下应用警告样式 */
            .bandix-alert.wide-theme {
                background-color: rgba(251, 191, 36, 0.1);
                border: 1px solid rgba(251, 191, 36, 0.3);
                color: #92400e;
            }
            
            .theme-dark .bandix-alert.wide-theme {
                background-color: rgba(251, 191, 36, 0.15);
                border-color: rgba(251, 191, 36, 0.4);
                color: #fbbf24;
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
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                margin-top: 0;
            }
            
            /* 移动端统计卡片布局 */
            @media (max-width: 768px) {
                .stats-grid {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }
                
                .stats-grid .cbi-section {
                    padding: 12px;
                }
                
                .stats-card-main-value {
                    font-size: 1.75rem;
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
                
                .device-card-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                }
                
                .device-card-name {
                    flex: 1;
                    min-width: 0;
                }
                
                .device-card-name .device-name {
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                
                .device-card-name .device-ip {
                    font-size: 0.75rem;
                    opacity: 0.7;
                }
                
                .device-card-name .device-mac {
                    font-size: 0.7rem;
                    opacity: 0.6;
                    margin-top: 2px;
                }
                
                .device-card-stats {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                
                .device-card-stat-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .device-card-stat-label {
                    font-size: 0.75rem;
                    opacity: 0.7;
                    font-weight: 500;
                }
                
                .device-card-stat-value {
                    font-size: 1.125rem;
                    font-weight: 700;
                }
                
                .device-card-tcp-details {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-bottom: 12px;
                    padding: 12px;
                    background-color: rgba(0, 0, 0, 0.02);
                    border-radius: 6px;
                }
                
                .device-card-tcp-details-label {
                    font-size: 0.75rem;
                    opacity: 0.7;
                    font-weight: 500;
                    margin-bottom: 4px;
                }
                
                .device-card-tcp-status-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.875rem;
                }
                
                .device-card-tcp-status-label {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: white;
                    min-width: 45px;
                    text-align: center;
                }
                
                .device-card-tcp-status-label.established {
                    background-color: #10b981;
                }
                
                .device-card-tcp-status-label.time-wait {
                    background-color: #f59e0b;
                }
                
                .device-card-tcp-status-label.closed {
                    background-color: #6b7280;
                }
                
                .device-card-tcp-status-value {
                    font-weight: 600;
                }
                
                .device-card-total {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 12px;
                    border-top: 1px solid rgba(0, 0, 0, 0.1);
                }
            }
            
            .theme-dark .device-card {
                border-color: rgba(255, 255, 255, 0.15);
            }
            
            .theme-dark .device-card-header {
                border-bottom-color: rgba(255, 255, 255, 0.15);
            }
            
            .theme-dark .device-card-tcp-details {
                background-color: rgba(255, 255, 255, 0.05);
            }
            
            .theme-dark .device-card-total {
                border-top-color: rgba(255, 255, 255, 0.15);
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
            
            
            .bandix-connection-container > .cbi-section:first-of-type {
                margin-top: 0;
            }
            
            .bandix-connection-container > .cbi-section:last-of-type {
                margin-bottom: 0;
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

            .theme-dark .stats-grid .cbi-section {
                border-color: rgba(255, 255, 255, 0.15);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
            
            .stats-card-main-value {
                font-size: 2.25rem;
                font-weight: 700;
                margin: 0 0 8px 0;
                line-height: 1;
            }
            
            .stats-card-details {
                margin-top: 12px;
                display: flex;
                flex-direction: column;
                gap: 6px;
                width: 100%;
            }
            
            .stats-detail-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.875rem;
            }
            
            .stats-detail-label {
                opacity: 0.7;
                font-weight: 500;
            }
            
            .stats-detail-value {
                font-weight: 600;
            }
            
            .bandix-table {
                width: 100%;
                table-layout: fixed;
            }
            
            .bandix-table th {
                padding: 12px 16px;
                text-align: left;
                font-weight: 600;
                border: none;
                font-size: 0.875rem;
                white-space: nowrap;
            }
            
            .bandix-table th:nth-child(1) { width: 26%; }
            .bandix-table th:nth-child(2) { width: 10%; }
            .bandix-table th:nth-child(3) { width: 10%; }
            .bandix-table th:nth-child(4) { width: 28%; }
            .bandix-table th:nth-child(5) { width: 13%; }
            .bandix-table th:nth-child(6) { width: 13%; }
            
            .bandix-table td {
                padding: 12px 16px;
                vertical-align: middle;
                word-break: break-word;
                overflow-wrap: break-word;
            }
            
            
            .device-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .device-status {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            
            .device-status.online {
                background-color: #10b981;
            }
            
            .device-status.offline {
                background-color: #9ca3af;
            }
            
            .device-details {
                min-width: 0;
                flex: 1;
            }
            
            .device-name {
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
            }
            
            .device-ip {
                opacity: 0.7;
                font-size: 0.875rem;
            }
            
            .device-mac {
                opacity: 0.6;
                font-size: 0.75rem;
            }
            
            
            .tcp-status-details {
                display: flex;
                flex-direction: column;
                gap: 6px;
                font-size: 0.875rem;
            }
            
            .tcp-status-item {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .tcp-status-label {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
                color: white;
                min-width: 50px;
                text-align: center;
            }
            
            .tcp-status-label.established {
                background-color: #10b981;
            }
            
            .tcp-status-label.time-wait {
                background-color: #f59e0b;
            }
            
            .tcp-status-label.closed {
                background-color: #6b7280;
            }
            
            .tcp-status-value {
                font-weight: 600;
            }
            
            .loading-state {
                text-align: center;
                padding: 40px;
                opacity: 0.7;
                font-style: italic;
            }
            
            .error-state {
                text-align: center;
                padding: 40px;
            }

            .flows-view-btn {
                padding: 4px 10px;
                font-size: 0.8rem;
            }

            .flows-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0,0,0,0);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1100;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease, visibility 0.2s ease, background-color 0.2s ease;
            }

            .flows-modal-overlay.show {
                background-color: rgba(0,0,0,0.5);
                opacity: 1;
                visibility: visible;
            }

            .flows-modal-overlay .flows-modal-content {
                margin: 16px;
                width: 95vw;
                max-width: 1200px;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                box-sizing: border-box;
                background-color: ${themeColors.modalBg};
            }

            .flows-modal-content.theme-light {
                color: #111827;
            }

            .flows-modal-content.theme-dark {
                color: #e5e5e5;
            }

            .flows-modal-content.theme-dark .flows-modal-header {
                border-bottom-color: rgba(255,255,255,0.15);
            }

            .flows-modal-content.theme-dark .flows-filters {
                border-bottom-color: rgba(255,255,255,0.15);
            }

            .flows-modal-content.theme-dark .flows-table th,
            .flows-modal-content.theme-dark .flows-table td {
                border-color: rgba(255,255,255,0.1);
            }

            .flows-modal-content.theme-dark .flows-table-body {
                background-color: transparent;
            }

            .flows-modal-content .flows-modal-header {
                padding: 12px 16px;
                border-bottom: 1px solid rgba(0,0,0,0.1);
                flex-shrink: 0;
            }

            .flows-modal-content .flows-modal-title {
                font-size: 1.1rem;
                font-weight: 600;
                margin: 0 0 4px 0;
            }

            .flows-modal-content .flows-modal-subtitle {
                font-size: 0.85rem;
                opacity: 0.7;
            }

            .flows-modal-content .flows-filters {
                padding: 12px 16px;
                display: flex;
                gap: 12px;
                align-items: center;
                flex-wrap: wrap;
                border-bottom: 1px solid rgba(0,0,0,0.1);
                flex-shrink: 0;
            }

            .flows-modal-content .flows-filters select {
                padding: 6px 10px;
                border-radius: 4px;
                border: 1px solid rgba(0,0,0,0.2);
                font-size: 0.875rem;
            }

            .flows-modal-content.theme-dark .flows-filters select {
                background-color: #3a3a3a;
                border-color: rgba(255,255,255,0.2);
                color: #e5e5e5;
            }

            .flows-modal-content .flows-table-wrap {
                overflow: auto;
                flex: 1;
                min-height: 200px;
            }

            .flows-modal-content .flows-table {
                width: 100%;
                table-layout: fixed;
                border-collapse: collapse;
                font-size: 0.85rem;
            }

            .flows-modal-content .flows-table th:nth-child(1),
            .flows-modal-content .flows-table td:nth-child(1) { width: 5%; }
            .flows-modal-content .flows-table th:nth-child(2),
            .flows-modal-content .flows-table td:nth-child(2) { width: 8%; }
            .flows-modal-content .flows-table th:nth-child(3),
            .flows-modal-content .flows-table td:nth-child(3) { width: 14%; }
            .flows-modal-content .flows-table th:nth-child(4),
            .flows-modal-content .flows-table td:nth-child(4) { width: 14%; }
            .flows-modal-content .flows-table th:nth-child(5),
            .flows-modal-content .flows-table td:nth-child(5) { width: 10%; }
            .flows-modal-content .flows-table th:nth-child(6),
            .flows-modal-content .flows-table td:nth-child(6) { width: 14%; }
            .flows-modal-content .flows-table th:nth-child(7),
            .flows-modal-content .flows-table td:nth-child(7) { width: 14%; }
            .flows-modal-content .flows-table th:nth-child(8),
            .flows-modal-content .flows-table td:nth-child(8) { width: 10%; }
            .flows-modal-content .flows-table th:nth-child(9),
            .flows-modal-content .flows-table td:nth-child(9) { width: 11%; }

            .flows-modal-content .flows-table th,
            .flows-modal-content .flows-table td {
                padding: 8px 12px;
                text-align: left;
                border-bottom: 1px solid rgba(0,0,0,0.08);
            }

            .flows-modal-content .flows-table th {
                font-weight: 600;
                white-space: nowrap;
            }

            .flows-modal-content .flows-addr-cell {
                word-break: break-all;
                font-size: 0.8rem;
            }

            .flows-modal-content .flows-protocol-tcp {
                color: #10b981;
                font-weight: 600;
            }

            .flows-modal-content .flows-protocol-udp {
                color: #06b6d4;
                font-weight: 600;
            }

            .flows-modal-content .flows-state-est {
                color: #10b981;
            }

            .flows-modal-content .flows-state-wait {
                color: #f59e0b;
            }

            .flows-modal-content .flows-state-close {
                color: #6b7280;
            }

            .flows-modal-content .flows-footer {
                padding: 12px 16px;
                border-top: 1px solid rgba(0,0,0,0.1);
                flex-shrink: 0;
                display: flex;
                justify-content: flex-end;
            }

            .flows-modal-content.theme-dark .flows-footer {
                border-top-color: rgba(255,255,255,0.15);
            }
        `);
        document.head.appendChild(style);

        var themeMode = getThemeMode();
        var container = E('div', { 'class': 'bandix-connection-container theme-' + themeMode });

        // 页面标题
        var header = E('div', { 'class': 'bandix-header' }, [
            E('h1', { 'class': 'bandix-title' }, _('Bandix Connection Monitor'))
        ]);
        container.appendChild(header);

        // 检查连接监控是否启用
        if (!connectionEnabled) {
            var alertDiv = E('div', {
                'class': 'bandix-alert' + (getThemeType() === 'wide' ? ' wide-theme' : '')
            }, [
                E('div', { 'style': 'display: flex; align-items: center; gap: 8px;' }, [
                    E('span', { 'style': 'font-size: 1rem;' }, '⚠'),
                    E('div', {}, [
                        E('strong', {}, _('Connection Monitor Disabled')),
                        E('p', { 'style': 'margin: 4px 0 0 0;' },
                            _('Please enable connection monitoring in settings'))
                    ])
                ])
            ]);
            container.appendChild(alertDiv);

            var settingsCard = E('div', { 'class': 'cbi-section' }, [
                E('div', { 'style': 'text-align: center; padding: 16px;' }, [
                    E('a', {
                        'href': '/cgi-bin/luci/admin/network/bandix/settings',
                        'class': 'btn btn-primary'
                    }, _('Go to Settings'))
                ])
            ]);
            container.appendChild(settingsCard);
            return container;
        }

        // 添加提示信息
        var infoAlert = E('div', {
            'class': 'bandix-alert' + (getThemeType() === 'wide' ? ' wide-theme' : '')
        }, [
            E('div', { 'style': 'display: flex; align-items: center; gap: 8px;' }, [
                E('span', { 'style': 'font-size: 1rem;' }, '⚠'),
                E('span', {}, _('List only shows LAN device connections, data may differ from total connections.'))
            ])
        ]);
        container.appendChild(infoAlert);

        // 全局统计卡片
        var statsGrid = E('div', { 'class': 'stats-grid' }, [
            E('div', { 'class': 'cbi-section' }, [
                E('div', { 'class': 'stats-card-title' }, _('Total Connections')),
                E('div', { 'class': 'stats-card-main-value', 'id': 'total-connections' }, '-')
            ]),
            E('div', { 'class': 'cbi-section' }, [
                E('div', { 'class': 'stats-card-title' }, _('TCP Connections')),
                E('div', { 'class': 'stats-card-main-value', 'id': 'tcp-connections' }, '-'),
                E('div', { 'class': 'stats-card-details' }, [
                    E('div', { 'class': 'stats-detail-row' }, [
                        E('span', { 'class': 'stats-detail-label' }, 'ESTABLISHED'),
                        E('span', { 'class': 'stats-detail-value', 'id': 'established-tcp' }, '-')
                    ]),
                    E('div', { 'class': 'stats-detail-row' }, [
                        E('span', { 'class': 'stats-detail-label' }, 'TIME_WAIT'),
                        E('span', { 'class': 'stats-detail-value', 'id': 'time-wait-tcp' }, '-')
                    ]),
                    E('div', { 'class': 'stats-detail-row' }, [
                        E('span', { 'class': 'stats-detail-label' }, 'CLOSE_WAIT'),
                        E('span', { 'class': 'stats-detail-value', 'id': 'close-wait-tcp' }, '-')
                    ])
                ])
            ]),
            E('div', { 'class': 'cbi-section' }, [
                E('div', { 'class': 'stats-card-title' }, _('UDP Connections')),
                E('div', { 'class': 'stats-card-main-value', 'id': 'udp-connections' }, '-')
            ])
        ]);
        container.appendChild(statsGrid);

        // 设备连接统计表格
        var deviceCard = E('div', { 'class': 'cbi-section' }, [
            E('h3', {}, _('Device Connection Statistics')),
            E('div', {}, [
                E('div', { 'id': 'device-table-container' }, [
                    E('table', { 'class': 'bandix-table' }, [
                        E('thead', {}, [
                            E('tr', {}, [
                                E('th', {}, _('Device')),
                                E('th', {}, 'TCP'),
                                E('th', {}, 'UDP'),
                                E('th', {}, _('TCP Status Details')),
                                E('th', {}, _('Total Connections')),
                                E('th', { 'style': 'width: 80px;' }, _('Actions'))
                            ])
                        ]),
                        E('tbody', {})
                    ])
                ])
            ])
        ]);
        container.appendChild(deviceCard);

        // 更新全局统计
        function updateGlobalStats(stats) {
            if (!stats) return;

            document.getElementById('total-connections').textContent = stats.total || 0;
            document.getElementById('tcp-connections').textContent = stats.tcp || 0;
            document.getElementById('udp-connections').textContent = stats.udp || 0;
            document.getElementById('established-tcp').textContent = stats.tcp_est || 0;
            document.getElementById('time-wait-tcp').textContent = stats.tcp_tw || 0;
            document.getElementById('close-wait-tcp').textContent = stats.tcp_cw || 0;
        }

        // 更新设备表格
        function updateDeviceTable(devices) {
            var container = document.getElementById('device-table-container');

            if (!devices || devices.length === 0) {
                container.innerHTML = '';
                container.appendChild(E('div', { 'class': 'loading-state' },
                    _('No Data')));
                return;
            }

            // 创建表格（PC端）
            var table = E('table', { 'class': 'bandix-table' }, [
                E('thead', {}, [
                    E('tr', {}, [
                        E('th', {}, _('Device')),
                        E('th', {}, 'TCP'),
                        E('th', {}, 'UDP'),
                        E('th', {}, _('TCP Status Details')),
                        E('th', {}, _('Total Connections')),
                        E('th', {}, _('Actions'))
                    ])
                ]),
                E('tbody', {}, devices.map(function (device) {
                    var viewBtn = E('button', {
                        'class': 'cbi-button cbi-button-reset flows-view-btn',
                        'data-ip': device.ip4 || '',
                        'data-device': JSON.stringify({ ip4: device.ip4, host: device.host, mac: device.mac })
                    }, _('Details'));
                    return E('tr', {}, [
                        E('td', {}, [
                            E('div', { 'class': 'device-info' }, [
                                E('div', { 'class': 'device-status online' }),
                                E('div', { 'class': 'device-details' }, [
                                    E('div', { 'class': 'device-name' }, formatDeviceName(device)),
                                    E('div', { 'class': 'device-ip' }, device.ip4 || '-'),
                                    E('div', { 'class': 'device-mac' }, device.mac || '-')
                                ])
                            ])
                        ]),
                        E('td', { 'style': 'font-weight: 600; font-size: 1.25rem;' }, device.tcp || 0),
                        E('td', { 'style': 'font-weight: 600; font-size: 1.25rem;' }, device.udp || 0),
                        E('td', {}, [
                            E('div', { 'class': 'tcp-status-details' }, [
                                E('div', { 'class': 'tcp-status-item' }, [
                                    E('span', { 'class': 'tcp-status-label established' }, 'EST'),
                                    E('span', { 'class': 'tcp-status-value' }, device.tcp_est || 0)
                                ]),
                                E('div', { 'class': 'tcp-status-item' }, [
                                    E('span', { 'class': 'tcp-status-label time-wait' }, 'WAIT'),
                                    E('span', { 'class': 'tcp-status-value' }, device.tcp_tw || 0)
                                ]),
                                E('div', { 'class': 'tcp-status-item' }, [
                                    E('span', { 'class': 'tcp-status-label closed' }, 'CLOSE'),
                                    E('span', { 'class': 'tcp-status-value' }, device.tcp_cw || 0)
                                ])
                            ])
                        ]),
                        E('td', {}, E('strong', { 'style': 'font-size: 1.25rem;' }, device.total || 0)),
                        E('td', {}, viewBtn)
                    ]);
                }))
            ]);

            // 创建卡片容器（移动端）
            var cardsContainer = E('div', { 'class': 'device-list-cards' });

            devices.forEach(function (device) {
                var card = E('div', { 'class': 'device-card' }, [
                    // 卡片头部：设备信息
                    E('div', { 'class': 'device-card-header' }, [
                        E('div', { 'class': 'device-status online' }),
                        E('div', { 'class': 'device-card-name' }, [
                            E('div', { 'class': 'device-name' }, formatDeviceName(device)),
                            E('div', { 'class': 'device-ip' }, device.ip4 || '-'),
                            E('div', { 'class': 'device-mac' }, device.mac || '-')
                        ])
                    ]),
                    // 统计信息：TCP 和 UDP
                    E('div', { 'class': 'device-card-stats' }, [
                        E('div', { 'class': 'device-card-stat-item' }, [
                            E('div', { 'class': 'device-card-stat-label' }, 'TCP'),
                            E('div', { 'class': 'device-card-stat-value' }, device.tcp || 0)
                        ]),
                        E('div', { 'class': 'device-card-stat-item' }, [
                            E('div', { 'class': 'device-card-stat-label' }, 'UDP'),
                            E('div', { 'class': 'device-card-stat-value' }, device.udp || 0)
                        ])
                    ]),
                    // TCP 状态详情
                    E('div', { 'class': 'device-card-tcp-details' }, [
                        E('div', { 'class': 'device-card-tcp-details-label' }, _('TCP Status Details')),
                        E('div', { 'class': 'device-card-tcp-status-row' }, [
                            E('span', { 'class': 'device-card-tcp-status-label established' }, 'EST'),
                            E('span', { 'class': 'device-card-tcp-status-value' }, device.tcp_est || 0)
                        ]),
                        E('div', { 'class': 'device-card-tcp-status-row' }, [
                            E('span', { 'class': 'device-card-tcp-status-label time-wait' }, 'WAIT'),
                            E('span', { 'class': 'device-card-tcp-status-value' }, device.tcp_tw || 0)
                        ]),
                        E('div', { 'class': 'device-card-tcp-status-row' }, [
                            E('span', { 'class': 'device-card-tcp-status-label closed' }, 'CLOSE'),
                            E('span', { 'class': 'device-card-tcp-status-value' }, device.tcp_cw || 0)
                        ])
                    ]),
                    // 总连接数
                    E('div', { 'class': 'device-card-total' }, [
                        E('div', { 'style': 'font-size: 0.875rem; opacity: 0.7; font-weight: 500;' }, _('Total Connections')),
                        E('div', { 'style': 'display: flex; align-items: center; gap: 8px;' }, [
                            E('span', { 'style': 'font-size: 1.25rem; font-weight: 700;' }, device.total || 0),
                            E('button', {
                                'class': 'cbi-button cbi-button-reset flows-view-btn',
                                'data-ip': device.ip4 || '',
                                'data-device': JSON.stringify({ ip4: device.ip4, host: device.host, mac: device.mac })
                            }, _('Details'))
                        ])
                    ])
                ]);

                cardsContainer.appendChild(card);
            });

            container.innerHTML = '';
            container.appendChild(table);
            container.appendChild(cardsContainer);
        }

        // 显示错误信息
        function showError(message) {
            var container = document.getElementById('device-table-container');
            container.innerHTML = '';
            container.appendChild(E('div', { 'class': 'error-state' }, message));
        }

        // 定义更新连接数据的函数
        function updateConnectionData() {
            return callGetConnection().then(function (result) {
                if (result && result.status === 'success' && result.data) {
                    updateGlobalStats(result.data.g);
                    updateDeviceTable(result.data.d);
                } else {
                    showError(_('Unable to fetch data'));
                }
            }).catch(function (error) {
                console.error('Failed to load connection data:', error);
                showError(_('Unable to fetch data'));
            });
        }

        function showFlowsModal(deviceIp, deviceInfo) {
            var currentTheme = getThemeMode();
            var protocolSelect = E('select', { 'class': 'cbi-input-select', 'id': 'flows-protocol' }, [
                E('option', { 'value': '' }, _('All')),
                E('option', { 'value': 'tcp' }, 'TCP'),
                E('option', { 'value': 'udp' }, 'UDP')
            ]);
            var stateSelect = E('select', { 'class': 'cbi-input-select', 'id': 'flows-state' }, [
                E('option', { 'value': '' }, _('All')),
                E('option', { 'value': 'ESTABLISHED' }, 'ESTABLISHED'),
                E('option', { 'value': 'TIME_WAIT' }, 'TIME_WAIT'),
                E('option', { 'value': 'CLOSE_WAIT' }, 'CLOSE_WAIT')
            ]);
            var tableBody = E('tbody', { 'class': 'flows-table-body' });
            var tableWrap = E('div', { 'class': 'flows-table-wrap' }, [
                E('table', { 'class': 'flows-table' }, [
                    E('thead', {}, [
                        E('tr', {}, [
                            E('th', {}, _('Protocol')),
                            E('th', {}, _('State')),
                            E('th', {}, _('Orig Src')),
                            E('th', {}, _('Orig Dst')),
                            E('th', {}, _('Send')),
                            E('th', {}, _('Repl Src')),
                            E('th', {}, _('Repl Dst')),
                            E('th', {}, _('Reply')),
                            E('th', {}, _('Flags'))
                        ])
                    ]),
                    tableBody
                ])
            ]);

            function loadFlows() {
                var protocol = protocolSelect.value || '';
                var state = stateSelect.value || '';
                tableBody.innerHTML = '';
                tableBody.appendChild(E('tr', {}, [
                    E('td', { 'colspan': 9, 'class': 'loading-state' }, _('Loading…'))
                ]));
                return callGetConnectionFlows(deviceIp, protocol || null, state || null).then(function (res) {
                    tableBody.innerHTML = '';
                    if (!res || res.status !== 'success' || !res.data || res.data.length === 0) {
                        tableBody.appendChild(E('tr', {}, [
                            E('td', { 'colspan': 9, 'class': 'loading-state' }, _('No connections'))
                        ]));
                        return;
                    }
                    res.data.forEach(function (f) {
                        var stateCls = '';
                        if (f.state) {
                            if (f.state.indexOf('ESTABLISHED') >= 0) stateCls = 'flows-state-est';
                            else if (f.state.indexOf('TIME_WAIT') >= 0) stateCls = 'flows-state-wait';
                            else if (f.state.indexOf('CLOSE') >= 0) stateCls = 'flows-state-close';
                        }
                        var origSrc = f.orig ? (f.orig.src || '-') + ':' + (f.orig.sport || '-') : '-';
                        var origDst = f.orig ? (f.orig.dst || '-') + ':' + (f.orig.dport || '-') : '-';
                        var replSrc = f.repl ? (f.repl.src || '-') + ':' + (f.repl.sport || '-') : '-';
                        var replDst = f.repl ? (f.repl.dst || '-') + ':' + (f.repl.dport || '-') : '-';
                        var sendStr = (f.orig_packets || 0) + ' ' + _('pkts') + ' / ' + formatSize(f.orig_bytes || 0);
                        var replyStr = (f.repl_packets || 0) + ' ' + _('pkts') + ' / ' + formatSize(f.repl_bytes || 0);
                        var flagsStr = (f.flags && f.flags.length) ? f.flags.join(' ') : '-';
                        var protoCls = (f.protocol || '').toLowerCase() === 'tcp' ? 'flows-protocol-tcp' : 'flows-protocol-udp';
                        tableBody.appendChild(E('tr', {}, [
                            E('td', { 'class': protoCls }, (f.protocol || '-').toUpperCase()),
                            E('td', { 'class': stateCls }, f.state || '-'),
                            E('td', { 'class': 'flows-addr-cell' }, origSrc),
                            E('td', { 'class': 'flows-addr-cell' }, origDst),
                            E('td', {}, sendStr),
                            E('td', { 'class': 'flows-addr-cell' }, replSrc),
                            E('td', { 'class': 'flows-addr-cell' }, replDst),
                            E('td', {}, replyStr),
                            E('td', { 'style': 'font-size: 0.8rem;' }, flagsStr)
                        ]));
                    });
                }).catch(function (err) {
                    tableBody.innerHTML = '';
                    tableBody.appendChild(E('tr', {}, [
                        E('td', { 'colspan': 9, 'class': 'error-state' }, _('Failed to load') + ': ' + (err.message || err))
                    ]));
                });
            }

            function onFilterChange() {
                loadFlows();
            }

            function hideFlowsModal() {
                var overlay = document.getElementById('flows-modal-overlay');
                if (overlay) overlay.classList.remove('show');
            }

            var modalContent = E('div', { 'class': 'flows-modal-content theme-' + currentTheme }, [
                E('div', { 'class': 'flows-modal-header' }, [
                    E('div', { 'class': 'flows-modal-title' }, _('Connection Details') + ' - ' + (deviceInfo.host || deviceInfo.ip4 || deviceIp)),
                    E('div', { 'class': 'flows-modal-subtitle' }, (deviceInfo.ip4 || '') + (deviceInfo.mac ? ' · ' + deviceInfo.mac : ''))
                ]),
                E('div', { 'class': 'flows-filters' }, [
                    E('label', {}, _('Protocol') + ':'),
                    protocolSelect,
                    E('label', {}, _('State') + ':'),
                    stateSelect,
                    E('button', { 'class': 'cbi-button cbi-button-apply', 'click': loadFlows }, _('Refresh'))
                ]),
                tableWrap,
                E('div', { 'class': 'flows-footer' }, [
                    E('button', { 'class': 'cbi-button cbi-button-reset', 'click': hideFlowsModal }, _('Close'))
                ])
            ]);

            if (protocolSelect && protocolSelect.addEventListener) {
                protocolSelect.addEventListener('change', onFilterChange);
            }
            if (stateSelect && stateSelect.addEventListener) {
                stateSelect.addEventListener('change', onFilterChange);
            }

            var overlay = document.getElementById('flows-modal-overlay');
            if (!overlay) {
                overlay = E('div', { 'class': 'flows-modal-overlay', 'id': 'flows-modal-overlay' });
                document.body.appendChild(overlay);
            }
            overlay.innerHTML = '';
            overlay.appendChild(modalContent);
            overlay.classList.add('show');
            modalContent.addEventListener('click', function (e) { e.stopPropagation(); });
            loadFlows();
        }

        container.addEventListener('click', function (ev) {
            var btn = ev.target;
            if (btn && btn.classList && btn.classList.contains('flows-view-btn')) {
                var ip = btn.getAttribute('data-ip');
                var deviceStr = btn.getAttribute('data-device');
                var deviceInfo = {};
                try {
                    if (deviceStr) deviceInfo = JSON.parse(deviceStr);
                } catch (e) {}
                if (ip) showFlowsModal(ip, deviceInfo);
            }
        });

        // 轮询获取数据
        poll.add(updateConnectionData, 1);

        // 立即执行一次，不等待轮询
        updateConnectionData();

        // 自动适应主题背景色和文字颜色的函数
        function applyThemeColors() {
            try {
                var mainElement = document.querySelector('.main') || document.body;
                var computedStyle = window.getComputedStyle(mainElement);
                var bgColor = computedStyle.backgroundColor;

                // 如果父元素有背景色，应用到容器和卡片
                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    var containerEl = document.querySelector('.bandix-connection-container');
                    if (containerEl) {
                        containerEl.style.backgroundColor = bgColor;
                    }

                    // 应用到表格表头
                    var tableHeaders = document.querySelectorAll('.bandix-table th');
                    tableHeaders.forEach(function (th) {
                        th.style.backgroundColor = bgColor;
                    });
                }

                // 检测文字颜色并应用
                var textColor = computedStyle.color;
                if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
                    var containerEl = document.querySelector('.bandix-connection-container');
                    if (containerEl) {
                        containerEl.style.color = textColor;
                    }
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
                var container = document.querySelector('.bandix-connection-container');
                if (container) {
                    observer.observe(container, {
                        childList: true,
                        subtree: true
                    });
                }
            }, 200);
        }

        return container;
    }
});