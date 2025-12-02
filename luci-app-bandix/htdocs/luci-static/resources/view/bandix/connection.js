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

// 格式化时间戳
function formatTimestamp(timestamp) {
    if (!timestamp) return _('Never Online');

    var now = Math.floor(Date.now() / 1000);
    var diff = now - timestamp;

    if (diff < 60) {
        return _('Just now');
    } else if (diff < 3600) {
        var minutes = Math.floor(diff / 60);
        return minutes + ' ' + _('minutes ago');
    } else if (diff < 86400) {
        var hours = Math.floor(diff / 3600);
        return hours + ' ' + _('hours ago');
    } else if (diff < 2592000) {
        var days = Math.floor(diff / 86400);
        return days + ' ' + _('days ago');
    } else if (diff < 31536000) {
        var months = Math.floor(diff / 2592000);
        return months + ' ' + _('months ago');
    } else {
        var years = Math.floor(diff / 31536000);
        return years + ' ' + _('years ago');
    }
}

// 格式化设备名称
function formatDeviceName(device) {
    if (device.hostname && device.hostname !== '') {
        return device.hostname;
    }
    return device.ip_address || device.mac_address || _('Unknown Device');
}

// RPC调用
var callGetConnection = rpc.declare({
    object: 'luci.bandix',
    method: 'getConnection',
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
                
                @media (prefers-color-scheme: dark) {
                    .device-card {
                        border-color: rgba(255, 255, 255, 0.15);
                    }
                }
                
                .device-card-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
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
                
                @media (prefers-color-scheme: dark) {
                    .device-card-tcp-details {
                        background-color: rgba(255, 255, 255, 0.05);
                    }
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
                
                @media (prefers-color-scheme: dark) {
                    .device-card-total {
                        border-top-color: rgba(255, 255, 255, 0.15);
                    }
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
            
            .bandix-table th:nth-child(1) { width: 30%; }
            .bandix-table th:nth-child(2) { width: 12%; }
            .bandix-table th:nth-child(3) { width: 12%; }
            .bandix-table th:nth-child(4) { width: 31%; }
            .bandix-table th:nth-child(5) { width: 15%; }
            
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
        `);
        document.head.appendChild(style);

        var container = E('div', { 'class': 'bandix-connection-container' });

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
                        'class': 'cbi-button cbi-button-positive'
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
                                E('th', {}, _('Total Connections'))
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

            document.getElementById('total-connections').textContent = stats.total_connections || 0;
            document.getElementById('tcp-connections').textContent = stats.tcp_connections || 0;
            document.getElementById('udp-connections').textContent = stats.udp_connections || 0;
            document.getElementById('established-tcp').textContent = stats.established_tcp || 0;
            document.getElementById('time-wait-tcp').textContent = stats.time_wait_tcp || 0;
            document.getElementById('close-wait-tcp').textContent = stats.close_wait_tcp || 0;
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
                        E('th', {}, _('Total Connections'))
                    ])
                ]),
                E('tbody', {}, devices.map(function (device) {
                    return E('tr', {}, [
                        E('td', {}, [
                            E('div', { 'class': 'device-info' }, [
                                E('div', { 'class': 'device-status online' }),
                                E('div', { 'class': 'device-details' }, [
                                    E('div', { 'class': 'device-name' }, formatDeviceName(device)),
                                    E('div', { 'class': 'device-ip' }, device.ip_address || '-'),
                                    E('div', { 'class': 'device-mac' }, device.mac_address || '-')
                                ])
                            ])
                        ]),
                        E('td', { 'style': 'font-weight: 600;' }, device.tcp_connections || 0),
                        E('td', { 'style': 'font-weight: 600;' }, device.udp_connections || 0),
                        E('td', {}, [
                            E('div', { 'class': 'tcp-status-details' }, [
                                E('div', { 'class': 'tcp-status-item' }, [
                                    E('span', { 'class': 'tcp-status-label established' }, 'EST'),
                                    E('span', { 'class': 'tcp-status-value' }, device.established_tcp || 0)
                                ]),
                                E('div', { 'class': 'tcp-status-item' }, [
                                    E('span', { 'class': 'tcp-status-label time-wait' }, 'WAIT'),
                                    E('span', { 'class': 'tcp-status-value' }, device.time_wait_tcp || 0)
                                ]),
                                E('div', { 'class': 'tcp-status-item' }, [
                                    E('span', { 'class': 'tcp-status-label closed' }, 'CLOSE'),
                                    E('span', { 'class': 'tcp-status-value' }, device.close_wait_tcp || 0)
                                ])
                            ])
                        ]),
                        E('td', {}, E('strong', {}, device.total_connections || 0))
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
                            E('div', { 'class': 'device-ip' }, device.ip_address || '-'),
                            E('div', { 'class': 'device-mac' }, device.mac_address || '-')
                        ])
                    ]),
                    // 统计信息：TCP 和 UDP
                    E('div', { 'class': 'device-card-stats' }, [
                        E('div', { 'class': 'device-card-stat-item' }, [
                            E('div', { 'class': 'device-card-stat-label' }, 'TCP'),
                            E('div', { 'class': 'device-card-stat-value' }, device.tcp_connections || 0)
                        ]),
                        E('div', { 'class': 'device-card-stat-item' }, [
                            E('div', { 'class': 'device-card-stat-label' }, 'UDP'),
                            E('div', { 'class': 'device-card-stat-value' }, device.udp_connections || 0)
                        ])
                    ]),
                    // TCP 状态详情
                    E('div', { 'class': 'device-card-tcp-details' }, [
                        E('div', { 'class': 'device-card-tcp-details-label' }, _('TCP Status Details')),
                        E('div', { 'class': 'device-card-tcp-status-row' }, [
                            E('span', { 'class': 'device-card-tcp-status-label established' }, 'EST'),
                            E('span', { 'class': 'device-card-tcp-status-value' }, device.established_tcp || 0)
                        ]),
                        E('div', { 'class': 'device-card-tcp-status-row' }, [
                            E('span', { 'class': 'device-card-tcp-status-label time-wait' }, 'WAIT'),
                            E('span', { 'class': 'device-card-tcp-status-value' }, device.time_wait_tcp || 0)
                        ]),
                        E('div', { 'class': 'device-card-tcp-status-row' }, [
                            E('span', { 'class': 'device-card-tcp-status-label closed' }, 'CLOSE'),
                            E('span', { 'class': 'device-card-tcp-status-value' }, device.close_wait_tcp || 0)
                        ])
                    ]),
                    // 总连接数
                    E('div', { 'class': 'device-card-total' }, [
                        E('div', { 'style': 'font-size: 0.875rem; opacity: 0.7; font-weight: 500;' }, _('Total Connections')),
                        E('div', { 'style': 'font-size: 1.25rem; font-weight: 700;' }, device.total_connections || 0)
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
                    updateGlobalStats(result.data.global_stats);
                    updateDeviceTable(result.data.devices);
                } else {
                    showError(_('Unable to fetch data'));
                }
            }).catch(function (error) {
                console.error('Failed to load connection data:', error);
                showError(_('Unable to fetch data'));
            });
        }

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
                    tableHeaders.forEach(function(th) {
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
            var observer = new MutationObserver(function(mutations) {
                applyThemeColors();
            });
            
            setTimeout(function() {
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