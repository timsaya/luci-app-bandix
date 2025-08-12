'use strict';
'require view';
'require ui';
'require uci';
'require rpc';

// 轻量趋势图（SVG）+ 现代筛选控件

const i18n = {
    'zh-cn': {
        title: '历史网络流量趋势',
        allDevices: '汇总所有设备',
        device: '指定设备',
        range: '时间范围',
        granularity: '聚合粒度',
        metrics: '指标',
        scope: '范畴',
        scope_total: '合计',
        scope_local: '局域网',
        scope_wide: '跨网络',
        upload: '上行',
        download: '下行',
        total: '合计',
        avgRate: '平均速率',
        peakRate: '峰值速率',
        refresh: '刷新',
        exportCSV: '导出 CSV',
        loading: '正在加载数据...',
        empty: '暂无数据',
        error: '无法获取数据',
        presets_1h: '最近1小时',
        presets_6h: '最近6小时',
        presets_24h: '最近24小时',
        presets_7d: '最近7天',
        presets_30d: '最近30天',
        presets_custom: '自定义',
        start: '开始时间',
        end: '结束时间',
        auto: '自动',
        min1: '1分钟',
        min5: '5分钟',
        min15: '15分钟',
        hour1: '1小时',
        day1: '1天',
        chart: '图表',
        table: '表格',
        summary: '汇总',
        upBytes: '上行总量',
        downBytes: '下行总量',
        upAvg: '上行平均',
        downAvg: '下行平均',
        timestamp: '时间',
        upRate: '上行速率',
        downRate: '下行速率'
    }
};

function t(key, lang) {
    const dict = i18n[lang] || i18n['zh-cn'];
    return dict[key] || key;
}

function isDark() {
    const theme = uci.get('bandix', 'general', 'theme');
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    const mediaUrlBase = uci.get('luci', 'main', 'mediaurlbase');
    if (mediaUrlBase && mediaUrlBase.toLowerCase().includes('dark')) return true;
    if (mediaUrlBase && mediaUrlBase.toLowerCase().includes('argon')) {
        const argonMode = uci.get('argon', '@global[0]', 'mode');
        if (argonMode && argonMode.toLowerCase().includes('dark')) return true;
    }
    return false;
}

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

