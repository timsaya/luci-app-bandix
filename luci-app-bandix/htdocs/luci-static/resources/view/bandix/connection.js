'use strict';
'require view';
'require ui';
'require uci';
'require rpc';
'require poll';

const translations = {
    'zh-cn': {
        'Bandix 连接监控': 'Bandix 连接监控',
        '正在加载数据...': '正在加载数据...',
        '无法获取数据': '无法获取数据',
        '连接监控': '连接监控',
        '设备连接统计': '设备连接统计',
        '全局连接统计': '全局连接统计',
        '设备': '设备',
        'IP地址': 'IP地址',
        'MAC地址': 'MAC地址',
        '活跃TCP': '活跃TCP',
        '活跃UDP': '活跃UDP',
        '已关闭TCP': '已关闭TCP',
        '总连接数': '总连接数',
        '最后更新': '最后更新',
        '总连接数统计': '总连接数统计',
        'TCP连接数': 'TCP连接数',
        'UDP连接数': 'UDP连接数',
        '已建立TCP': '已建立TCP',
        'TIME_WAIT TCP': 'TIME_WAIT TCP',
        'CLOSE_WAIT TCP': 'CLOSE_WAIT TCP',
        '设备总数': '设备总数',
        '连接监控未启用': '连接监控未启用',
        '请在设置中启用连接监控功能': '请在设置中启用连接监控功能',
        '前往设置': '前往设置',
        '无数据': '无数据',
        '未知设备': '未知设备',
        '在线设备': '在线设备',
        '从未上线': '从未上线',
        '刚刚': '刚刚',
        '分钟前': '分钟前',
        '小时前': '小时前',
        '天前': '天前',
        '个月前': '个月前',
        '年前': '年前',
        '最后上线': '最后上线',
        '列表只显示局域网设备连接，数据可能和总连接数不一致。': '列表只显示局域网设备连接，数据可能和总连接数不一致。',
        'TCP 状态详情': 'TCP 状态详情'
    },
    'zh-tw': {
        'Bandix 连接监控': 'Bandix 連接監控',
        '正在加载数据...': '正在載入資料...',
        '无法获取数据': '無法獲取資料',
        '连接监控': '連接監控',
        '设备连接统计': '設備連接統計',
        '全局连接统计': '全局連接統計',
        '设备': '設備',
        'IP地址': 'IP地址',
        'MAC地址': 'MAC地址',
        '活跃TCP': '活躍TCP',
        '活跃UDP': '活躍UDP',
        '已关闭TCP': '已關閉TCP',
        '总连接数': '總連接數',
        '最后更新': '最後更新',
        '总连接数统计': '總連接數統計',
        'TCP连接数': 'TCP連接數',
        'UDP连接数': 'UDP連接數',
        '已建立TCP': '已建立TCP',
        'TIME_WAIT TCP': 'TIME_WAIT TCP',
        'CLOSE_WAIT TCP': 'CLOSE_WAIT TCP',
        '设备总数': '設備總數',
        '连接监控未启用': '連接監控未啟用',
        '请在设置中启用连接监控功能': '請在設置中啟用連接監控功能',
        '前往设置': '前往設置',
        '无数据': '無數據',
        '未知设备': '未知設備',
        '在线设备': '在線設備',
        '从未上线': '從未上線',
        '刚刚': '剛剛',
        '分钟前': '分鐘前',
        '小时前': '小時前',
        '天前': '天前',
        '个月前': '個月前',
        '年前': '年前',
        '最后上线': '最後上線',
        '列表只显示局域网设备连接，数据可能和总连接数不一致。': '列表只顯示局域網設備連接，數據可能和總連接數不一致。',
        'TCP 状态详情': 'TCP 狀態詳情'
    },
    'en': {
        'Bandix 连接监控': 'Bandix Connection Monitor',
        '正在加载数据...': 'Loading data...',
        '无法获取数据': 'Unable to fetch data',
        '连接监控': 'Connection Monitor',
        '设备连接统计': 'Device Connection Statistics',
        '全局连接统计': 'Global Connection Statistics',
        '设备': 'Device',
        'IP地址': 'IP Address',
        'MAC地址': 'MAC Address',
        '活跃TCP': 'Active TCP',
        '活跃UDP': 'Active UDP',
        '已关闭TCP': 'Closed TCP',
        '总连接数': 'Total Connections',
        '最后更新': 'Last Updated',
        '总连接数统计': 'Total Connections',
        'TCP连接数': 'TCP Connections',
        'UDP连接数': 'UDP Connections',
        '已建立TCP': 'Established TCP',
        'TIME_WAIT TCP': 'TIME_WAIT TCP',
        'CLOSE_WAIT TCP': 'CLOSE_WAIT TCP',
        '设备总数': 'Total Devices',
        '连接监控未启用': 'Connection Monitor Disabled',
        '请在设置中启用连接监控功能': 'Please enable connection monitoring in settings',
        '前往设置': 'Go to Settings',
        '无数据': 'No Data',
        '未知设备': 'Unknown Device',
        '在线设备': 'Online Devices',
        '从未上线': 'Never Online',
        '刚刚': 'Just now',
        '分钟前': 'minutes ago',
        '小时前': 'hours ago',
        '天前': 'days ago',
        '个月前': 'months ago',
        '年前': 'years ago',
        '最后上线': 'Last seen',
        '列表只显示局域网设备连接，数据可能和总连接数不一致。': 'List only shows LAN device connections, data may differ from total connections.',
        'TCP 状态详情': 'TCP Status Details'
    },
    'fr': {
        'Bandix 连接监控': 'Surveillance de Connexion Bandix',
        '正在加载数据...': 'Chargement des données...',
        '无法获取数据': 'Impossible de récupérer les données',
        '连接监控': 'Surveillance des Connexions',
        '设备连接统计': 'Statistiques de Connexion des Appareils',
        '全局连接统计': 'Statistiques de Connexion Globales',
        '设备': 'Appareil',
        'IP地址': 'Adresse IP',
        'MAC地址': 'Adresse MAC',
        '活跃TCP': 'TCP Actif',
        '活跃UDP': 'UDP Actif',
        '已关闭TCP': 'TCP Fermé',
        '总连接数': 'Total des Connexions',
        '最后更新': 'Dernière Mise à Jour',
        '总连接数统计': 'Total des Connexions',
        'TCP连接数': 'Connexions TCP',
        'UDP连接数': 'Connexions UDP',
        '已建立TCP': 'TCP Établi',
        'TIME_WAIT TCP': 'TCP TIME_WAIT',
        'CLOSE_WAIT TCP': 'TCP CLOSE_WAIT',
        '设备总数': 'Total des Appareils',
        '连接监控未启用': 'Surveillance des Connexions Désactivée',
        '请在设置中启用连接监控功能': 'Veuillez activer la surveillance des connexions dans les paramètres',
        '前往设置': 'Aller aux Paramètres',
        '无数据': 'Aucune Donnée',
        '未知设备': 'Appareil Inconnu',
        '在线设备': 'Appareils En Ligne',
        '从未上线': 'Jamais En Ligne',
        '刚刚': 'À l\'instant',
        '分钟前': 'il y a minutes',
        '小时前': 'il y a heures',
        '天前': 'il y a jours',
        '个月前': 'il y a mois',
        '年前': 'il y a années',
        '最后上线': 'Dernier Vue',
        '列表只显示局域网设备连接，数据可能和总连接数不一致。': 'La liste ne montre que les connexions des appareils LAN, les données peuvent différer du total des connexions.',
        'TCP 状态详情': 'Détails du Statut TCP'
    },
    'ja': {
        'Bandix 连接监控': 'Bandix 接続監視',
        '正在加载数据...': 'データを読み込み中...',
        '无法获取数据': 'データを取得できません',
        '连接监控': '接続監視',
        '设备连接统计': 'デバイス接続統計',
        '全局连接统计': 'グローバル接続統計',
        '设备': 'デバイス',
        'IP地址': 'IPアドレス',
        'MAC地址': 'MACアドレス',
        '活跃TCP': 'アクティブTCP',
        '活跃UDP': 'アクティブUDP',
        '已关闭TCP': 'クローズドTCP',
        '总连接数': '総接続数',
        '最后更新': '最終更新',
        '总连接数统计': '総接続数',
        'TCP连接数': 'TCP接続数',
        'UDP连接数': 'UDP接続数',
        '已建立TCP': 'TCP確立済',
        'TIME_WAIT TCP': 'TCP TIME_WAIT',
        'CLOSE_WAIT TCP': 'TCP CLOSE_WAIT',
        '设备总数': '総デバイス数',
        '连接监控未启用': '接続監視が無効',
        '请在设置中启用连接监控功能': '設定で接続監視機能を有効にしてください',
        '前往设置': '設定に移動',
        '无数据': 'データなし',
        '未知设备': '不明なデバイス',
        '在线设备': 'オンラインデバイス',
        '从未上线': '未接続',
        '刚刚': 'たった今',
        '分钟前': '分前',
        '小时前': '時間前',
        '天前': '日前',
        '个月前': 'ヶ月前',
        '年前': '年前',
        '最后上线': '最後の接続',
        '列表只显示局域网设备连接，数据可能和总连接数不一致。': 'リストはLANデバイスの接続のみを表示し、データは総接続数と異なる場合があります。',
        'TCP 状态详情': 'TCP状態詳細'
    },
    'ru': {
        'Bandix 连接监控': 'Мониторинг Соединений Bandix',
        '正在加载数据...': 'Загрузка данных...',
        '无法获取数据': 'Не удалось получить данные',
        '连接监控': 'Мониторинг Соединений',
        '设备连接统计': 'Статистика Соединений Устройств',
        '全局连接统计': 'Глобальная Статистика Соединений',
        '设备': 'Устройство',
        'IP地址': 'IP-адрес',
        'MAC地址': 'MAC-адрес',
        '活跃TCP': 'Активные TCP',
        '活跃UDP': 'Активные UDP',
        '已关闭TCP': 'Закрытые TCP',
        '总连接数': 'Всего Соединений',
        '最后更新': 'Последнее Обновление',
        '总连接数统计': 'Всего Соединений',
        'TCP连接数': 'TCP Соединения',
        'UDP连接数': 'UDP Соединения',
        '已建立TCP': 'Установленные TCP',
        'TIME_WAIT TCP': 'TCP TIME_WAIT',
        'CLOSE_WAIT TCP': 'TCP CLOSE_WAIT',
        '设备总数': 'Всего Устройств',
        '连接监控未启用': 'Мониторинг Соединений Отключен',
        '请在设置中启用连接监控功能': 'Пожалуйста, включите мониторинг соединений в настройках',
        '前往设置': 'Перейти к Настройкам',
        '无数据': 'Нет Данных',
        '未知设备': 'Неизвестное Устройство',
        '在线设备': 'Устройства Онлайн',
        '从未上线': 'Никогда Не Было Онлайн',
        '刚刚': 'Только что',
        '分钟前': 'минут назад',
        '小时前': 'часов назад',
        '天前': 'дней назад',
        '个月前': 'месяцев назад',
        '年前': 'лет назад',
        '最后上线': 'Последний раз видели',
        '列表只显示局域网设备连接，数据可能和总连接数不一致。': 'Список показывает только соединения LAN-устройств, данные могут отличаться от общего количества соединений.',
        'TCP 状态详情': 'Детали Статуса TCP'
    }
};

