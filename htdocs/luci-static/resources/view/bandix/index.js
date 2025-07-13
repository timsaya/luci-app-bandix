'use strict';
'require view';
'require ui';
'require uci';
'require rpc';
'require poll';
'use strict';


const translations = {
    'zh-cn': {
        'Bandix 局域网流量监控': 'Bandix 局域网流量监控',
        '正在加载数据...': '正在加载数据...',
        '无法获取数据': '无法获取数据',
        '主机名': '主机名',
        'IP地址': 'IP地址',
        'MAC地址': 'MAC地址',
        '下载速度': '下载速度',
        '上传速度': '上传速度',
        '总下载量': '总下载量',
        '总上传量': '总上传量',
        '下载限速': '下载限速',
        '上传限速': '上传限速',
        '界面语言': '界面语言',
        '选择 Bandix 流量监控的显示语言': '选择 Bandix 流量监控的显示语言',
        '设备信息': '设备信息',
        '局域网流量': '局域网流量',
        '跨网络流量': '跨网络流量',
        '限速设置': '限速设置',
        '操作': '操作',
        '在线设备': '在线设备',
        '仅限跨网络': '仅限跨网络',
        '设置': '设置'
    },
    'en': {
        'Bandix 局域网流量监控': 'Bandix LAN Traffic Monitor',
        '正在加载数据...': 'Loading data...',
        '无法获取数据': 'Unable to fetch data',
        '主机名': 'Hostname',
        'IP地址': 'IP Address',
        'MAC地址': 'MAC Address',
        '下载速度': 'Download Speed',
        '上传速度': 'Upload Speed',
        '总下载量': 'Total Download',
        '总上传量': 'Total Upload',
        '下载限速': 'Download Limit',
        '上传限速': 'Upload Limit',
        '界面语言': 'Interface Language',
        '选择 Bandix 流量监控的显示语言': 'Select the display language for Bandix Traffic Monitor',
        '设备信息': 'Device Info',
        '局域网流量': 'LAN Traffic',
        '跨网络流量': 'WAN Traffic',
        '限速设置': 'Rate Limit',
        '操作': 'Actions',
        '在线设备': 'Online Devices',
        '仅限跨网络': 'WAN Only',
        '设置': 'Settings'
    }
};

function getTranslation(key, language) {
    return translations[language]?.[key] || key;
}

function getSystemLanguage() {
    var systemLang = document.documentElement.lang || 'en';
    if (translations[systemLang]) {
        return systemLang;
    }
    return 'en';
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
}

