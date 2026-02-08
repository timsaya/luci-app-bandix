'use strict';
'require view';
'require ui';
'require uci';
'require rpc';
'require poll';


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



function formatDeviceName(device) {
    var parts = [];
    if (device && device.device_name && device.device_name !== '') {
        parts.push(device.device_name);
    }
    // 显示IP地址
    // 查询时使用source_ip（查询设备的IP）
    // 响应时使用destination_ip（目标IP，即查询设备的IP），而不是source_ip（DNS服务器的IP）
    var ip = null;
    if (device && device.is_query) {
        // 查询记录：使用source_ip
        ip = device.source_ip;
    } else {
        // 响应记录：使用destination_ip（目标IP）
        ip = device.destination_ip;
    }
    if (ip) {
        parts.push(ip);
    }
    if (parts.length === 0) {
        return _('Unknown Device');
    }
    return parts.join(' / ');
}

function formatDnsServer(query) {
    if (!query) return '-';
    // 查询时显示目标IP（destination_ip），响应时显示源IP（source_ip）
    if (query.is_query) {
        return query.destination_ip || '-';
    } else {
        return query.source_ip || '-';
    }
}

function formatResponseResult(query) {
    if (!query) return { display: [], full: [] };
    
    // 显示响应记录（response_records），它是一个字符串数组
    if (query.response_records && Array.isArray(query.response_records) && query.response_records.length > 0) {
        var maxDisplay = 5; // 最多显示5条
        var displayRecords = query.response_records.slice(0, maxDisplay);
        var fullRecords = query.response_records;
        
        return {
            display: displayRecords,
            full: fullRecords,
            hasMore: fullRecords.length > maxDisplay
        };
    }
    
    return { display: [], full: [] };
}

var callGetDnsQueries = rpc.declare({
    object: 'luci.bandix',
    method: 'getDnsQueries',
    params: ['domain', 'device', 'is_query', 'dns_server', 'query_type', 'page', 'page_size'],
    expect: {}
});