function getTranslation(key, language) {
    return translations[language]?.[key] || key;
}

// 获取系统语言
function getSystemLanguage() {
    var luciLang = uci.get('luci', 'main', 'lang');
    if (luciLang && translations[luciLang]) {
        return luciLang;
    }
    var systemLang = document.documentElement.lang || 'en';
    if (translations[systemLang]) {
        return systemLang;
    }
    return 'en';
}

// 检查是否为暗黑模式
function isDarkMode() {
    // 首先检查用户设置的主题
    var userTheme = uci.get('bandix', 'general', 'theme');
    if (userTheme) {
        if (userTheme === 'dark') {
            return true;
        } else if (userTheme === 'light') {
            return false;
        }
        // 如果是 'auto'，继续检查系统主题
    }

    // 获取 LuCI 主题设置
    var mediaUrlBase = uci.get('luci', 'main', 'mediaurlbase');
    if (mediaUrlBase && mediaUrlBase.toLowerCase().includes('dark')) {
        return true;
    }

    // 如果是 argon 主题，检查 argon 配置
    if (mediaUrlBase && mediaUrlBase.toLowerCase().includes('argon')) {
        var argonMode = uci.get('argon', '@global[0]', 'mode');
        if (argonMode) {
            if (argonMode.toLowerCase() === 'dark') {
                return true;
            } else if (argonMode.toLowerCase() === 'light') {
                return false;
            }
            // 如果是 'normal' 或 'auto'，使用浏览器检测系统颜色偏好
            if (argonMode.toLowerCase() === 'normal' || argonMode.toLowerCase() === 'auto') {
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    return true;
                }
                return false;
            }
        }
    }

    // 默认情况下也使用浏览器检测系统颜色偏好
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return true;
    }

    return false;
}