function formatRateBps(bytesPerSec, unit) {
    if (!bytesPerSec) return unit === 'bits' ? '0 bps' : '0 B/s';
    if (unit === 'bits') {
        const v = bytesPerSec * 8;
        const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
        const i = Math.floor(Math.log(v) / Math.log(1000));
        return (v / Math.pow(1000, i)).toFixed(2) + ' ' + units[i];
    }
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(1024));
    return (bytesPerSec / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

// 计算摘要
function summarize(samples) {
    let upBytes = 0, downBytes = 0, upAvg = 0, downAvg = 0, n = 0;
    samples.forEach(s => {
        upBytes += s.upload_bytes || 0;
        downBytes += s.download_bytes || 0;
        if (s.upload_rate != null) upAvg += s.upload_rate;
        if (s.download_rate != null) downAvg += s.download_rate;
        n++;
    });
    return {
        upBytes,
        downBytes,
        upAvg: n ? upAvg / n : 0,
        downAvg: n ? downAvg / n : 0
    };
}

// CSV 导出
function exportToCSV(rows) {
    const header = ['timestamp', 'upload_rate', 'download_rate', 'upload_bytes', 'download_bytes'];
    const csv = [header.join(',')].concat(rows.map(r => [
        new Date(r.timestamp).toISOString(),
        r.upload_rate || 0,
        r.download_rate || 0,
        r.upload_bytes || 0,
        r.download_bytes || 0
    ].join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'metrics.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 简单 SVG 折线图渲染
function renderLineChart(container, series, options) {
    const dark = options.dark;
    const width = container.clientWidth || 900;
    const height = 260;
    const padding = { left: 48, right: 16, top: 12, bottom: 24 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    container.innerHTML = '';
    const svg = E('svg', { width, height, viewBox: `0 0 ${width} ${height}` });
    const bg = E('rect', { x: 0, y: 0, width, height, fill: dark ? '#252526' : '#ffffff' });
    svg.appendChild(bg);

    if (!series || !series.length) {
        container.appendChild(svg);
        return;
    }

    const xs = series.map(s => s.timestamp);
    const ysUp = series.map(s => s.upload_rate || 0);
    const ysDown = series.map(s => s.download_rate || 0);
    const xMin = Math.min.apply(null, xs);
    const xMax = Math.max.apply(null, xs);
    const yMax = Math.max(1, Math.max.apply(null, ysUp.concat(ysDown)));

    const xScale = x => padding.left + (innerW * (x - xMin)) / Math.max(1, (xMax - xMin));
    const yScale = y => padding.top + innerH - (innerH * y) / yMax;

    // 网格
    const gridColor = dark ? '#2f2f2f' : '#e5e7eb';
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (innerH * i) / 4;
        svg.appendChild(E('line', { x1: padding.left, y1: y, x2: padding.left + innerW, y2: y, stroke: gridColor, 'stroke-width': 1 }));
    }

    // 轴
    const axisColor = dark ? '#a1a1aa' : '#6b7280';
    svg.appendChild(E('line', { x1: padding.left, y1: padding.top, x2: padding.left, y2: padding.top + innerH, stroke: axisColor, 'stroke-width': 1 }));
    svg.appendChild(E('line', { x1: padding.left, y1: padding.top + innerH, x2: padding.left + innerW, y2: padding.top + innerH, stroke: axisColor, 'stroke-width': 1 }));

    // 路径生成
    function linePath(vals) {
        return vals.map((v, i) => `${i ? 'L' : 'M'}${xScale(xs[i])},${yScale(v || 0)}`).join(' ');
    }

    const upPath = E('path', { d: linePath(ysUp), fill: 'none', stroke: '#ef4444', 'stroke-width': 2 });
    const downPath = E('path', { d: linePath(ysDown), fill: 'none', stroke: '#22c55e', 'stroke-width': 2 });
    svg.appendChild(upPath);
    svg.appendChild(downPath);

    // Y 轴刻度
    for (let i = 0; i <= 4; i++) {
        const v = (yMax * (4 - i)) / 4;
        const y = padding.top + (innerH * i) / 4;
        svg.appendChild(E('text', { x: 6, y: y + 4, fill: axisColor, 'font-size': '10' }, formatRateBps(v, options.unit)));
    }

    container.appendChild(svg);
}

// 将规范化后的多范畴数据投影到指定范畴，输出通用结构
function projectByScope(samples, scope) {
    var upKeyR, downKeyR, upKeyB, downKeyB;
    if (scope === 'local') {
        upKeyR = 'local_upload_rate';
        downKeyR = 'local_download_rate';
        upKeyB = 'local_upload_bytes';
        downKeyB = 'local_download_bytes';
    } else if (scope === 'wide') {
        upKeyR = 'wide_upload_rate';
        downKeyR = 'wide_download_rate';
        upKeyB = 'wide_upload_bytes';
        downKeyB = 'wide_download_bytes';
    } else { // total
        upKeyR = 'total_upload_rate';
        downKeyR = 'total_download_rate';
        upKeyB = 'total_upload_bytes';
        downKeyB = 'total_download_bytes';
    }

    return samples.map(function (s) {
        return {
            timestamp: s.timestamp,
            upload_rate: s[upKeyR] || 0,
            download_rate: s[downKeyR] || 0,
            upload_bytes: s[upKeyB] || 0,
            download_bytes: s[downKeyB] || 0
        };
    });
}

// 尝试适配多种后端格式
function normalizeMetrics(raw) {
    if (!raw) return [];
    // 你的标准格式: { metrics: [ { ts_ms, total_rx_rate, total_tx_rate, local_rx_rate, local_tx_rate, wide_rx_rate, wide_tx_rate, total_rx_bytes, total_tx_bytes, local_rx_bytes, local_tx_bytes, wide_rx_bytes, wide_tx_bytes } ] }
    if (Array.isArray(raw.metrics)) {
        return raw.metrics.map(s => ({
            timestamp: s.ts_ms || s.ts || s.timestamp || Date.now(),
            // total
            total_upload_rate: s.total_tx_rate || 0,
            total_download_rate: s.total_rx_rate || 0,
            total_upload_bytes: s.total_tx_bytes || 0,
            total_download_bytes: s.total_rx_bytes || 0,
            // local
            local_upload_rate: s.local_tx_rate || 0,
            local_download_rate: s.local_rx_rate || 0,
            local_upload_bytes: s.local_tx_bytes || 0,
            local_download_bytes: s.local_rx_bytes || 0,
            // wide
            wide_upload_rate: s.wide_tx_rate || 0,
            wide_download_rate: s.wide_rx_rate || 0,
            wide_upload_bytes: s.wide_tx_bytes || 0,
            wide_download_bytes: s.wide_rx_bytes || 0
        }));
    }
    // 常见形态1: { samples: [{ ts, up_rate, down_rate, up_bytes, down_bytes }] }
    if (Array.isArray(raw.samples)) {
        return raw.samples.map(s => ({
            timestamp: s.ts || s.timestamp || s.t || Date.now(),
            total_upload_rate: s.upload_rate || s.up_rate || s.tx_rate || 0,
            total_download_rate: s.download_rate || s.down_rate || s.rx_rate || 0,
            total_upload_bytes: s.upload_bytes || s.up_bytes || s.tx_bytes || 0,
            total_download_bytes: s.download_bytes || s.down_bytes || s.rx_bytes || 0
        }));
    }

    // 常见形态2: 直接数组
    if (Array.isArray(raw)) {
        return raw.map(s => ({
            timestamp: s.ts || s.timestamp || s.t || Date.now(),
            total_upload_rate: s.upload_rate || s.up_rate || s.tx_rate || 0,
            total_download_rate: s.download_rate || s.down_rate || s.rx_rate || 0,
            total_upload_bytes: s.upload_bytes || s.up_bytes || s.tx_bytes || 0,
            total_download_bytes: s.download_bytes || s.down_bytes || s.rx_bytes || 0
        }));
    }

    // 常见形态3: { series: { up: [...], down: [...] }, timestamps: [...] }
    if (raw.series && Array.isArray(raw.timestamps)) {
        const ts = raw.timestamps;
        const up = raw.series.up || raw.series.tx || [];
        const down = raw.series.down || raw.series.rx || [];
        return ts.map((t, i) => ({
            timestamp: t,
            total_upload_rate: up[i] || 0,
            total_download_rate: down[i] || 0,
            total_upload_bytes: 0,
            total_download_bytes: 0
        }));
    }

    return [];
}

var callGetMetrics = rpc.declare({
    object: 'luci.bandix',
    method: 'getMetrics',
    params: ['mac'],
    expect: {}
});

var callGetStatus = rpc.declare({
    object: 'luci.bandix',
    method: 'getStatus',
    expect: {}
});

return view.extend({
    load: function () {
        return Promise.all([
            uci.load('bandix'),
            uci.load('luci'),
            uci.load('argon').catch(function () { return null; })
        ]);
    },

    render: function () {
        var language = uci.get('bandix', 'general', 'language');
        if (!language || language === 'auto') language = document.documentElement.lang || 'zh-cn';
        var dark = isDark();
        var speedUnit = uci.get('bandix', 'general', 'speed_unit') || 'bytes';

        var style = E('style', {}, `
            .metrics-wrap { padding: 24px; background: ${dark ? '#1E1E1E' : '#f8fafc'}; min-height: 100vh; color: ${dark ? '#e2e8f0' : '#1f2937'}; }
            .metrics-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
            .metrics-title { font-size:1.5rem; font-weight:700; color:${dark ? '#f1f5f9' : '#111827'}; margin:0; }
            .metrics-card { background:${dark ? '#252526' : '#fff'}; border-radius:12px; border:1px solid ${dark ? '#252526' : '#E5E7EB'}; box-shadow: 0 1px 3px rgba(0,0,0,${dark?0.3:0.08}); margin-bottom:16px; overflow:hidden; }
            .metrics-card-head { padding:16px 20px; background:${dark?'#333333':'#FAFAFA'}; border-bottom:1px solid ${dark ? '#252526':'#E5E7EB'}; }
            .metrics-card-body { padding:16px 20px; }
            .filters { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; }
            .select, .input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid ${dark?'#252526':'#D1D5DB'}; background:${dark?'#333333':'#fff'}; color:${dark?'#e2e8f0':'#111827'}; }
            .btn { padding:10px 16px; border-radius:8px; border:1px solid ${dark?'#252526':'#D1D5DB'}; background:${dark?'#333333':'#F3F4F6'}; color:${dark?'#e2e8f0':'#111827'}; cursor:pointer; }
            .btn-primary { background:#3b82f6; color:#fff; border:none; }
            .toolbar { display:flex; gap:8px; align-items:center; justify-content:flex-end; margin-top:12px; }
            .summary-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; }
            .summary-item { background:${dark?'#252526':'#fff'}; border:1px solid ${dark?'#252526':'#E5E7EB'}; border-radius:8px; padding:12px; }
            .summary-k { font-size:.85rem; opacity:.85; margin-bottom:4px; }
            .summary-v { font-size:1.15rem; font-weight:700; }
            .chart-tabs { display:flex; gap:8px; margin-bottom:8px; }
            .tab { padding:6px 10px; border-radius:6px; background:${dark?'#333333':'#F3F4F6'}; cursor:pointer; }
            .tab.active { background:#3b82f6; color:#fff; }
            .chart-host { width:100%; height:280px; }
            .table { width:100%; border-collapse: collapse; }
            .table th, .table td { padding:10px 8px; border-bottom:1px solid ${dark?'#252526':'#E5E7EB'}; }
            .muted { color:${dark?'#9CA3AF':'#6B7280'}; }
        `);
        document.head.appendChild(style);

        var devices = [];
        function refreshDevices() {
            return callGetStatus().then(function (res) {
                devices = (res && res.devices) ? res.devices : [];
                var select = document.getElementById('device-select');
                if (!select) return;
                select.innerHTML = '';
                select.appendChild(E('option', { value: '' }, t('allDevices', language)));
                devices.forEach(function (d) {
                    var label = (d.hostname || d.ip || d.mac || '-') + (d.mac ? ' (' + d.mac + ')' : '');
                    select.appendChild(E('option', { value: d.mac }, label));
                });
            });
        }

        var wrap = E('div', { 'class': 'metrics-wrap' }, [
            E('div', { 'class': 'metrics-header' }, [
                E('h1', { 'class': 'metrics-title' }, t('title', language))
            ]),

            E('div', { 'class': 'metrics-card' }, [
                E('div', { 'class': 'metrics-card-head' }, t('summary', language)),
                E('div', { 'class': 'metrics-card-body' }, [
                    E('div', { 'class': 'summary-grid', id: 'summary-grid' }, [
                        E('div', { 'class': 'summary-item' }, [
                            E('div', { 'class': 'summary-k' }, t('upBytes', language)),
                            E('div', { 'class': 'summary-v', id: 'sum-up-bytes' }, '-')
                        ]),
                        E('div', { 'class': 'summary-item' }, [
                            E('div', { 'class': 'summary-k' }, t('downBytes', language)),
                            E('div', { 'class': 'summary-v', id: 'sum-down-bytes' }, '-')
                        ]),
                        E('div', { 'class': 'summary-item' }, [
                            E('div', { 'class': 'summary-k' }, t('upAvg', language)),
                            E('div', { 'class': 'summary-v', id: 'sum-up-avg' }, '-')
                        ]),
                        E('div', { 'class': 'summary-item' }, [
                            E('div', { 'class': 'summary-k' }, t('downAvg', language)),
                            E('div', { 'class': 'summary-v', id: 'sum-down-avg' }, '-')
                        ])
                    ])
                ])
            ]),

            E('div', { 'class': 'metrics-card' }, [
                E('div', { 'class': 'metrics-card-head' }, t('metrics', language)),
                E('div', { 'class': 'metrics-card-body' }, [
                    E('div', { 'class': 'filters' }, [
                        E('select', { 'class': 'select', id: 'device-select' }, [
                            E('option', { value: '' }, t('allDevices', language))
                        ]),
                        E('select', { 'class': 'select', id: 'range-select' }, [
                            E('option', { value: '1h' }, t('presets_1h', language)),
                            E('option', { value: '6h' }, t('presets_6h', language)),
                            E('option', { value: '24h' }, t('presets_24h', language)),
                            E('option', { value: '7d' }, t('presets_7d', language)),
                            E('option', { value: '30d' }, t('presets_30d', language)),
                            E('option', { value: 'custom' }, t('presets_custom', language))
                        ]),
                        E('input', { 'class': 'input', id: 'start-input', type: 'datetime-local', style: 'display:none' }),
                        E('input', { 'class': 'input', id: 'end-input', type: 'datetime-local', style: 'display:none' }),
                        E('select', { 'class': 'select', id: 'granularity-select' }, [
                            E('option', { value: 'auto' }, t('auto', language)),
                            E('option', { value: '1m' }, t('min1', language)),
                            E('option', { value: '5m' }, t('min5', language)),
                            E('option', { value: '15m' }, t('min15', language)),
                            E('option', { value: '1h' }, t('hour1', language)),
                            E('option', { value: '1d' }, t('day1', language))
                        ]),
                        E('select', { 'class': 'select', id: 'scope-select' }, [
                            E('option', { value: 'total' }, t('scope_total', language)),
                            E('option', { value: 'local' }, t('scope_local', language)),
                            E('option', { value: 'wide' }, t('scope_wide', language))
                        ])
                    ]),
                    E('div', { 'class': 'toolbar' }, [
                        E('button', { 'class': 'btn', id: 'export-btn' }, t('exportCSV', language)),
                        E('button', { 'class': 'btn btn-primary', id: 'refresh-btn' }, t('refresh', language))
                    ]),

                    E('div', { 'class': 'chart-tabs' }, [
                        E('div', { 'class': 'tab active', id: 'tab-chart' }, t('chart', language)),
                        E('div', { 'class': 'tab', id: 'tab-table' }, t('table', language))
                    ]),

                    E('div', { id: 'chart-view' }, [
                        E('div', { 'class': 'chart-host', id: 'chart-host' }, [
                            E('div', { 'class': 'muted', style: 'padding:12px' }, t('loading', language))
                        ])
                    ]),
                    E('div', { id: 'table-view', style: 'display:none' }, [
                        E('table', { 'class': 'table', id: 'metrics-table' }, [
                            E('thead', {}, [
                                E('tr', {}, [
                                    E('th', {}, t('timestamp', language)),
                                    E('th', {}, t('upRate', language)),
                                    E('th', {}, t('downRate', language))
                                ])
                            ]),
                            E('tbody', {})
                        ])
                    ])
                ])
            ])
        ]);

        function setRangeUI() {
            var sel = document.getElementById('range-select');
            var start = document.getElementById('start-input');
            var end = document.getElementById('end-input');
            if (sel.value === 'custom') {
                start.style.display = '';
                end.style.display = '';
            } else {
                start.style.display = 'none';
                end.style.display = 'none';
            }
        }

        function parseRange() {
            var sel = document.getElementById('range-select').value;
            if (sel === 'custom') {
                var s = document.getElementById('start-input').value;
                var e = document.getElementById('end-input').value;
                var startTs = s ? new Date(s).getTime() : null;
                var endTs = e ? new Date(e).getTime() : null;
                return { startTs, endTs };
            }
            var now = Date.now();
            var map = { '1h': 3600e3, '6h': 21600e3, '24h': 86400e3, '7d': 7*86400e3, '30d': 30*86400e3 };
            var dur = map[sel] || 3600e3;
            return { startTs: now - dur, endTs: now };
        }

        var currentSamples = [];

function renderTable(samples) {
            var tbody = wrap.querySelector('#metrics-table tbody');
            tbody.innerHTML = '';
            if (!samples.length) {
                tbody.appendChild(E('tr', {}, [E('td', { colspan: 3, 'class': 'muted' }, t('empty', language))]));
                return;
            }
            samples.forEach(s => {
                tbody.appendChild(E('tr', {}, [
                    E('td', {}, new Date(s.timestamp).toLocaleString()),
                    E('td', {}, formatRateBps(s.upload_rate, speedUnit)),
                    E('td', {}, formatRateBps(s.download_rate, speedUnit))
                ]));
            });
        }

        function renderSummary(samples) {
            var sum = summarize(samples);
            wrap.querySelector('#sum-up-bytes').textContent = formatBytes(sum.upBytes);
            wrap.querySelector('#sum-down-bytes').textContent = formatBytes(sum.downBytes);
            wrap.querySelector('#sum-up-avg').textContent = formatRateBps(sum.upAvg, speedUnit);
            wrap.querySelector('#sum-down-avg').textContent = formatRateBps(sum.downAvg, speedUnit);
        }

        function drawChart(samples) {
            var chartHost = document.getElementById('chart-host');
            renderLineChart(chartHost, samples, { dark, unit: speedUnit });
        }

        function applyFilters(rawSamples) {
            // 时间过滤 + 简单粒度下采样
            var range = parseRange();
            var filtered = rawSamples.filter(s => {
                if (range.startTs && s.timestamp < range.startTs) return false;
                if (range.endTs && s.timestamp > range.endTs) return false;
                return true;
            });

            var g = document.getElementById('granularity-select').value;
            if (g === 'auto') return filtered;

            var bucketMs = ({ '1m': 60e3, '5m': 5*60e3, '15m': 15*60e3, '1h': 3600e3, '1d': 86400e3 })[g] || 60e3;
            var map = {};
            filtered.forEach(s => {
                var b = Math.floor(s.timestamp / bucketMs) * bucketMs;
                if (!map[b]) map[b] = { timestamp: b, upload_rate: 0, download_rate: 0, upload_bytes: 0, download_bytes: 0, c: 0 };
                map[b].upload_rate += s.upload_rate || 0;
                map[b].download_rate += s.download_rate || 0;
                map[b].upload_bytes += s.upload_bytes || 0;
                map[b].download_bytes += s.download_bytes || 0;
                map[b].c += 1;
            });
            var buckets = Object.values(map).sort((a,b) => a.timestamp - b.timestamp);
            buckets.forEach(b => { if (b.c) { b.upload_rate/=b.c; b.download_rate/=b.c; } });
            return buckets;
        }

        function refresh() {
            var mac = document.getElementById('device-select').value || null;
            var scope = document.getElementById('scope-select').value || 'total';
            document.getElementById('chart-host').innerHTML = '<div class="muted" style="padding:12px">' + t('loading', language) + '</div>';
            return callGetMetrics(mac).then(function (data) {
                var normalized = normalizeMetrics(data);
                var scoped = projectByScope(normalized, scope);
                currentSamples = scoped;
                var applied = applyFilters(scoped);
                renderSummary(applied);
                drawChart(applied);
                renderTable(applied);
                if (!applied.length) document.getElementById('chart-host').innerHTML = '<div class="muted" style="padding:12px">' + t('empty', language) + '</div>';
            }).catch(function () {
                document.getElementById('chart-host').innerHTML = '<div class="muted" style="padding:12px">' + t('error', language) + '</div>';
            });
        }

        // 事件绑定
        wrap.addEventListener('change', function (e) {
            if (e.target && e.target.id === 'range-select') {
                setRangeUI();
            }
        });
        wrap.querySelector('#refresh-btn').addEventListener('click', refresh);
        wrap.querySelector('#export-btn').addEventListener('click', function () { exportToCSV(applyFilters(currentSamples)); });
        wrap.querySelector('#tab-chart').addEventListener('click', function () {
            wrap.querySelector('#tab-chart').classList.add('active');
            wrap.querySelector('#tab-table').classList.remove('active');
            wrap.querySelector('#chart-view').style.display = '';
            wrap.querySelector('#table-view').style.display = 'none';
        });
        wrap.querySelector('#tab-table').addEventListener('click', function () {
            wrap.querySelector('#tab-table').classList.add('active');
            wrap.querySelector('#tab-chart').classList.remove('active');
            wrap.querySelector('#chart-view').style.display = 'none';
            wrap.querySelector('#table-view').style.display = '';
        });

        // 初始化
        setRangeUI();
        refreshDevices().then(refresh);

        return wrap;
    }
});