function formatByterate(bytes_per_sec) {
    if (bytes_per_sec === 0) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    const i = Math.floor(Math.log(bytes_per_sec) / Math.log(1024));
    return parseFloat((bytes_per_sec / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
}

var callStatus = rpc.declare({
    object: 'luci.bandix',
    method: 'status',
    expect: {}
});

return view.extend({
    load: function () {
        return Promise.all([
            uci.load('bandix')
        ]);
    },

    render: function (data) {
        var language = uci.get('bandix', 'general', 'language') || getSystemLanguage();

        // 添加现代化样式
        var style = E('style', {}, `
            .bandix-container {
                padding: 24px;
                background-color: #f8fafc;
                min-height: 100vh;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            
            .bandix-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }
            
            .bandix-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: #1f2937;
                margin: 0;
            }
            
            .bandix-badge {
                background-color: #f3f4f6;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                padding: 4px 12px;
                font-size: 0.875rem;
                color: #374151;
            }
            
            .bandix-alert {
                background-color: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 8px;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .bandix-alert-icon {
                color: #f59e0b;
                font-size: 1rem;
            }
            
            .bandix-card {
                background-color: white;
                border-radius: 12px;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                overflow: hidden;
                margin-bottom: 24px;
                border: 1px solid #3333331c;
            }
            
            .bandix-card-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e5e7eb;
                background-color: #fafafa;
            }
            
            .bandix-card-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: #1f2937;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .bandix-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
            }
            
            .bandix-table th {
                background-color: #f9fafb;
                padding: 16px 20px;
                text-align: left;
                font-weight: 600;
                color: #374151;
                border: none;
                font-size: 0.875rem;
            }
            
            .bandix-table td {
                padding: 16px 20px;
                border: none;
                vertical-align: middle;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            .bandix-table th:nth-child(1),
            .bandix-table td:nth-child(1) {
                width: 20%;
            }
            
            .bandix-table th:nth-child(2),
            .bandix-table td:nth-child(2) {
                width: 20%;
            }
            
            .bandix-table th:nth-child(3),
            .bandix-table td:nth-child(3) {
                width: 20%;
            }
            
            .bandix-table th:nth-child(4),
            .bandix-table td:nth-child(4) {
                width: 20%;
            }
            
            .bandix-table th:nth-child(5),
            .bandix-table td:nth-child(5) {
                width: 20%;
            }
            
            .bandix-table tr:hover {
                background-color: #f9fafb;
            }
            
            .device-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .device-name {
                font-weight: 600;
                color: #1f2937;
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
                color: #6b7280;
                font-size: 0.875rem;
            }
            
            .device-mac {
                color: #9ca3af;
                font-size: 0.75rem;
            }
            
            .traffic-info {
                display: flex;
                flex-direction: column;
                gap: 8px;
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
                color: #ef4444;
            }
            
            .traffic-icon.download {
                color: #22c55e;
            }
            
            .traffic-speed {
                font-weight: 600;
                font-size: 0.875rem;
            }
            
            .traffic-speed.lan {
                color: #3b82f6;
            }
            
            .traffic-speed.wan {
                color: #22c55e;
            }
            
            .traffic-total {
                font-size: 0.75rem;
                color: #6b7280;
                margin-left: 4px;
            }
            
            .limit-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .limit-badge {
                background-color: #f3f4f6;
                color: #6b7280;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.75rem;
                text-align: center;
                margin-top: 4px;
            }
            
            .action-button {
                background-color: #f3f4f6;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                padding: 8px 12px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.875rem;
            }
            
            .action-button:hover {
                background-color: #e5e7eb;
                border-color: #9ca3af;
            }
            
            .loading {
                text-align: center;
                padding: 40px;
                color: #6b7280;
                font-style: italic;
            }
            
            .error {
                text-align: center;
                padding: 40px;
                color: #ef4444;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            
            .stats-card {
                background-color: white;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            }
            
            .stats-title {
                font-size: 0.875rem;
                font-weight: 600;
                color: #374151;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .stats-value {
                font-size: 1.25rem;
                font-weight: 700;
                color: #1f2937;
            }
        `);

        document.head.appendChild(style);

        var view = E('div', { 'class': 'bandix-container' }, [
            // 头部
            E('div', { 'class': 'bandix-header' }, [
                E('h1', { 'class': 'bandix-title' }, getTranslation('Bandix 局域网流量监控', language)),
                E('div', { 'class': 'bandix-badge', 'id': 'device-count' }, getTranslation('在线设备', language) + ': 0 / 0')
            ]),

            // 警告提示
            E('div', { 'class': 'bandix-alert' }, [
                E('span', { 'class': 'bandix-alert-icon' }, '⚠️'),
                E('span', {}, '限速功能仅对跨网络流量生效。')
            ]),

            // 统计卡片
            E('div', { 'class': 'stats-grid', 'id': 'stats-grid' }),

            // 主要内容卡片
            E('div', { 'class': 'bandix-card' }, [
                E('div', { 'id': 'traffic-status' }, [
                    E('div', { 'class': 'loading' }, getTranslation('正在加载数据...', language))
                ])
            ])
        ]);

        // 轮询获取数据
        poll.add(function () {
            return callStatus().then(function (result) {
                var trafficDiv = document.getElementById('traffic-status');
                var deviceCountDiv = document.getElementById('device-count');
                var statsGrid = document.getElementById('stats-grid');
                var language = uci.get('bandix', 'general', 'language') || 'en';

                var stats = result;
                if (!stats || !stats.devices) {
                    trafficDiv.innerHTML = '<div class="error">' + getTranslation('无法获取数据', language) + '</div>';
                    return;
                }

                // 更新设备计数
                var onlineCount = stats.devices.filter(d => d.online !== false).length;
                deviceCountDiv.textContent = getTranslation('在线设备', language) + ': ' + onlineCount + ' / ' + stats.devices.length;

                // 计算统计数据
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

                // 局域网流量卡片
                statsGrid.appendChild(E('div', { 'class': 'stats-card' }, [
                    E('div', { 'class': 'stats-title' }, [
                        E('span', { 'style': 'color: #3b82f6;' }, '📶'),
                        '局域网流量'
                    ]),
                    E('div', { 'style': 'margin-top: 12px; display: flex; flex-direction: column; gap: 8px;' }, [
                        // 上传行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #ef4444; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                            E('span', { 'style': 'color: #3b82f6; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalLanSpeedUp)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-left: 4px;' }, '(' + formatSize(totalLanUp) + ')')
                        ]),
                        // 下载行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #22c55e; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                            E('span', { 'style': 'color: #3b82f6; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalLanSpeedDown)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-left: 4px;' }, '(' + formatSize(totalLanDown) + ')')
                        ])
                    ])
                ]));

                // 跨网络流量卡片
                statsGrid.appendChild(E('div', { 'class': 'stats-card' }, [
                    E('div', { 'class': 'stats-title' }, [
                        E('span', { 'style': 'color: #22c55e;' }, '🌐'),
                        '跨网络流量'
                    ]),
                    E('div', { 'style': 'margin-top: 12px; display: flex; flex-direction: column; gap: 8px;' }, [
                        // 上传行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #ef4444; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                            E('span', { 'style': 'color: #22c55e; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalWanSpeedUp)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-left: 4px;' }, '(' + formatSize(totalWanUp) + ')')
                        ]),
                        // 下载行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #22c55e; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                            E('span', { 'style': 'color: #22c55e; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalWanSpeedDown)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-left: 4px;' }, '(' + formatSize(totalWanDown) + ')')
                        ])
                    ])
                ]));

                // 实时总流量卡片
                statsGrid.appendChild(E('div', { 'class': 'stats-card' }, [
                    E('div', { 'class': 'stats-title' }, [
                        E('span', {}, '⚡'),
                        '实时总流量'
                    ]),
                    E('div', { 'style': 'margin-top: 12px; display: flex; flex-direction: column; gap: 8px;' }, [
                        // 上传行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #ef4444; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                            E('span', { 'style': 'color: #1f2937; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalSpeedUp)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-left: 4px;' }, '(' + formatSize(totalUp) + ')')
                        ]),
                        // 下载行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #22c55e; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                            E('span', { 'style': 'color: #1f2937; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalSpeedDown)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-left: 4px;' }, '(' + formatSize(totalDown) + ')')
                        ])
                    ])
                ]));

                // 创建表格
                var table = E('table', { 'class': 'bandix-table' }, [
                    E('thead', {}, [
                        E('tr', {}, [
                            E('th', {}, getTranslation('设备信息', language)),
                            E('th', {}, [
                                E('span', { 'style': 'color: #3b82f6; margin-right: 4px;' }, '📶'),
                                getTranslation('局域网流量', language)
                            ]),
                            E('th', {}, [
                                E('span', { 'style': 'color: #22c55e; margin-right: 4px;' }, '🌐'),
                                getTranslation('跨网络流量', language)
                            ]),
                            E('th', {}, getTranslation('限速设置', language)),
                            E('th', {}, getTranslation('操作', language))
                        ])
                    ]),
                    E('tbody', {})
                ]);

                var tbody = table.querySelector('tbody');

                // 填充数据
                stats.devices.forEach(function (device) {
                    var isOnline = device.online !== false;

                    var row = E('tr', {}, [
                        // 设备信息
                        E('td', {}, [
                            E('div', { 'class': 'device-info' }, [
                                E('div', { 'class': 'device-name' }, [
                                    E('span', {
                                        'class': 'device-status ' + (isOnline ? 'online' : 'offline')
                                    }),
                                    device.hostname || '-'
                                ]),
                                E('div', { 'class': 'device-ip' }, device.ip),
                                E('div', { 'class': 'device-mac' }, device.mac)
                            ])
                        ]),

                        // 局域网流量
                        E('td', {}, [
                            E('div', { 'class': 'traffic-info' }, [
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon upload' }, '↑'),
                                    E('span', { 'class': 'traffic-speed lan' }, formatByterate(device.local_tx_rate || 0)),
                                    E('span', { 'class': 'traffic-total' }, '(' + formatSize(device.local_tx_bytes || 0) + ')')
                                ]),
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon download' }, '↓'),
                                    E('span', { 'class': 'traffic-speed lan' }, formatByterate(device.local_rx_rate || 0)),
                                    E('span', { 'class': 'traffic-total' }, '(' + formatSize(device.local_rx_bytes || 0) + ')')
                                ])
                            ])
                        ]),

                        // 跨网络流量
                        E('td', {}, [
                            E('div', { 'class': 'traffic-info' }, [
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon upload' }, '↑'),
                                    E('span', { 'class': 'traffic-speed wan' }, formatByterate(device.wide_tx_rate || 0)),
                                    E('span', { 'class': 'traffic-total' }, '(' + formatSize(device.wide_tx_bytes || 0) + ')')
                                ]),
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon download' }, '↓'),
                                    E('span', { 'class': 'traffic-speed wan' }, formatByterate(device.wide_rx_rate || 0)),
                                    E('span', { 'class': 'traffic-total' }, '(' + formatSize(device.wide_rx_bytes || 0) + ')')
                                ])
                            ])
                        ]),

                        // 限速设置
                        E('td', {}, [
                            E('div', { 'class': 'limit-info' }, [
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon upload', 'style': 'font-size: 0.75rem;' }, '↑'),
                                    E('span', { 'style': 'font-size: 0.875rem;' }, formatByterate(device.wide_tx_rate_limit || 0))
                                ]),
                                E('div', { 'class': 'traffic-row' }, [
                                    E('span', { 'class': 'traffic-icon download', 'style': 'font-size: 0.75rem;' }, '↓'),
                                    E('span', { 'style': 'font-size: 0.875rem;' }, formatByterate(device.wide_rx_rate_limit || 0))
                                ]),
                            ])
                        ]),

                        // 操作
                        E('td', {}, [
                            E('button', {
                                'class': 'action-button',
                                'title': getTranslation('设置', language)
                            }, '⚙️')
                        ])
                    ]);

                    tbody.appendChild(row);
                });

                // 更新表格内容
                trafficDiv.innerHTML = '';
                trafficDiv.appendChild(table);
            });
        }, 1);

        return view;
    }
});