// 格式化时间戳
function formatTimestamp(timestamp) {
    if (!timestamp) return getTranslation('从未上线', getSystemLanguage());

    var now = Math.floor(Date.now() / 1000);
    var diff = now - timestamp;
    var language = getSystemLanguage();

    if (diff < 60) {
        return getTranslation('刚刚', language);
    } else if (diff < 3600) {
        var minutes = Math.floor(diff / 60);
        return minutes + ' ' + getTranslation('分钟前', language);
    } else if (diff < 86400) {
        var hours = Math.floor(diff / 3600);
        return hours + ' ' + getTranslation('小时前', language);
    } else if (diff < 2592000) {
        var days = Math.floor(diff / 86400);
        return days + ' ' + getTranslation('天前', language);
    } else if (diff < 31536000) {
        var months = Math.floor(diff / 2592000);
        return months + ' ' + getTranslation('个月前', language);
    } else {
        var years = Math.floor(diff / 31536000);
        return years + ' ' + getTranslation('年前', language);
    }
}

// 格式化设备名称
function formatDeviceName(device) {
    if (device.hostname && device.hostname !== '') {
        return device.hostname;
    }
    return device.ip_address || device.mac_address || getTranslation('未知设备', getSystemLanguage());
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
        var language = uci.get('bandix', 'general', 'language');
        if (!language || language === 'auto') {
            language = getSystemLanguage();
        }
        var darkMode = isDarkMode();
        var connectionEnabled = uci.get('bandix', 'connections', 'enabled') === '1';

        // 创建样式
        var style = E('style', {}, `
            .bandix-connection-container {
                margin: 0;
                padding: 24px;
                background-color: ${darkMode ? '#1E1E1E' : '#f8fafc'};
                min-height: calc(100vh - 100px);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: ${darkMode ? '#e2e8f0' : '#1f2937'};
                border-radius: 8px;
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
                color: ${darkMode ? '#f1f5f9' : '#1f2937'};
                margin: 0;
            }
            
            .bandix-badge {
                background-color: ${darkMode ? '#333333' : '#f3f4f6'};
                border: 1px solid ${darkMode ? '#252526' : '#d1d5db'};
                border-radius: 6px;
                padding: 4px 12px;
                font-size: 0.875rem;
                color: ${darkMode ? '#e2e8f0' : '#374151'};
            }
            
            .bandix-alert {
                background-color: ${darkMode ? '#451a03' : '#fef3c7'};
                border: 1px solid ${darkMode ? '#92400e' : '#f59e0b'};
                border-radius: 8px;
                padding: 8px;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
                color: ${darkMode ? '#fbbf24' : '#92400e'};
            }
            
            .bandix-alert-icon {
                color: ${darkMode ? '#fbbf24' : '#f59e0b'};
                font-size: 1rem;
            }
            
            .bandix-card {
                background-color: ${darkMode ? '#252526' : 'white'};
                border-radius: 12px;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, ${darkMode ? '0.3' : '0.1'});
                margin-bottom: 24px;
                overflow: hidden;
            }
            
            .bandix-card-header {
                padding: 20px 24px 16px;
                border-bottom: 1px solid ${darkMode ? '#252526' : '#e5e7eb'};
                background-color: ${darkMode ? '#333333' : '#fafafa'};
            }
            
            .bandix-card-title {
                font-size: 1.125rem;
                font-weight: 600;
                color: ${darkMode ? '#f1f5f9' : '#1f2937'};
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .bandix-card-body {
                padding: 24px;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 32px;
            }
            
            .stats-card {
                background-color: ${darkMode ? '#252526' : 'white'};
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, ${darkMode ? '0.3' : '0.1'});
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            
            .stats-card-title {
                font-size: 0.875rem;
                font-weight: 500;
                color: ${darkMode ? '#9ca3af' : '#6b7280'};
                margin: 0 0 12px 0;
            }
            
            .stats-card-main-value {
                font-size: 2.25rem;
                font-weight: 700;
                color: ${darkMode ? '#f1f5f9' : '#1f2937'};
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
                color: ${darkMode ? '#9ca3af' : '#6b7280'};
                font-weight: 500;
            }
            
            .stats-detail-value {
                font-weight: 600;
                color: ${darkMode ? '#e2e8f0' : '#374151'};
            }
            
            .bandix-table {
                width: 100%;
                border-collapse: collapse;
                background-color: transparent;
                table-layout: fixed;
            }
            
            .bandix-table th {
                background-color: ${darkMode ? '#333333' : '#f9fafb'};
                padding: 16px 20px;
                text-align: left;
                font-weight: 600;
                color: ${darkMode ? '#e2e8f0' : '#374151'};
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
                padding: 16px 20px;
                border-bottom: 1px solid ${darkMode ? '#252526' : '#f1f5f9'};
                vertical-align: middle;
                word-break: break-word;
                overflow-wrap: break-word;
                color: ${darkMode ? '#cbd5e1' : 'inherit'};
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
                color: ${darkMode ? '#f1f5f9' : '#1f2937'};
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
            }
            
            .device-ip {
                color: ${darkMode ? '#94a3b8' : '#6b7280'};
                font-size: 0.875rem;
            }
            
            .device-mac {
                color: ${darkMode ? '#64748b' : '#9ca3af'};
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
                color: ${darkMode ? '#e2e8f0' : '#374151'};
            }
            
            .loading-state {
                text-align: center;
                padding: 40px;
                color: ${darkMode ? '#94a3b8' : '#6b7280'};
                font-style: italic;
            }
            
            .error-state {
                text-align: center;
                padding: 40px;
                color: ${darkMode ? '#f87171' : '#ef4444'};
            }
            
            .btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 0.875rem;
                font-weight: 500;
                text-decoration: none;
                border: none;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .btn-primary {
                background-color: #3b82f6;
                color: white;
            }
            
            .btn-primary:hover {
                background-color: #2563eb;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }
        `);
        document.head.appendChild(style);

        var container = E('div', { 'class': 'bandix-connection-container' });

        // 页面标题
        var header = E('div', { 'class': 'bandix-header' }, [
            E('h1', { 'class': 'bandix-title' }, getTranslation('Bandix 连接监控', language))
        ]);
        container.appendChild(header);

        // 检查连接监控是否启用
        if (!connectionEnabled) {
            var alertDiv = E('div', { 'class': 'bandix-alert' }, [
                E('span', { 'class': 'bandix-alert-icon' }, '⚠'),
                E('div', {}, [
                    E('strong', {}, getTranslation('连接监控未启用', language)),
                    E('p', { 'style': 'margin: 4px 0 0 0;' },
                        getTranslation('请在设置中启用连接监控功能', language))
                ])
            ]);
            container.appendChild(alertDiv);

            var settingsCard = E('div', { 'class': 'bandix-card' }, [
                E('div', { 'class': 'bandix-card-body', 'style': 'text-align: center;' }, [
                    E('a', {
                        'href': '/cgi-bin/luci/admin/network/bandix/settings',
                        'class': 'btn btn-primary'
                    }, getTranslation('前往设置', language))
                ])
            ]);
            container.appendChild(settingsCard);
            return container;
        }

        // 添加提示信息
        var infoAlert = E('div', { 'class': 'bandix-alert' }, [
            E('span', { 'class': 'bandix-alert-icon' }, '⚠️'),
            E('span', {}, getTranslation('列表只显示局域网设备连接，数据可能和总连接数不一致。', language))
        ]);
        container.appendChild(infoAlert);

        // 全局统计卡片
        var statsGrid = E('div', { 'class': 'stats-grid' }, [
            E('div', { 'class': 'stats-card' }, [
                E('div', { 'class': 'stats-card-title' }, getTranslation('总连接数统计', language)),
                E('div', { 'class': 'stats-card-main-value', 'id': 'total-connections' }, '-')
            ]),
            E('div', { 'class': 'stats-card' }, [
                E('div', { 'class': 'stats-card-title' }, getTranslation('TCP连接数', language)),
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
            E('div', { 'class': 'stats-card' }, [
                E('div', { 'class': 'stats-card-title' }, getTranslation('UDP连接数', language)),
                E('div', { 'class': 'stats-card-main-value', 'id': 'udp-connections' }, '-')
            ])
        ]);
        container.appendChild(statsGrid);

        // 设备连接统计表格
        var deviceCard = E('div', { 'class': 'bandix-card' }, [
            E('div', { 'class': 'bandix-card-body' }, [
                E('div', { 'id': 'device-table-container' }, [
                    E('table', { 'class': 'bandix-table' }, [
                        E('thead', {}, [
                            E('tr', {}, [
                                E('th', {}, getTranslation('设备', language)),
                                E('th', {}, 'TCP'),
                                E('th', {}, 'UDP'),
                                E('th', {}, getTranslation('TCP 状态详情', language)),
                                E('th', {}, getTranslation('总连接数', language))
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
                    getTranslation('无数据', language)));
                return;
            }

            var table = E('table', { 'class': 'bandix-table' }, [
                E('thead', {}, [
                    E('tr', {}, [
                        E('th', {}, getTranslation('设备', language)),
                        E('th', {}, 'TCP'),
                        E('th', {}, 'UDP'),
                        E('th', {}, getTranslation('TCP 状态详情', language)),
                        E('th', {}, getTranslation('总连接数', language))
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

            container.innerHTML = '';
            container.appendChild(table);
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
                    showError(getTranslation('无法获取数据', language));
                }
            }).catch(function (error) {
                console.error('Failed to load connection data:', error);
                showError(getTranslation('无法获取数据', language));
            });
        }

        // 轮询获取数据
        poll.add(updateConnectionData, 1);

        // 立即执行一次，不等待轮询
        updateConnectionData();

        return container;
    }
});