var callGetDnsStats = rpc.declare({
    object: 'luci.bandix',
    method: 'getDnsStats',
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
        var dnsEnabled = uci.get('bandix', 'dns', 'enabled') === '1';

        var style = E('style', {}, `
            .bandix-dns-container {
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
            
            
            .filter-section {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                padding: 16px;
                align-items: center;
            }
            
            .filter-group {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .filter-label {
                font-size: 0.875rem;
                font-weight: 500;
                white-space: nowrap;
            }
            
            .filter-input {
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 0.875rem;
                min-width: 120px;
                max-width: 200px;
                width: 120px;
                opacity: 1;
            }
            
            .filter-section .cbi-input-select {
                min-width: 120px;
                max-width: 200px;
                width: 120px;
            }
            
            .bandix-table {
                width: 100%;
                font-size: 0.875rem;
            }
            
            .bandix-table th {
                padding: 10px 12px;
                text-align: left;
                font-weight: 600;
                opacity: 1;
                white-space: nowrap;
            }
            
            .bandix-table td {
                padding: 10px 12px;
                word-break: break-word;
            }
            
            .query-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
            }
            
            .query-badge.query {
                background-color: #3b82f6;
                color: white;
            }
            
            .query-badge.response {
                background-color: #10b981;
                color: white;
            }
            
            .response-code {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
            }
            
            .response-code.success {
                background-color: #10b981;
                color: white;
            }
            
            .response-code.error {
                background-color: #ef4444;
                color: white;
            }
            
            .response-code.warning {
                background-color: #f59e0b;
                color: white;
            }
            
            .pagination {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px;
                flex-wrap: wrap;
                gap: 12px;
            }
            
            .pagination-info {
                font-size: 0.875rem;
                opacity: 0.7;
            }
            
            .pagination-controls {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            /* 刷新按钮加载状态 */
            .refresh-btn-loading {
                position: relative;
                pointer-events: none;
                opacity: 0.8;
            }
            
            .refresh-btn-loading::before {
                content: '';
                display: inline-block;
                width: 14px;
                height: 14px;
                border: 2px solid currentColor;
                border-top-color: transparent;
                border-right-color: transparent;
                border-radius: 50%;
                animation: refresh-btn-spin 0.6s linear infinite;
                margin-right: 8px;
                vertical-align: middle;
            }
            
            @keyframes refresh-btn-spin {
                0% {
                    transform: rotate(0deg);
                }
                100% {
                    transform: rotate(360deg);
                }
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
            
            .refresh-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                backdrop-filter: blur(2px);
                -webkit-backdrop-filter: blur(2px);
            }
            
            .response-ips {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }
            
            .response-ip-badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.75rem;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                margin-bottom: 16px;
            }
            
            @media (max-width: 1200px) {
                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            @media (max-width: 768px) {
                .stats-grid {
                    grid-template-columns: 1fr;
                }
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
            
            .stats-list-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 0;
                font-size: 0.875rem;
            }
            
            .stats-list-name {
                opacity: 0.8;
            }
            
            .stats-list-count {
                font-weight: 600;
                opacity: 0.9;
            }
            
            /* 移动端优化 */
            @media (max-width: 768px) {
                /* 移动端隐藏表格，显示卡片 */
                .bandix-table {
                    display: none;
                }
                
                .dns-query-cards {
                    display: block;
                }
                
                /* 移动端卡片样式 */
                .dns-query-card {
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 12px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }
                
                .dns-query-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                }
                
                .dns-query-card-time {
                    font-size: 0.75rem;
                    opacity: 0.7;
                    font-weight: 500;
                }
                
                .dns-query-card-type {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 600;
                }
                
                .dns-query-card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .dns-query-card-row {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .dns-query-card-label {
                    font-size: 0.75rem;
                    opacity: 0.7;
                    font-weight: 500;
                }
                
                .dns-query-card-value {
                    font-size: 0.875rem;
                    font-weight: 600;
                    word-break: break-word;
                }
                
                .dns-query-card-domain {
                    font-size: 0.9375rem;
                    font-weight: 600;
                    color: #3b82f6;
                    word-break: break-word;
                }
                
                .dns-query-card-response-result {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-top: 4px;
                }
                
                .dns-query-card-response-badge {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    background-color: rgba(0, 0, 0, 0.05);
                }
                
                /* 移动端过滤器优化 */
                .filter-section {
                    flex-direction: column;
                    align-items: stretch;
                    padding: 12px;
                    gap: 10px;
                }
                
                .filter-group {
                    width: 100%;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 6px;
                }
                
                .filter-label {
                    font-size: 0.8125rem;
                }
                
                .filter-input,
                .filter-section .cbi-input-select {
                    width: 100%;
                    max-width: 100%;
                    min-width: 100%;
                }
                
                /* 移动端分页优化 */
                .pagination {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 12px;
                    padding: 12px;
                }
                
                .pagination-info {
                    text-align: center;
                    font-size: 0.8125rem;
                }
                
                .pagination-controls {
                    width: 100%;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                
                .pagination-controls .cbi-input-select {
                    width: 100%;
                    margin-right: 0;
                    margin-bottom: 8px;
                }
                
                .pagination-controls button {
                    flex: 1;
                    min-width: 100px;
                }
            }
            
            .theme-dark .dns-query-card {
                border-color: rgba(255, 255, 255, 0.15);
            }
            
            .theme-dark .dns-query-card-header {
                border-bottom-color: rgba(255, 255, 255, 0.15);
            }
            
            .theme-dark .dns-query-card-response-badge {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            /* PC端显示表格，隐藏卡片 */
            @media (min-width: 769px) {
                .bandix-table {
                    display: table;
                }
                
                .dns-query-cards {
                    display: none;
                }
            }
        `);
        document.head.appendChild(style);

        var themeMode = getThemeMode();
        var container = E('div', { 'class': 'bandix-dns-container theme-' + themeMode });

        var header = E('div', { 'class': 'bandix-header' }, [
            E('h1', { 'class': 'bandix-title' }, _('Bandix DNS Monitor'))
        ]);
        container.appendChild(header);

        if (!dnsEnabled) {
            var alertDiv = E('div', { 
                'class': 'bandix-alert' + (getThemeType() === 'wide' ? ' wide-theme' : '')
            }, [
                E('div', { 'style': 'display: flex; align-items: center; gap: 8px;' }, [
                    E('span', { 'style': 'font-size: 1rem;' }, '⚠'),
                    E('div', {}, [
                        E('strong', {}, _('DNS Monitoring Disabled')),
                        E('p', { 'style': 'margin: 4px 0 0 0;' },
                            _('Please enable DNS monitoring in settings'))
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
                E('span', {}, _('Does not include DoH and DoT'))
            ])
        ]);
        container.appendChild(infoAlert);

        // DNS 统计信息卡片
        var statsGrid = E('div', { 'class': 'stats-grid', 'id': 'dns-stats-grid' });
        container.appendChild(statsGrid);

        // DNS 查询记录
        var queriesSection = E('div', { 'class': 'cbi-section' }, [
            E('h3', {}, _('DNS Query Records')),
            E('div', {}, [
            E('div', { 'class': 'filter-section' }, [
                E('div', { 'class': 'filter-group' }, [
                    E('label', { 'class': 'filter-label' }, _('Type Filter') + ':'),
                    E('select', { 'class': 'cbi-input-select', 'id': 'type-filter' }, [
                        E('option', { 'value': '' }, _('All')),
                        E('option', { 'value': 'true' }, _('Queries Only')),
                        E('option', { 'value': 'false' }, _('Responses Only'))
                    ])
                ]),
                E('div', { 'class': 'filter-group' }, [
                    E('label', { 'class': 'filter-label' }, _('Domain Filter') + ':'),
                    E('input', {
                        'type': 'text',
                        'class': 'filter-input',
                        'id': 'domain-filter',
                        'placeholder': _('Domain')
                    })
                ]),
                E('div', { 'class': 'filter-group' }, [
                    E('label', { 'class': 'filter-label' }, _('Query Type') + ':'),
                    E('select', { 'class': 'cbi-input-select', 'id': 'query-type-filter' }, [
                        E('option', { 'value': '' }, _('All')),
                        E('option', { 'value': 'A' }, 'A'),
                        E('option', { 'value': 'AAAA' }, 'AAAA'),
                        E('option', { 'value': 'CNAME' }, 'CNAME'),
                        E('option', { 'value': 'MX' }, 'MX'),
                        E('option', { 'value': 'TXT' }, 'TXT'),
                        E('option', { 'value': 'NS' }, 'NS'),
                        E('option', { 'value': 'PTR' }, 'PTR'),
                        E('option', { 'value': 'SOA' }, 'SOA'),
                        E('option', { 'value': 'SRV' }, 'SRV'),
                        E('option', { 'value': 'HTTPS' }, 'HTTPS'),
                        E('option', { 'value': 'SVCB' }, 'SVCB')
                    ])
                ]),
                E('div', { 'class': 'filter-group' }, [
                    E('label', { 'class': 'filter-label' }, _('Device Filter') + ':'),
                    E('input', {
                        'type': 'text',
                        'class': 'filter-input',
                        'id': 'device-filter',
                        'placeholder': _('Device')
                    })
                ]),
                E('div', { 'class': 'filter-group' }, [
                    E('label', { 'class': 'filter-label' }, _('DNS Server Filter') + ':'),
                    E('input', {
                        'type': 'text',
                        'class': 'filter-input',
                        'id': 'dns-server-filter',
                        'placeholder': _('DNS Server')
                    })
                ]),
                E('div', { 'class': 'filter-group', 'style': 'margin-left: auto;' }, [
                    E('button', {
                        'class': 'cbi-button cbi-button-action',
                        'id': 'refresh-queries-btn'
                    }, _('Refresh'))
                ])
            ]),
            E('div', { 'id': 'dns-queries-container' }, [
                E('div', { 'class': 'loading-state' }, _('Loading data...'))
            ])
            ])
        ]);
        container.appendChild(queriesSection);

        // 状态变量
        var currentPage = 1;
        var pageSize = 20;
        var currentFilters = {
            domain: '',
            device: '',
            is_query: '',
            dns_server: '',
            query_type: ''
        };


        // 更新查询记录
        function updateQueries() {
            var container = document.getElementById('dns-queries-container');
            if (!container) return Promise.resolve();
            
            // 检查是否有现有内容
            var hasContent = container.querySelector('.bandix-table') || container.querySelector('.loading-state') || container.querySelector('.error-state');
            
            // 保存当前容器高度，避免跳动（只在有内容时）
            var currentHeight = container.offsetHeight;
            if (currentHeight > 0 && hasContent) {
                container.style.minHeight = currentHeight + 'px';
            }
            
            // 显示加载状态，但保持容器结构（只在有内容时显示遮罩层）
            var loadingDiv = container.querySelector('.loading-overlay');
            if (hasContent) {
                if (!loadingDiv) {
                    loadingDiv = E('div', { 
                        'class': 'loading-overlay',
                        'style': 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 10;'
                    }, _('Loading data...'));
                    container.style.position = 'relative';
                    container.appendChild(loadingDiv);
                    // 应用主题背景色
                    setTimeout(function() {
                        applyThemeColors();
                    }, 50);
                } else {
                    loadingDiv.style.display = 'flex';
                }
            } else {
                // 如果没有内容，使用简单的加载状态
                container.innerHTML = '';
                container.appendChild(E('div', { 'class': 'loading-state' },
                    _('Loading data...')));
                // 应用主题背景色
                setTimeout(function() {
                    applyThemeColors();
                }, 50);
            }

            return callGetDnsQueries(
                currentFilters.domain,
                currentFilters.device,
                currentFilters.is_query,
                currentFilters.dns_server,
                currentFilters.query_type,
                currentPage,
                pageSize
            ).then(function (result) {
                // 隐藏或移除加载状态
                if (loadingDiv) {
                    loadingDiv.remove();
                }
                
                // 移除刷新蒙版
                var refreshOverlay = container.querySelector('.refresh-overlay');
                if (refreshOverlay) {
                    refreshOverlay.remove();
                }
                
                // 恢复最小高度和定位
                container.style.minHeight = '';
                if (!hasContent) {
                    container.style.position = '';
                }
                
                if (!result || result.status !== 'success' || !result.data) {
                    container.innerHTML = '';
                    container.appendChild(E('div', { 'class': 'error-state' },
                        _('Unable to fetch data')));
                    // 应用主题背景色
                    setTimeout(function() {
                        applyThemeColors();
                    }, 50);
                    return;
                }

                var queries = result.data.queries || [];
                var total = result.data.total || 0;
                var totalPages = result.data.total_pages || 1;

                if (queries.length === 0) {
                    container.innerHTML = '';
                    container.appendChild(E('div', { 'class': 'loading-state' },
                        _('No Data')));
                    // 应用主题背景色
                    setTimeout(function() {
                        applyThemeColors();
                    }, 50);
                    return;
                }

                // 移除旧的表格、卡片和分页
                var oldTable = container.querySelector('.bandix-table');
                var oldCards = container.querySelector('.dns-query-cards');
                var oldPagination = container.querySelector('.pagination');
                var oldLoadingState = container.querySelector('.loading-state');
                if (oldTable) oldTable.remove();
                if (oldCards) oldCards.remove();
                if (oldPagination) oldPagination.remove();
                if (oldLoadingState) oldLoadingState.remove();
                
                // 确保容器是相对定位（用于遮罩层）
                container.style.position = 'relative';

                // 创建表格（PC端）
                var table = E('table', { 'class': 'bandix-table' }, [
                    E('thead', {}, [
                        E('tr', {}, [
                            E('th', { 'style': 'width: 180px;' }, _('Time')),
                            E('th', { 'style': 'width: 200px;' }, _('Domain')),
                            E('th', { 'style': 'width: 100px;' }, _('Query Type')),
                            E('th', { 'style': 'width: 100px;' }, _('Type')),
                            E('th', { 'style': 'width: 100px;' }, _('Response Time')),
                            E('th', { 'style': 'width: 200px;' }, _('Device')),
                            E('th', { 'style': 'width: 140px;' }, _('DNS Server')),
                            E('th', { 'style': 'width: 200px;' }, _('Response Result'))
                        ])
                    ]),
                    E('tbody', {}, queries.map(function (query) {
                        return E('tr', {}, [
                            E('td', {}, query.timestamp_formatted || '-'),
                            E('td', {}, query.domain || '-'),
                            E('td', {}, query.query_type || '-'),
                            E('td', {}, [
                                E('span', {
                                    'class': 'query-badge ' + (query.is_query ? 'query' : 'response')
                                }, query.is_query ? _('Query') : _('Response'))
                            ]),
                            E('td', {}, query.response_time_ms ? query.response_time_ms + ' ' + _('ms') : '-'),
                            E('td', {}, formatDeviceName(query)),
                            E('td', {}, formatDnsServer(query)),
                            E('td', {}, [
                                E('div', { 
                                    'class': 'response-ips',
                                    'title': (function() {
                                        var result = formatResponseResult(query);
                                        if (result.full.length === 0) {
                                            return '';
                                        }
                                        return result.full.join('\n');
                                    })()
                                }, (function() {
                                    var result = formatResponseResult(query);
                                    if (result.display.length === 0) {
                                        return [E('span', { 'class': 'response-ip-badge' }, '-')];
                                    }
                                    var badges = result.display.map(function (item) {
                                        return E('span', { 'class': 'response-ip-badge' }, item);
                                    });
                                    if (result.hasMore) {
                                        badges.push(E('span', { 'class': 'response-ip-badge', 'style': 'opacity: 0.7;' }, '...'));
                                    }
                                    return badges;
                                })())
                            ])
                        ]);
                    }))
                ]);
                
                // 创建移动端卡片容器
                var cardsContainer = E('div', { 'class': 'dns-query-cards' });
                
                // 为每个查询创建卡片
                queries.forEach(function (query) {
                    var result = formatResponseResult(query);
                    var responseResultBadges = [];
                    if (result.display.length === 0) {
                        responseResultBadges.push(E('span', { 'class': 'dns-query-card-response-badge' }, '-'));
                    } else {
                        result.display.forEach(function (item) {
                            responseResultBadges.push(E('span', { 'class': 'dns-query-card-response-badge' }, item));
                        });
                        if (result.hasMore) {
                            responseResultBadges.push(E('span', { 
                                'class': 'dns-query-card-response-badge',
                                'style': 'opacity: 0.7;'
                            }, '...'));
                        }
                    }
                    
                    var card = E('div', { 'class': 'dns-query-card' }, [
                        // 卡片头部：时间和类型
                        E('div', { 'class': 'dns-query-card-header' }, [
                            E('div', { 'class': 'dns-query-card-time' }, query.timestamp_formatted || '-'),
                            E('span', {
                                'class': 'query-badge ' + (query.is_query ? 'query' : 'response')
                            }, query.is_query ? _('Query') : _('Response'))
                        ]),
                        // 卡片主体
                        E('div', { 'class': 'dns-query-card-body' }, [
                            // 域名
                            E('div', { 'class': 'dns-query-card-row' }, [
                                E('div', { 'class': 'dns-query-card-label' }, _('Domain')),
                                E('div', { 'class': 'dns-query-card-value dns-query-card-domain' }, query.domain || '-')
                            ]),
                            // 查询类型
                            E('div', { 'class': 'dns-query-card-row' }, [
                                E('div', { 'class': 'dns-query-card-label' }, _('Query Type')),
                                E('div', { 'class': 'dns-query-card-value' }, query.query_type || '-')
                            ]),
                            // 响应时间
                            E('div', { 'class': 'dns-query-card-row' }, [
                                E('div', { 'class': 'dns-query-card-label' }, _('Response Time')),
                                E('div', { 'class': 'dns-query-card-value' }, query.response_time_ms ? query.response_time_ms + ' ' + _('ms') : '-')
                            ]),
                            // 设备
                            E('div', { 'class': 'dns-query-card-row' }, [
                                E('div', { 'class': 'dns-query-card-label' }, _('Device')),
                                E('div', { 'class': 'dns-query-card-value' }, formatDeviceName(query))
                            ]),
                            // DNS服务器
                            E('div', { 'class': 'dns-query-card-row' }, [
                                E('div', { 'class': 'dns-query-card-label' }, _('DNS Server')),
                                E('div', { 'class': 'dns-query-card-value' }, formatDnsServer(query))
                            ]),
                            // 响应结果
                            E('div', { 'class': 'dns-query-card-row' }, [
                                E('div', { 'class': 'dns-query-card-label' }, _('Response Result')),
                                E('div', { 
                                    'class': 'dns-query-card-value',
                                    'title': result.full.length > 0 ? result.full.join('\n') : ''
                                }, [
                                    E('div', { 'class': 'dns-query-card-response-result' }, responseResultBadges)
                                ])
                            ])
                        ])
                    ]);
                    
                    cardsContainer.appendChild(card);
                });

                var pagination = E('div', { 'class': 'pagination' }, [
                    E('div', { 'class': 'pagination-info' },
                        _('Page') + ' ' + currentPage + ' ' + _('of') + ' ' + totalPages + '，' + _('Total') + ' ' + total + ' ' + _('records')
                    ),
                    E('div', { 'class': 'pagination-controls' }, [
                        E('select', {
                            'class': 'cbi-input-select',
                            'id': 'page-size-select',
                            'style': 'margin-right: 8px;'
                        }, [
                            E('option', { 'value': '10', 'selected': pageSize === 10 }, '10'),
                            E('option', { 'value': '20', 'selected': pageSize === 20 }, '20'),
                            E('option', { 'value': '50', 'selected': pageSize === 50 }, '50'),
                            E('option', { 'value': '100', 'selected': pageSize === 100 }, '100')
                        ]),
                        E('button', {
                            'class': 'cbi-button cbi-button-action',
                            'id': 'prev-page-btn',
                            'disabled': currentPage <= 1 ? 'disabled' : null
                        }, _('Previous')),
                        E('button', {
                            'class': 'cbi-button cbi-button-action',
                            'id': 'next-page-btn',
                            'disabled': currentPage >= totalPages ? 'disabled' : null
                        }, _('Next'))
                    ])
                ]);

                container.appendChild(table);
                container.appendChild(cardsContainer);
                container.appendChild(pagination);

                // 绑定分页事件
                var prevBtn = document.getElementById('prev-page-btn');
                var nextBtn = document.getElementById('next-page-btn');
                var pageSizeSelect = document.getElementById('page-size-select');

                // 设置按钮的 disabled 状态
                if (prevBtn) {
                    if (currentPage <= 1) {
                        prevBtn.setAttribute('disabled', 'disabled');
                    } else {
                        prevBtn.removeAttribute('disabled');
                    }
                    prevBtn.onclick = function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (currentPage > 1) {
                            currentPage--;
                            updateQueries();
                        }
                    };
                }

                if (nextBtn) {
                    if (currentPage >= totalPages) {
                        nextBtn.setAttribute('disabled', 'disabled');
                    } else {
                        nextBtn.removeAttribute('disabled');
                    }
                    nextBtn.onclick = function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (currentPage < totalPages) {
                            currentPage++;
                            updateQueries();
                        }
                    };
                }

                if (pageSizeSelect) {
                    pageSizeSelect.value = pageSize.toString();
                    pageSizeSelect.onchange = function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        pageSize = parseInt(this.value);
                        currentPage = 1;
                        updateQueries();
                    };
                }
            }).catch(function (error) {
                console.error('Failed to load DNS queries:', error);
                var container = document.getElementById('dns-queries-container');
                if (!container) return;
                
                // 移除刷新蒙版
                var refreshOverlay = container.querySelector('.refresh-overlay');
                if (refreshOverlay) {
                    refreshOverlay.remove();
                }
                
                container.innerHTML = '';
                container.appendChild(E('div', { 'class': 'error-state' },
                    _('Unable to fetch data')));
                // 应用主题背景色
                setTimeout(function() {
                    applyThemeColors();
                }, 50);
            });
        }

        // 更新统计信息卡片
        function updateStats() {
            var statsGrid = document.getElementById('dns-stats-grid');
            if (!statsGrid) return Promise.resolve();
            
            return callGetDnsStats().then(function (result) {
                if (!result || result.status !== 'success' || !result.data || !result.data.stats) {
                    statsGrid.innerHTML = '';
                    return;
                }
                
                var stats = result.data.stats;
                statsGrid.innerHTML = '';
                
                // 格式化时间范围
                function formatTimeRange(start, end, durationMinutes) {
                    if (!start || !end) return '-';
                    var startDate = new Date(start);
                    var endDate = new Date(end);
                    var startStr = startDate.toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    var endStr = endDate.toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    return startStr + ' - ' + endStr + ' (' + durationMinutes + ' ' + _('minutes') + ')';
                }
                
                // 格式化百分比
                function formatPercent(value) {
                    if (typeof value !== 'number') return '-';
                    return (value * 100).toFixed(2) + '%';
                }
                
                // 查询和响应数量卡片
                // 使用后端返回的 total_queries 和 total_responses
                var queryCount = stats.total_queries || 0;
                var responseCount = stats.total_responses || 0;
                
                var totalQueriesCard = E('div', { 'class': 'cbi-section' }, [
                    E('div', { 'class': 'stats-card-title' }, _('Query & Response')),
                    E('div', { 'class': 'stats-card-main-value' }, (queryCount + responseCount || 0).toLocaleString()),
                    E('div', { 'class': 'stats-card-details' }, [
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, _('Queries') + ':'),
                            E('span', { 'class': 'stats-detail-value' }, queryCount.toLocaleString())
                        ]),
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, _('Responses') + ':'),
                            E('span', { 'class': 'stats-detail-value' }, responseCount.toLocaleString())
                        ])
                    ])
                ]);
                
                statsGrid.appendChild(totalQueriesCard);
                
                // 响应时间卡片
                statsGrid.appendChild(E('div', { 'class': 'cbi-section' }, [
                    E('div', { 'class': 'stats-card-title' }, _('Response Time')),
                    E('div', { 'class': 'stats-card-main-value' }, Math.round(stats.latest_response_time_ms || 0) + ' ' + _('ms')),
                    E('div', { 'class': 'stats-card-details' }, [
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, _('Average Response Time') + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.avg_response_time_ms || 0).toFixed(2) + ' ' + _('ms'))
                        ]),
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, _('Min Response Time') + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.min_response_time_ms || 0) + ' ' + _('ms'))
                        ]),
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, _('Max Response Time') + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.max_response_time_ms || 0) + ' ' + _('ms'))
                        ])
                    ])
                ]));
                
                // 最常用查询类型卡片
                if (stats.top_query_types && stats.top_query_types.length > 0) {
                    var queryTypesList = stats.top_query_types.map(function(item) {
                        return E('div', { 'class': 'stats-list-item' }, [
                            E('span', { 'class': 'stats-list-name' }, item.name || '-'),
                            E('span', { 'class': 'stats-list-count' }, (item.count || 0).toLocaleString())
                        ]);
                    });
                    
                    var queryTypesCard = E('div', { 'class': 'cbi-section' }, [
                        E('div', { 'class': 'stats-card-title' }, _('Top Query Types')),
                        E('div', { 'class': 'stats-card-details' })
                    ]);
                    
                    queryTypesList.forEach(function(item) {
                        queryTypesCard.querySelector('.stats-card-details').appendChild(item);
                    });
                    
                    statsGrid.appendChild(queryTypesCard);
                }
                
                // 最常查询域名卡片
                if (stats.top_domains && stats.top_domains.length > 0) {
                    var domainsList = stats.top_domains.map(function(item) {
                        return E('div', { 'class': 'stats-list-item' }, [
                            E('span', { 'class': 'stats-list-name' }, item.name || '-'),
                            E('span', { 'class': 'stats-list-count' }, (item.count || 0).toLocaleString())
                        ]);
                    });
                    
                    statsGrid.appendChild(E('div', { 'class': 'cbi-section' }, [
                        E('div', { 'class': 'stats-card-title' }, _('Top Domains')),
                        E('div', { 'class': 'stats-card-details' }, domainsList)
                    ]));
                }
                
                // 最活跃设备卡片
                if (stats.top_devices && stats.top_devices.length > 0) {
                    var devicesList = stats.top_devices.map(function(item) {
                        return E('div', { 'class': 'stats-list-item' }, [
                            E('span', { 'class': 'stats-list-name' }, item.name || '-'),
                            E('span', { 'class': 'stats-list-count' }, (item.count || 0).toLocaleString())
                        ]);
                    });
                    
                    statsGrid.appendChild(E('div', { 'class': 'cbi-section' }, [
                        E('div', { 'class': 'stats-card-title' }, _('Top Devices')),
                        E('div', { 'class': 'stats-card-details' }, devicesList)
                    ]));
                }
                
                // 最常用DNS服务器卡片
                if (stats.top_dns_servers && stats.top_dns_servers.length > 0) {
                    var serversList = stats.top_dns_servers.map(function(item) {
                        return E('div', { 'class': 'stats-list-item' }, [
                            E('span', { 'class': 'stats-list-name' }, item.name || '-'),
                            E('span', { 'class': 'stats-list-count' }, (item.count || 0).toLocaleString())
                        ]);
                    });
                    
                    statsGrid.appendChild(E('div', { 'class': 'cbi-section' }, [
                        E('div', { 'class': 'stats-card-title' }, _('Top DNS Servers')),
                        E('div', { 'class': 'stats-card-details' }, serversList)
                    ]));
                }
                
                // 应用主题颜色
                setTimeout(function() {
                    applyThemeColors();
                }, 50);
            }).catch(function (error) {
                console.error('Failed to load DNS stats:', error);
                var statsGrid = document.getElementById('dns-stats-grid');
                if (statsGrid) {
                    statsGrid.innerHTML = '';
                }
            });
        }
        
        // 初始化数据加载 - 延迟执行确保 DOM 元素已添加
        setTimeout(function () {
            updateStats();
            updateQueries();
            
            // 轮询更新统计数据（每5秒）
            poll.add(function() {
                return updateStats();
            }, 1);

            // 实时搜索功能（带防抖）
            var domainFilter = document.getElementById('domain-filter');
            var deviceFilter = document.getElementById('device-filter');
            var dnsServerFilter = document.getElementById('dns-server-filter');
            var typeFilter = document.getElementById('type-filter');
            var queryTypeFilter = document.getElementById('query-type-filter');
            var refreshBtn = document.getElementById('refresh-queries-btn');

            if (domainFilter && deviceFilter && dnsServerFilter && typeFilter && queryTypeFilter) {
                var searchTimer = null;
                
                function performSearch() {
                    currentFilters.domain = domainFilter.value.trim();
                    currentFilters.device = deviceFilter.value.trim();
                    currentFilters.dns_server = dnsServerFilter.value.trim();
                    currentFilters.is_query = typeFilter.value;
                    currentFilters.query_type = queryTypeFilter.value;
                    currentPage = 1;
                    updateQueries();
                }

                // 防抖函数
                function debounceSearch() {
                    if (searchTimer) {
                        clearTimeout(searchTimer);
                    }
                    searchTimer = setTimeout(performSearch, 300);
                }

                // 输入框实时搜索（带防抖）
                domainFilter.addEventListener('input', debounceSearch);
                deviceFilter.addEventListener('input', debounceSearch);
                dnsServerFilter.addEventListener('input', debounceSearch);
                
                // 下拉框立即搜索（不需要防抖）
                typeFilter.addEventListener('change', performSearch);
                queryTypeFilter.addEventListener('change', performSearch);

                // 刷新按钮
                if (refreshBtn) {
                    var originalBtnText = refreshBtn.textContent || refreshBtn.innerText || _('Refresh');
                    
                    refreshBtn.addEventListener('click', function () {
                        // 保存原始按钮文本（如果还没有保存）
                        if (!originalBtnText) {
                            originalBtnText = refreshBtn.textContent || refreshBtn.innerText || _('Refresh');
                        }
                        
                        // 设置按钮为加载状态
                        refreshBtn.classList.add('refresh-btn-loading');
                        refreshBtn.textContent = _('Loading...');
                        refreshBtn.disabled = true;
                        
                        // 同时刷新统计数据和查询记录
                        updateStats();
                        
                        var container = document.getElementById('dns-queries-container');
                        if (!container) {
                            updateQueries().finally(function() {
                                // 恢复按钮状态
                                refreshBtn.classList.remove('refresh-btn-loading');
                                refreshBtn.textContent = originalBtnText;
                                refreshBtn.disabled = false;
                            });
                            return;
                        }
                        
                        // 确保容器是相对定位
                        container.style.position = 'relative';
                        
                        // 移除旧的蒙版
                        var oldOverlay = container.querySelector('.refresh-overlay');
                        if (oldOverlay) {
                            oldOverlay.remove();
                        }
                        
                        // 创建新的刷新蒙版
                        var overlay = E('div', { 
                            'class': 'refresh-overlay'
                        });
                        container.appendChild(overlay);
                        
                        // 应用主题背景色到蒙版
                        setTimeout(function() {
                            applyThemeColors();
                        }, 50);
                        
                        // 刷新数据（蒙版会在 updateQueries 中自动移除）
                        updateQueries().finally(function() {
                            // 恢复按钮状态
                            refreshBtn.classList.remove('refresh-btn-loading');
                            refreshBtn.textContent = originalBtnText;
                            refreshBtn.disabled = false;
                        });
                    });
                }
            }
        }, 10);

        // 自动适应主题背景色和文字颜色的函数
        function applyThemeColors() {
            try {
                var mainElement = document.querySelector('.main') || document.body;
                var computedStyle = window.getComputedStyle(mainElement);
                var bgColor = computedStyle.backgroundColor;
                
                // 如果父元素有背景色，应用到容器和卡片
                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    var containerEl = document.querySelector('.bandix-dns-container');
                    if (containerEl) {
                        containerEl.style.backgroundColor = bgColor;
                    }
                    
                    
                    // 应用到表格表头
                    var tableHeaders = document.querySelectorAll('.bandix-table th');
                    tableHeaders.forEach(function(th) {
                        th.style.backgroundColor = bgColor;
                    });
                    
                    // 应用到 Response Result 字段的 badge
                    var badges = document.querySelectorAll('.response-ip-badge');
                    badges.forEach(function(badge) {
                        badge.style.backgroundColor = bgColor;
                    });
                    
                    // 应用到搜索框（不包括 cbi-input-select，因为它使用官方样式）
                    var inputs = document.querySelectorAll('.filter-input');
                    inputs.forEach(function(input) {
                        input.style.backgroundColor = bgColor;
                    });
                    
                    // 应用到统计卡片
                    var statsCards = document.querySelectorAll('.stats-grid .cbi-section');
                    statsCards.forEach(function(card) {
                        card.style.backgroundColor = bgColor;
                    });
                    
                    // 应用到加载状态和错误状态
                    var loadingStates = document.querySelectorAll('.loading-state');
                    loadingStates.forEach(function(el) {
                        el.style.backgroundColor = bgColor;
                    });
                    
                    var errorStates = document.querySelectorAll('.error-state');
                    errorStates.forEach(function(el) {
                        el.style.backgroundColor = bgColor;
                    });
                    
                    // 应用到加载遮罩层（使用半透明背景）
                    var loadingOverlays = document.querySelectorAll('.loading-overlay');
                    loadingOverlays.forEach(function(el) {
                        // 将背景色转换为 rgba，并添加透明度
                        var rgb = bgColor.match(/\d+/g);
                        if (rgb && rgb.length >= 3) {
                            el.style.backgroundColor = 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', 0.8)';
                        }
                    });
                    
                    // 应用到刷新蒙版（使用半透明背景和模糊效果）
                    var refreshOverlays = document.querySelectorAll('.refresh-overlay');
                    refreshOverlays.forEach(function(el) {
                        // 将背景色转换为 rgba，并添加透明度
                        var rgb = bgColor.match(/\d+/g);
                        if (rgb && rgb.length >= 3) {
                            el.style.backgroundColor = 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', 0.6)';
                        }
                    });
                }
                
                // 检测文字颜色并应用
                var textColor = computedStyle.color;
                if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
                    var containerEl = document.querySelector('.bandix-dns-container');
                    if (containerEl) {
                        containerEl.style.color = textColor;
                    }
                    
                    // 应用到搜索框的文字颜色（不包括 cbi-input-select）
                    var inputs = document.querySelectorAll('.filter-input');
                    inputs.forEach(function(input) {
                        input.style.color = textColor;
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
                var container = document.querySelector('.bandix-dns-container');
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

