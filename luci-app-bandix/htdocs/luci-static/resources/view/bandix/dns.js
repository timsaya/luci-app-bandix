'use strict';
'require view';
'require ui';
'require uci';
'require rpc';
'require poll';


// 暗色模式检测已改为使用 CSS 媒体查询 @media (prefers-color-scheme: dark)

function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    var date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    });
}

function formatResponseCode(code) {
    if (code === 'Success' || code === 'NOERROR') return _('Success');
    if (code === 'Domain not found' || code === 'NXDomain' || code === 'NXDOMAIN') return _('Domain not found');
    if (code === 'Server error' || code === 'ServFail' || code === 'SERVFAIL') return _('Server error');
    if (code === 'Format error' || code === 'FormErr' || code === 'FORMERR') return _('Format error');
    if (code === 'Refused' || code === 'Refused' || code === 'REFUSED') return _('Refused');
    return code || _('Other');
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
    params: ['domain', 'device', 'is_query', 'dns_server', 'page', 'page_size'],
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
                min-width: 150px;
                opacity: 1;
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
        `);
        document.head.appendChild(style);

        var container = E('div', { 'class': 'bandix-dns-container' });

        var header = E('div', { 'class': 'bandix-header' }, [
            E('h1', { 'class': 'bandix-title' }, _('Bandix DNS Monitor'))
        ]);
        container.appendChild(header);

        if (!dnsEnabled) {
            var alertDiv = E('div', { 'class': 'bandix-alert' }, [
                E('div', {}, [
                    E('strong', {}, _('DNS Monitoring Disabled')),
                    E('p', { 'style': 'margin: 4px 0 0 0;' },
                        _('Please enable DNS monitoring in settings'))
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
        var infoAlert = E('div', { 'class': 'bandix-alert' }, [
            E('span', {}, _('Does not include DoH and DoT'))
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
                    E('select', { 'class': 'cbi-select', 'id': 'type-filter' }, [
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
                        'placeholder': _('Search Domain')
                    })
                ]),
                E('div', { 'class': 'filter-group' }, [
                    E('label', { 'class': 'filter-label' }, _('Device Filter') + ':'),
                    E('input', {
                        'type': 'text',
                        'class': 'filter-input',
                        'id': 'device-filter',
                        'placeholder': _('Search Device')
                    })
                ]),
                E('div', { 'class': 'filter-group' }, [
                    E('label', { 'class': 'filter-label' }, _('DNS Server Filter') + ':'),
                    E('input', {
                        'type': 'text',
                        'class': 'filter-input',
                        'id': 'dns-server-filter',
                        'placeholder': _('Search DNS Server')
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
            dns_server: ''
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

                // 移除旧的表格和分页
                var oldTable = container.querySelector('.bandix-table');
                var oldPagination = container.querySelector('.pagination');
                var oldLoadingState = container.querySelector('.loading-state');
                if (oldTable) oldTable.remove();
                if (oldPagination) oldPagination.remove();
                if (oldLoadingState) oldLoadingState.remove();
                
                // 确保容器是相对定位（用于遮罩层）
                container.style.position = 'relative';

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
                            E('td', {}, formatTimestamp(query.timestamp)),
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

                var pagination = E('div', { 'class': 'pagination' }, [
                    E('div', { 'class': 'pagination-info' },
                        _('Page') + ' ' + currentPage + ' ' + _('of') + ' ' + totalPages + '，' + _('Total') + ' ' + total + ' ' + _('records')
                    ),
                    E('div', { 'class': 'pagination-controls' }, [
                        E('select', {
                            'class': 'cbi-select',
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
                
                // 总查询数卡片（合并成功率）
                var totalQueriesCard = E('div', { 'class': 'cbi-section' }, [
                    E('div', { 'class': 'stats-card-title' }, _('Total Queries')),
                    E('div', { 'class': 'stats-card-main-value' }, (stats.total_queries || 0).toLocaleString()),
                    E('div', { 'class': 'stats-card-details' }, [
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, _('Success Rate') + ':'),
                            E('span', { 'class': 'stats-detail-value' }, formatPercent(stats.success_rate || 0))
                        ]),
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, _('Success') + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.success_count || 0).toLocaleString())
                        ]),
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, _('Failure') + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.failure_count || 0).toLocaleString())
                        ])
                    ])
                ]);
                
                statsGrid.appendChild(totalQueriesCard);
                
                // 响应时间卡片
                statsGrid.appendChild(E('div', { 'class': 'cbi-section' }, [
                    E('div', { 'class': 'stats-card-title' }, _('Response Time')),
                    E('div', { 'class': 'stats-card-main-value' }, (stats.avg_response_time_ms || 0).toFixed(2) + ' ' + _('ms')),
                    E('div', { 'class': 'stats-card-details' }, [
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, _('Min Response Time') + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.min_response_time_ms || 0) + ' ' + _('ms'))
                        ]),
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, _('Max Response Time') + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.max_response_time_ms || 0) + ' ' + _('ms'))
                        ]),
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, _('Latest Response Time') + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.latest_response_time_ms || 0) + ' ' + _('ms'))
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
            var refreshBtn = document.getElementById('refresh-queries-btn');

            if (domainFilter && deviceFilter && dnsServerFilter && typeFilter) {
                var searchTimer = null;
                
                function performSearch() {
                    currentFilters.domain = domainFilter.value.trim();
                    currentFilters.device = deviceFilter.value.trim();
                    currentFilters.dns_server = dnsServerFilter.value.trim();
                    currentFilters.is_query = typeFilter.value;
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

                // 刷新按钮
                if (refreshBtn) {
                    refreshBtn.addEventListener('click', function () {
                        // 同时刷新统计数据和查询记录
                        updateStats();
                        
                        var container = document.getElementById('dns-queries-container');
                        if (!container) {
                            updateQueries();
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
                        updateQueries();
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
                    
                    // 应用到搜索框（不包括 cbi-select，因为它使用官方样式）
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
                    
                    // 应用到搜索框的文字颜色（不包括 cbi-select）
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

