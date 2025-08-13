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
        '无法获取历史数据': '无法获取历史数据',
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
        '设置': '设置',
        '限速设置': '限速设置',
        '取消限速': '取消限速',
        '保存': '保存',
        '取消': '取消',
        '设置限速': '设置限速',
        '设备': '设备',
        '上传限速': '上传限速',
        '下载限速': '下载限速',
        '无限制': '无限制',
        '设置成功': '设置成功',
        '设置失败': '设置失败',
        '请输入有效的速度值': '请输入有效的速度值',
        '速度值必须大于0': '速度值必须大于0',
        '保存中...': '保存中...',
        '限速功能仅对跨网络流量生效。': '限速功能仅对跨网络流量生效。',
        '提示：输入 0 表示无限制': '提示：输入 0 表示无限制',
        '实时总流量': '实时总流量',
        '历史流量趋势': '历史流量趋势',
        '选择设备': '选择设备',
        '所有设备': '所有设备',
        '时间范围': '时间范围',
        '最近5分钟': '最近5分钟',
        '最近30分钟': '最近30分钟',
        '最近2小时': '最近2小时',
        '类型': '类型',
        '总流量': '总流量',
        '局域网': '局域网',
        '跨网络': '跨网络',
        '刷新': '刷新',
        '上传速率': '上传速率',
        '下载速率': '下载速率'
    },
    'zh-tw': {
        'Bandix 局域网流量监控': 'Bandix 局域網流量監控',
        '正在加载数据...': '正在載入資料...',
        '无法获取数据': '無法獲取資料',
        '无法获取历史数据': '無法獲取歷史資料',
        '主机名': '主機名',
        'IP地址': 'IP地址',
        'MAC地址': 'MAC地址',
        '下载速度': '下載速度',
        '上传速度': '上傳速度',
        '总下载量': '總下載量',
        '总上传量': '總上傳量',
        '下载限速': '下載限速',
        '上传限速': '上傳限速',
        '界面语言': '介面語言',
        '选择 Bandix 流量监控的显示语言': '選擇 Bandix 流量監控的顯示語言',
        '设备信息': '設備資訊',
        '局域网流量': '局域網流量',
        '跨网络流量': '跨網路流量',
        '限速设置': '限速設定',
        '操作': '操作',
        '在线设备': '線上設備',
        '仅限跨网络': '僅限跨網路',
        '设置': '設定',
        '限速设置': '限速設定',
        '取消限速': '取消限速',
        '保存': '儲存',
        '取消': '取消',
        '设置限速': '設定限速',
        '设备': '設備',
        '上传限速': '上傳限速',
        '下载限速': '下載限速',
        '无限制': '無限制',
        '设置成功': '設定成功',
        '设置失败': '設定失敗',
        '请输入有效的速度值': '請輸入有效的速度值',
        '速度值必须大于0': '速度值必須大於0',
        '保存中...': '儲存中...',
        '限速功能仅对跨网络流量生效。': '限速功能僅對跨網路流量生效。',
        '提示：输入 0 表示无限制': '提示：輸入 0 表示無限制',
        '实时总流量': '即時總流量',
        '历史流量趋势': '歷史流量趨勢',
        '选择设备': '選擇設備',
        '所有设备': '所有設備',
        '时间范围': '時間範圍',
        '最近5分钟': '最近5分鐘',
        '最近30分钟': '最近30分鐘',
        '最近2小时': '最近2小時',
        '类型': '類型',
        '总流量': '總流量',
        '局域网': '局域網',
        '跨网络': '跨網路',
        '刷新': '重新整理',
        '上传速率': '上傳速率',
        '下载速率': '下載速率'
    },
    'en': {
        'Bandix 局域网流量监控': 'Bandix LAN Traffic Monitor',
        '正在加载数据...': 'Loading data...',
        '无法获取数据': 'Unable to fetch data',
        '无法获取历史数据': 'Unable to fetch history data',
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
        '设置': 'Settings',
        '限速设置': 'Rate Limit Settings',
        '取消限速': 'Remove Rate Limit',
        '保存': 'Save',
        '取消': 'Cancel',
        '设置限速': 'Set Rate Limit',
        '设备': 'Device',
        '上传限速': 'Upload Limit',
        '下载限速': 'Download Limit',
        '无限制': 'Unlimited',
        '设置成功': 'Settings saved successfully',
        '设置失败': 'Failed to save settings',
        '请输入有效的速度值': 'Please enter a valid speed value',
        '速度值必须大于0': 'Speed value must be greater than 0',
        '保存中...': 'Saving...',
        '限速功能仅对跨网络流量生效。': 'Rate limiting only applies to WAN traffic.',
        '提示：输入 0 表示无限制': 'Tip: Enter 0 for unlimited',
        '实时总流量': 'Real-time Total Traffic',
        '历史流量趋势': 'Traffic History',
        '选择设备': 'Select Device',
        '所有设备': 'All Devices',
        '时间范围': 'Time Range',
        '最近5分钟': 'Last 5 minutes',
        '最近30分钟': 'Last 30 minutes',
        '最近2小时': 'Last 2 hours',
        '类型': 'Type',
        '总流量': 'Total',
        '局域网': 'LAN',
        '跨网络': 'WAN',
        '刷新': 'Refresh',
        '上传速率': 'Upload Rate',
        '下载速率': 'Download Rate'
    },
    'fr': {
        'Bandix 局域网流量监控': 'Moniteur de Trafic LAN Bandix',
        '正在加载数据...': 'Chargement des données...',
        '无法获取数据': 'Impossible de récupérer les données',
        '主机名': 'Nom d\'hôte',
        'IP地址': 'Adresse IP',
        'MAC地址': 'Adresse MAC',
        '下载速度': 'Vitesse de téléchargement',
        '上传速度': 'Vitesse de téléversement',
        '总下载量': 'Téléchargement total',
        '总上传量': 'Téléversement total',
        '下载限速': 'Limite de téléchargement',
        '上传限速': 'Limite de téléversement',
        '界面语言': 'Langue de l\'interface',
        '选择 Bandix 流量监控的显示语言': 'Sélectionner la langue d\'affichage pour le Moniteur de Trafic Bandix',
        '设备信息': 'Informations sur l\'appareil',
        '局域网流量': 'Trafic LAN',
        '跨网络流量': 'Trafic WAN',
        '限速设置': 'Limitation de débit',
        '操作': 'Actions',
        '在线设备': 'Appareils en ligne',
        '仅限跨网络': 'WAN uniquement',
        '设置': 'Paramètres',
        '限速设置': 'Paramètres de limitation',
        '取消限速': 'Supprimer la limitation',
        '保存': 'Enregistrer',
        '取消': 'Annuler',
        '设置限速': 'Définir la limitation',
        '设备': 'Appareil',
        '上传限速': 'Limite de téléversement',
        '下载限速': 'Limite de téléchargement',
        '无限制': 'Illimité',
        '设置成功': 'Paramètres enregistrés avec succès',
        '设置失败': 'Échec de l\'enregistrement des paramètres',
        '请输入有效的速度值': 'Veuillez entrer une valeur de vitesse valide',
        '速度值必须大于0': 'La valeur de vitesse doit être supérieure à 0',
        '保存中...': 'Enregistrement...',
        '限速功能仅对跨网络流量生效。': 'La limitation de débit ne s\'applique qu\'au trafic WAN.',
        '提示：输入 0 表示无限制': 'Conseil : Entrez 0 pour illimité',
        '实时总流量': 'Trafic total en temps réel'
    },
    'ja': {
        'Bandix 局域网流量监控': 'Bandix LAN トラフィックモニター',
        '正在加载数据...': 'データを読み込み中...',
        '无法获取数据': 'データを取得できません',
        '主机名': 'ホスト名',
        'IP地址': 'IPアドレス',
        'MAC地址': 'MACアドレス',
        '下载速度': 'ダウンロード速度',
        '上传速度': 'アップロード速度',
        '总下载量': '総ダウンロード量',
        '总上传量': '総アップロード量',
        '下载限速': 'ダウンロード制限',
        '上传限速': 'アップロード制限',
        '界面语言': 'インターフェース言語',
        '选择 Bandix 流量监控的显示语言': 'Bandix トラフィックモニターの表示言語を選択',
        '设备信息': 'デバイス情報',
        '局域网流量': 'LAN トラフィック',
        '跨网络流量': 'WAN トラフィック',
        '限速设置': '速度制限',
        '操作': '操作',
        '在线设备': 'オンラインデバイス',
        '仅限跨网络': 'WAN のみ',
        '设置': '設定',
        '限速设置': '速度制限設定',
        '取消限速': '速度制限を削除',
        '保存': '保存',
        '取消': 'キャンセル',
        '设置限速': '速度制限を設定',
        '设备': 'デバイス',
        '上传限速': 'アップロード制限',
        '下载限速': 'ダウンロード制限',
        '无限制': '無制限',
        '设置成功': '設定が正常に保存されました',
        '设置失败': '設定の保存に失敗しました',
        '请输入有效的速度值': '有効な速度値を入力してください',
        '速度值必须大于0': '速度値は0より大きい必要があります',
        '保存中...': '保存中...',
        '限速功能仅对跨网络流量生效。': '速度制限はWANトラフィックにのみ適用されます。',
        '提示：输入 0 表示无限制': 'ヒント：0を入力すると無制限になります',
        '实时总流量': 'リアルタイム総トラフィック'
    },
    'ru': {
        'Bandix 局域网流量监控': 'Монитор Трафика LAN Bandix',
        '正在加载数据...': 'Загрузка данных...',
        '无法获取数据': 'Не удалось получить данные',
        '主机名': 'Имя хоста',
        'IP地址': 'IP-адрес',
        'MAC地址': 'MAC-адрес',
        '下载速度': 'Скорость загрузки',
        '上传速度': 'Скорость выгрузки',
        '总下载量': 'Общая загрузка',
        '总上传量': 'Общая выгрузка',
        '下载限速': 'Ограничение загрузки',
        '上传限速': 'Ограничение выгрузки',
        '界面语言': 'Язык интерфейса',
        '选择 Bandix 流量监控的显示语言': 'Выберите язык отображения для Монитора Трафика Bandix',
        '设备信息': 'Информация об устройстве',
        '局域网流量': 'Трафик LAN',
        '跨网络流量': 'Трафик WAN',
        '限速设置': 'Ограничение скорости',
        '操作': 'Действия',
        '在线设备': 'Онлайн устройства',
        '仅限跨网络': 'Только WAN',
        '设置': 'Настройки',
        '限速设置': 'Настройки ограничения',
        '取消限速': 'Удалить ограничение',
        '保存': 'Сохранить',
        '取消': 'Отмена',
        '设置限速': 'Установить ограничение',
        '设备': 'Устройство',
        '上传限速': 'Ограничение выгрузки',
        '下载限速': 'Ограничение загрузки',
        '无限制': 'Без ограничений',
        '设置成功': 'Настройки успешно сохранены',
        '设置失败': 'Не удалось сохранить настройки',
        '请输入有效的速度值': 'Пожалуйста, введите допустимое значение скорости',
        '速度值必须大于0': 'Значение скорости должно быть больше 0',
        '保存中...': 'Сохранение...',
        '限速功能仅对跨网络流量生效。': 'Ограничение скорости применяется только к WAN-трафику.',
        '提示：输入 0 表示无限制': 'Совет: Введите 0 для снятия ограничений',
        '实时总流量': 'Общий трафик в реальном времени'
    }
};

function getTranslation(key, language) {
    return translations[language]?.[key] || key;
}

function getSystemLanguage() {
    // 尝试获取 LuCI 的语言设置
    var luciLang = uci.get('luci', 'main', 'lang');
    
    if (luciLang && translations[luciLang]) {
        return luciLang;
    }
    
    // 如果没有 LuCI 语言设置，尝试获取浏览器语言作为回退
    var systemLang = document.documentElement.lang || 'en';
    
    if (translations[systemLang]) {
        return systemLang;
    }
    
    // 最终回退到英语
    return 'en';
}

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
        if (argonMode && argonMode.toLowerCase().includes('dark')) {
            return true;
        }
    }
    
    return false;
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
        var language = uci.get('bandix', 'general', 'language');
        if (!language || language === 'auto') {
            language = getSystemLanguage();
        }
        var darkMode = isDarkMode();

        // 添加现代化样式，支持暗黑模式
        var style = E('style', {}, `
            .bandix-container {
                padding: 24px;
                background-color: ${darkMode ? '#1E1E1E' : '#f8fafc'};
                min-height: 100vh;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: ${darkMode ? '#e2e8f0' : '#1f2937'};
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
                overflow: hidden;
                margin-bottom: 24px;
                border: 1px solid ${darkMode ? '#252526' : '#3333331c'};
            }
            
            .bandix-card-header {
                padding: 20px 24px;
                border-bottom: 1px solid ${darkMode ? '#252526' : '#e5e7eb'};
                background-color: ${darkMode ? '#333333' : '#fafafa'};
            }
            
            .bandix-card-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: ${darkMode ? '#f1f5f9' : '#1f2937'};
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
                background-color: ${darkMode ? '#333333' : '#f9fafb'};
                padding: 16px 20px;
                text-align: left;
                font-weight: 600;
                color: ${darkMode ? '#e2e8f0' : '#374151'};
                border: none;
                font-size: 0.875rem;
            }
            
            .bandix-table td {
                padding: 16px 20px;
                border: none;
                vertical-align: middle;
                word-wrap: break-word;
                overflow-wrap: break-word;
                color: ${darkMode ? '#cbd5e1' : 'inherit'};
            }
            
            /* 斑马纹效果 - 交替行颜色 */
            .bandix-table tbody tr:nth-child(odd) {
                background-color: ${darkMode ? '#252526' : '#ffffff'};
            }
            
            .bandix-table tbody tr:nth-child(even) {
                background-color: ${darkMode ? '#1E1E1E' : '#f9fafb'};
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

			/* 类型联动的高亮与弱化 */
			.bandix-table .hi { font-weight: 700; }
			.bandix-table .dim { opacity: 0.6; }
            
            
            .device-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .device-name {
                font-weight: 600;
                color: ${darkMode ? '#f1f5f9' : '#1f2937'};
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
                color: ${darkMode ? '#94a3b8' : '#6b7280'};
                font-size: 0.875rem;
            }
            
            .device-mac {
                color: ${darkMode ? '#64748b' : '#9ca3af'};
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
                background-color: ${darkMode ? '#333333' : '#f3f4f6'};
                color: ${darkMode ? '#94a3b8' : '#6b7280'};
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.75rem;
                text-align: center;
                margin-top: 4px;
            }
            
            .action-button {
                background-color: ${darkMode ? '#333333' : '#f3f4f6'};
                border: 1px solid ${darkMode ? '#252526' : '#d1d5db'};
                border-radius: 6px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 0.875rem;
                color: ${darkMode ? '#e2e8f0' : 'inherit'};
            }
            
            
            .loading {
                text-align: center;
                padding: 40px;
                color: ${darkMode ? '#94a3b8' : '#6b7280'};
                font-style: italic;
            }
            
            .error {
                text-align: center;
                padding: 40px;
                color: ${darkMode ? '#f87171' : '#ef4444'};
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            
            .stats-card {
                background-color: ${darkMode ? '#252526' : 'white'};
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, ${darkMode ? '0.3' : '0.1'});
                border: 1px solid ${darkMode ? '#252526' : 'transparent'};
            }
            
            .stats-title {
                font-size: 0.875rem;
                font-weight: 600;
                color: ${darkMode ? '#e2e8f0' : '#374151'};
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .stats-value {
                font-size: 1.25rem;
                font-weight: 700;
                color: ${darkMode ? '#f1f5f9' : '#1f2937'};
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
                background-color: ${darkMode ? '#252526' : 'white'};
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, ${darkMode ? '0.4' : '0.1'});
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                transform: scale(0.9) translateY(20px);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid ${darkMode ? '#252526' : 'transparent'};
            }
            
            .modal-overlay.show .modal {
                transform: scale(1) translateY(0);
                opacity: 1;
            }
            
            .modal-header {
                padding: 24px 24px 0 24px;
                border-bottom: 1px solid ${darkMode ? '#252526' : '#e5e7eb'};
                padding-bottom: 16px;
            }
            
            .modal-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: ${darkMode ? '#f1f5f9' : '#1f2937'};
                margin: 0;
            }
            
            .modal-body {
                padding: 24px;
            }
            
            .modal-footer {
                padding: 16px 24px 24px 24px;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-label {
                display: block;
                font-weight: 600;
                color: ${darkMode ? '#e2e8f0' : '#374151'};
                margin-bottom: 8px;
                font-size: 0.875rem;
            }
            
            .form-input {
                width: 100%;
                padding: 12px;
                border: 1px solid ${darkMode ? '#252526' : '#d1d5db'};
                border-radius: 6px;
                font-size: 0.875rem;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-sizing: border-box;
                transform: translateY(0);
                background-color: ${darkMode ? '#333333' : 'white'};
                color: ${darkMode ? '#e2e8f0' : 'inherit'};
            }
            
            .form-input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, ${darkMode ? '0.2' : '0.1'});
                transform: translateY(-1px);
            }
            
            .form-select {
                width: 100%;
                padding: 12px;
                border: 1px solid ${darkMode ? '#252526' : '#d1d5db'};
                border-radius: 6px;
                font-size: 0.875rem;
                background-color: ${darkMode ? '#333333' : 'white'};
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-sizing: border-box;
                transform: translateY(0);
                color: ${darkMode ? '#e2e8f0' : 'inherit'};
            }
            
            .form-select:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, ${darkMode ? '0.2' : '0.1'});
                transform: translateY(-1px);
            }
            
            .btn {
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                border: none;
                transform: translateY(0);
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
            
            .btn-secondary {
                background-color: ${darkMode ? '#374151' : '#f3f4f6'};
                color: ${darkMode ? '#e2e8f0' : '#374151'};
                border: 1px solid ${darkMode ? '#252526' : '#d1d5db'};
            }
            
            .btn-secondary:hover {
                background-color: ${darkMode ? '#252526' : '#e5e7eb'};
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, ${darkMode ? '0.3' : '0.1'});
            }
            
            .device-summary {
                background-color: ${darkMode ? '#333333' : '#f9fafb'};
                border: 1px solid ${darkMode ? '#252526' : '#e5e7eb'};
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 16px;
            }
            
            .device-summary-name {
                font-weight: 600;
                color: ${darkMode ? '#f1f5f9' : '#1f2937'};
                margin-bottom: 4px;
            }
            
            .device-summary-details {
                color: ${darkMode ? '#94a3b8' : '#6b7280'};
                font-size: 0.875rem;
            }
            
            /* 加载动画 */
            .loading-spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #f3f4f6;
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
                border-bottom: 1px solid ${darkMode ? '#252526' : '#e5e7eb'};
                background-color: ${darkMode ? '#333333' : '#fafafa'};
            }
            .history-controls .form-select,
            .history-controls .form-input {
                width: auto;
                min-width: 160px;
            }
            .history-card-body {
                padding: 12px 16px 16px 16px;
                position: relative;
            }
            .history-legend {
                margin-left: auto;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; color: ${darkMode ? '#e2e8f0' : '#374151'}; }
            .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
            .legend-up { background-color: #ef4444; }
            .legend-down { background-color: #22c55e; }
            #history-canvas { width: 100%; height: 240px; display: block; }
			.history-tooltip {
				position: fixed;
                display: none;
				width: 320px;
				box-sizing: border-box;
                background-color: ${darkMode ? 'rgba(37, 37, 38, 0.95)' : 'rgba(255, 255, 255, 0.98)'};
                color: ${darkMode ? '#e2e8f0' : '#1f2937'};
                border: 1px solid ${darkMode ? '#3a3a3a' : '#e5e7eb'};
                border-radius: 8px;
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2), 0 4px 6px -4px rgba(0,0,0,0.2);
                padding: 10px 12px;
                z-index: 10;
                pointer-events: none;
                font-size: 12px;
                line-height: 1.4;
                white-space: nowrap;
            }
            .history-tooltip .ht-title { font-weight: 700; margin-bottom: 6px; }
            .history-tooltip .ht-row { display: flex; justify-content: space-between; gap: 12px; }
            .history-tooltip .ht-key { color: ${darkMode ? '#94a3b8' : '#6b7280'}; }
            .history-tooltip .ht-val { color: ${darkMode ? '#e2e8f0' : '#111827'}; }
			.history-tooltip .ht-device { margin-top: 4px; margin-bottom: 6px; color: ${darkMode ? '#94a3b8' : '#6b7280'}; font-size: 0.75rem; }
			/* 强调关键信息的排版 */
			.history-tooltip .ht-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 2px; margin-bottom: 6px; }
			.history-tooltip .ht-kpi .ht-k-label { color: ${darkMode ? '#94a3b8' : '#6b7280'}; font-size: 0.75rem; }
			.history-tooltip .ht-kpi .ht-k-value { font-size: 1rem; font-weight: 700; }
			.history-tooltip .ht-kpi.down .ht-k-value { color: #22c55e; }
			.history-tooltip .ht-kpi.up .ht-k-value { color: #ef4444; }
			.history-tooltip .ht-divider { height: 1px; background-color: ${darkMode ? '#3a3a3a' : '#e5e7eb'}; margin: 8px 0; }
			.history-tooltip .ht-section-title { font-weight: 600; font-size: 0.75rem; color: ${darkMode ? '#94a3b8' : '#6b7280'}; margin: 4px 0 6px 0; }
        `);

        document.head.appendChild(style);

        var view = E('div', { 'class': 'bandix-container' }, [
            // 头部
            E('div', { 'class': 'bandix-header' }, [
                E('h1', { 'class': 'bandix-title' }, getTranslation('Bandix 局域网流量监控', language)),
                // E('div', { 'class': 'bandix-badge', 'id': 'device-count' }, getTranslation('在线设备', language) + ': 0 / 0')
            ]),

            // 警告提示
            E('div', { 'class': 'bandix-alert' }, [
                E('span', { 'class': 'bandix-alert-icon' }, '⚠️'),
                E('span', {}, getTranslation('限速功能仅对跨网络流量生效。', language))
            ]),

            // 统计卡片
            E('div', { 'class': 'stats-grid', 'id': 'stats-grid' }),

            // 历史趋势卡片（无时间范围筛选）
            E('div', { 'class': 'bandix-card', 'id': 'history-card' }, [
                E('div', { 'class': 'bandix-card-header history-header' }, [
                    E('div', { 'class': 'bandix-card-title' }, [
                        E('span', {}, '📈'),
                        getTranslation('历史流量趋势', language)
                    ]),
                    E('div', { 'class': 'history-legend' }, [
                        E('div', { 'class': 'legend-item' }, [
                            E('span', { 'class': 'legend-dot legend-up' }),
                            getTranslation('上传速率', language)
                        ]),
                        E('div', { 'class': 'legend-item' }, [
                            E('span', { 'class': 'legend-dot legend-down' }),
                            getTranslation('下载速率', language)
                        ])
                    ])
                ]),
                E('div', { 'class': 'history-controls' }, [
                    E('label', { 'class': 'form-label', 'style': 'margin: 0;' }, getTranslation('选择设备', language)),
                    E('select', { 'class': 'form-select', 'id': 'history-device-select' }, [
                        E('option', { 'value': '' }, getTranslation('所有设备', language))
                    ]),
                    E('label', { 'class': 'form-label', 'style': 'margin: 0;' }, getTranslation('类型', language)),
                    E('select', { 'class': 'form-select', 'id': 'history-type-select' }, [
                        E('option', { 'value': 'total' }, getTranslation('总流量', language)),
                        E('option', { 'value': 'lan' }, getTranslation('局域网', language)),
                        E('option', { 'value': 'wan' }, getTranslation('跨网络', language))
                    ]),
                    E('span', { 'class': 'bandix-badge', 'id': 'history-retention', 'style': 'margin-left: auto;' }, '')
                ]),
                E('div', { 'class': 'history-card-body' }, [
                    E('canvas', { 'id': 'history-canvas', 'height': '240' }),
                    E('div', { 'class': 'history-tooltip', 'id': 'history-tooltip' })
                ])
            ]),

            // 主要内容卡片
            E('div', { 'class': 'bandix-card' }, [
                E('div', { 'id': 'traffic-status' }, [
                    E('div', { 'class': 'loading' }, getTranslation('正在加载数据...', language))
                ])
            ])
        ]);

        // 创建限速设置模态框
        var modal = E('div', { 'class': 'modal-overlay', 'id': 'rate-limit-modal' }, [
            E('div', { 'class': 'modal' }, [
                E('div', { 'class': 'modal-header' }, [
                    E('h3', { 'class': 'modal-title' }, getTranslation('设置限速', language))
                ]),
                E('div', { 'class': 'modal-body' }, [
                    E('div', { 'class': 'device-summary', 'id': 'modal-device-summary' }),
                    E('div', { 'class': 'form-group' }, [
                        E('label', { 'class': 'form-label' }, getTranslation('上传限速', language)),
                        E('div', { 'style': 'display: flex; gap: 8px;' }, [
                            E('input', { 'type': 'number', 'class': 'form-input', 'id': 'upload-limit-value', 'min': '0', 'step': '1', 'placeholder': '0' }),
                            E('select', { 'class': 'form-select', 'id': 'upload-limit-unit', 'style': 'width: 100px;' })
                        ]),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, getTranslation('提示：输入 0 表示无限制', language))
                    ]),
                    E('div', { 'class': 'form-group' }, [
                        E('label', { 'class': 'form-label' }, getTranslation('下载限速', language)),
                        E('div', { 'style': 'display: flex; gap: 8px;' }, [
                            E('input', { 'type': 'number', 'class': 'form-input', 'id': 'download-limit-value', 'min': '0', 'step': '1', 'placeholder': '0' }),
                            E('select', { 'class': 'form-select', 'id': 'download-limit-unit', 'style': 'width: 100px;' })
                        ]),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, getTranslation('提示：输入 0 表示无限制', language))
                    ])
                ]),
                E('div', { 'class': 'modal-footer' }, [
                    E('button', { 'class': 'btn btn-secondary', 'id': 'modal-cancel' }, getTranslation('取消', language)),
                    E('button', { 'class': 'btn btn-primary', 'id': 'modal-save' }, getTranslation('保存', language))
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
            var speedUnit = uci.get('bandix', 'general', 'speed_unit') || 'bytes';

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
            saveButton.innerHTML = '<span class="loading-spinner"></span>' + getTranslation('保存中...', language);
            saveButton.classList.add('btn-loading');

            var uploadLimit = 0;
            var downloadLimit = 0;
            var speedUnit = uci.get('bandix', 'general', 'speed_unit') || 'bytes';

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

            // 调用API设置限速
            callSetRateLimit(
                currentDevice.mac,
                uploadLimit,
                downloadLimit
            ).then(function (result) {
                // 恢复按钮状态
                saveButton.innerHTML = originalText;
                saveButton.classList.remove('btn-loading');
                // console.log("result", result)

                if (result === true) {
                    // ui.addNotification(null, E('p', {}, getTranslation('设置成功', language)), 'info');
                    hideRateLimitModal();
                } else {
                    var errorMsg = result && result.error ? result.error : getTranslation('设置失败', language);
                    ui.addNotification(null, E('p', {}, errorMsg), 'error');
                }
            }).catch(function (error) {
                // 恢复按钮状态
                saveButton.innerHTML = originalText;
                saveButton.classList.remove('btn-loading');
                ui.addNotification(null, E('p', {}, getTranslation('设置失败', language)), 'error');
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

        function updateDeviceOptions(devices) {
            var select = document.getElementById('history-device-select');
            if (!select) return;
            // 对比是否需要更新
            var currentValues = Array.from(select.options).map(o => o.value);
            var desiredValues = [''].concat(devices.map(d => d.mac));
            var same = currentValues.length === desiredValues.length && currentValues.every((v, i) => v === desiredValues[i]);
            if (same) return;

            var prev = select.value;
            // 重建选项
            select.innerHTML = '';
            select.appendChild(E('option', { 'value': '' }, getTranslation('所有设备', language)));
            devices.forEach(function (d) {
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

        function drawHistoryChart(canvas, labels, upSeries, downSeries) {
            if (!canvas) return;
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
            // 预留更大边距，避免标签被裁剪
            var padding = { left: 72, right: 36, top: 16, bottom: 36 };

            // 背景
            ctx.clearRect(0, 0, width, height);

            var speedUnit = uci.get('bandix', 'general', 'speed_unit') || 'bytes';
            var maxVal = 0;
            for (var i = 0; i < upSeries.length; i++) maxVal = Math.max(maxVal, upSeries[i] || 0);
            for (var j = 0; j < downSeries.length; j++) maxVal = Math.max(maxVal, downSeries[j] || 0);
            if (!isFinite(maxVal) || maxVal <= 0) maxVal = 1;

            // 动态测量Y轴最大标签宽度，增大左边距
            ctx.font = '12px sans-serif';
            var maxLabelText = formatByterate(maxVal, speedUnit);
            var zeroLabelText = formatByterate(0, speedUnit);
            var maxLabelWidth = Math.max(ctx.measureText(maxLabelText).width, ctx.measureText(zeroLabelText).width);
            padding.left = Math.max(padding.left, Math.ceil(maxLabelWidth) + 20);
            // 保证右侧时间不被裁剪
            var rightMin = 36; // 最小右边距
            padding.right = Math.max(padding.right, rightMin);

            var innerW = Math.max(1, width - padding.left - padding.right);
            var innerH = Math.max(1, height - padding.top - padding.bottom);

            // 记录用于交互的几何信息
            canvas.__bandixChart = {
                padding: padding,
                innerW: innerW,
                innerH: innerH,
                width: width,
                height: height,
                labels: labels,
                upSeries: upSeries,
                downSeries: downSeries
            };

            // 网格与Y轴刻度
            var gridLines = 4;
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;
            for (var g = 0; g <= gridLines; g++) {
                var y = padding.top + (innerH * g / gridLines);
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.stroke();
                var val = Math.round(maxVal * (gridLines - g) / gridLines);
                ctx.fillStyle = '#9ca3af';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                var yLabelY = (g === gridLines) ? y - 4 : y; // 底部刻度上移，避免贴近X轴
                ctx.fillText(formatByterate(val, speedUnit), padding.left - 8, yLabelY);
            }

            function pathSeries(series, color) {
                if (!series || series.length === 0) return;
                ctx.beginPath();
                var n = series.length;
                var stepX = n > 1 ? (innerW / (n - 1)) : 0;
                for (var k = 0; k < n; k++) {
                    var v = Math.max(0, series[k] || 0);
                    var x = padding.left + (n > 1 ? stepX * k : innerW / 2);
                    var y = padding.top + innerH - (v / maxVal) * innerH;
                    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            pathSeries(upSeries, '#ef4444');
            pathSeries(downSeries, '#22c55e');

            // X 轴时间标签（首尾）
            if (labels && labels.length > 0) {
                ctx.fillStyle = '#9ca3af';
                ctx.font = '12px sans-serif';
                ctx.textBaseline = 'top';
                var firstX = padding.left;
                var lastX = width - padding.right;
                var yBase = height - padding.bottom + 4;
                // 左侧时间靠左对齐
                ctx.textAlign = 'left';
                ctx.fillText(labels[0], firstX, yBase);
                // 右侧时间靠右对齐，避免被裁剪
                if (labels.length > 1) {
                    ctx.textAlign = 'right';
                    ctx.fillText(labels[labels.length - 1], lastX, yBase);
                }
            }
        }

        function msToTimeLabel(ts) {
            var d = new Date(ts);
            var hh = ('' + d.getHours()).padStart(2, '0');
            var mm = ('' + d.getMinutes()).padStart(2, '0');
            var ss = ('' + d.getSeconds()).padStart(2, '0');
            return hh + ':' + mm + ':' + ss;
        }

        function buildTooltipHtml(point, language) {
			if (!point) return '';
			var lines = [];
			var zh = (language === 'zh-cn' || language === 'zh-tw');
			var typeSel = (typeof document !== 'undefined' ? document.getElementById('history-type-select') : null);
			var selType = (typeSel && typeSel.value) ? typeSel.value : 'total';
			var speedUnit = uci.get('bandix', 'general', 'speed_unit') || 'bytes';

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
				if (type === 'lan') return { up: zh ? '局域上传速率' : 'LAN Upload', down: zh ? '局域下载速率' : 'LAN Download' };
				if (type === 'wan') return { up: zh ? '跨网上传速率' : 'WAN Upload', down: zh ? '跨网下载速率' : 'WAN Download' };
				return { up: zh ? '总上传速率' : 'Total Upload', down: zh ? '总下载速率' : 'Total Download' };
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
						var devLabel = (dev.hostname || '-') + (dev.ip ? ' (' + dev.ip + ')' : '') + (dev.mac ? ' [' + dev.mac + ']' : '');
						lines.push('<div class="ht-device">' + (zh ? '设备: ' : 'Device: ') + devLabel + '</div>');
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
				lines.push('<div class="ht-section-title">' + (zh ? '其他速率' : 'Other Rates') + '</div>');
				otherTypes.forEach(function (t) {
					var lbs = labelsFor(t);
					var ks = rateKeysFor(t);
					row(lbs.up, rateValue(ks.up));
					row(lbs.down, rateValue(ks.down));
				});
			}

			// 累计：区分局域网与公网
			lines.push('<div class="ht-divider"></div>');
			lines.push('<div class="ht-section-title">' + (zh ? '累计流量' : 'Cumulative') + '</div>');
			row(zh ? '总上传' : 'Total Uploaded', bytesValue('total_tx_bytes'));
			row(zh ? '总下载' : 'Total Downloaded', bytesValue('total_rx_bytes'));
			row(zh ? '局域上传' : 'LAN Uploaded', bytesValue('local_tx_bytes'));
			row(zh ? '局域下载' : 'LAN Downloaded', bytesValue('local_rx_bytes'));
			row(zh ? '公网上传' : 'WAN Uploaded', bytesValue('wide_tx_bytes'));
			row(zh ? '公网下载' : 'WAN Downloaded', bytesValue('wide_rx_bytes'));

			return lines.join('');
        }

        function formatRetentionSeconds(seconds, language) {
            if (!seconds || seconds <= 0) return '';
            var zh = (language === 'zh-cn' || language === 'zh-tw');
            var value, unitZh, unitEn;
            if (seconds < 60) {
                value = Math.round(seconds);
                unitZh = '秒';
                unitEn = value > 1 ? 'seconds' : 'second';
            } else if (seconds < 3600) {
                value = Math.round(seconds / 60);
                if (value < 1) value = 1;
                unitZh = '分钟';
                unitEn = value > 1 ? 'minutes' : 'minute';
            } else if (seconds < 86400) {
                value = Math.round(seconds / 3600);
                if (value < 1) value = 1;
                unitZh = '小时';
                unitEn = value > 1 ? 'hours' : 'hour';
            } else if (seconds < 604800) {
                value = Math.round(seconds / 86400);
                if (value < 1) value = 1;
                unitZh = '天';
                unitEn = value > 1 ? 'days' : 'day';
            } else {
                value = Math.round(seconds / 604800);
                if (value < 1) value = 1;
                unitZh = '周';
                unitEn = value > 1 ? 'weeks' : 'week';
            }
            return zh ? ('最近' + value + unitZh) : ('Last ' + value + ' ' + unitEn);
        }

        function refreshHistory() {
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
                    var text = formatRetentionSeconds(res && res.retention_seconds, language);
                    retentionBadge.textContent = text || '';
                }

                if (!data.length) {
                    var ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawHistoryChart(canvas, [], [], []);
                    return;
                }

                // 不做时间过滤，按时间升序排序，完整展示
                var filtered = data.slice();
                filtered.sort(function (a, b) { return (a.ts_ms || 0) - (b.ts_ms || 0); });

                var keys = getTypeKeys(type);
                var upSeries = filtered.map(function (x) { return x[keys.up] || 0; });
                var downSeries = filtered.map(function (x) { return x[keys.down] || 0; });
                var labels = filtered.map(function (x) { return msToTimeLabel(x.ts_ms); });

                drawHistoryChart(canvas, labels, upSeries, downSeries);

                // 绑定或更新鼠标事件用于展示浮窗
                function findNearestIndex(evt) {
                    var rect = canvas.getBoundingClientRect();
                    var x = evt.clientX - rect.left;
                    var info = canvas.__bandixChart;
                    if (!info || !info.labels || info.labels.length === 0) return -1;
                    var n = info.labels.length;
                    var stepX = n > 1 ? (info.innerW / (n - 1)) : 0;
                    var minIdx = 0;
                    var minDist = Infinity;
                    for (var k = 0; k < n; k++) {
                        var px = info.padding.left + (n > 1 ? stepX * k : info.innerW / 2);
                        var dist = Math.abs(px - x);
                        if (dist < minDist) { minDist = dist; minIdx = k; }
                    }
                    return minIdx;
                }

				function onMove(evt) {
					if (!tooltip) return;
					var idx = findNearestIndex(evt);
					if (idx < 0 || !lastHistoryData || !lastHistoryData[idx]) {
						tooltip.style.display = 'none';
						return;
					}
					var point = lastHistoryData[idx];
					tooltip.innerHTML = buildTooltipHtml(point, language);
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
					var baseX = cx + padding; // 右上（水平向右）
					var baseY = cy - th - padding; // 上方
					// 若右侧溢出，改为左上
					if (baseX + tw > maxX) {
						baseX = cx - tw - padding;
					}
					// 边界收缩（不改动上方定位的语义）
					if (baseX < 4) baseX = 4;
					if (baseY < 4) baseY = 4;

					tooltip.style.left = baseX + 'px';
					tooltip.style.top = baseY + 'px';
				}

                function onLeave() {
                    if (tooltip) tooltip.style.display = 'none';
                }

                canvas.onmousemove = onMove;
                canvas.onmouseleave = onLeave;
            }).catch(function () {
                var ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawHistoryChart(canvas, [], [], []);
                // ui.addNotification(null, E('p', {}, getTranslation('无法获取历史数据', language)), 'error');
            }).finally(function () {
                isHistoryLoading = false;
            });
        }

        // 历史趋势：事件绑定
        (function initHistoryControls() {
            var typeSel = document.getElementById('history-type-select');
            var devSel = document.getElementById('history-device-select');
            if (typeSel) typeSel.value = 'total';
			function onFilterChange() {
				refreshHistory();
				// 同步刷新表格（立即生效，不等轮询）
				try { window.__bandixRenderTable && window.__bandixRenderTable(); } catch (e) {}
			}
			if (typeSel) typeSel.addEventListener('change', onFilterChange);
			if (devSel) devSel.addEventListener('change', onFilterChange);

            window.addEventListener('resize', function () {
                if (lastHistoryData && lastHistoryData.length) {
                    // 重新绘制当前数据（保持当前筛选）
                    var type = document.getElementById('history-type-select')?.value || 'total';
                    var canvas = document.getElementById('history-canvas');
                    if (!canvas) return;
                    var filtered = lastHistoryData.slice();
                    filtered.sort(function (a, b) { return (a.ts_ms || 0) - (b.ts_ms || 0); });
                    var keys = getTypeKeys(type);
                    var upSeries = filtered.map(function (x) { return x[keys.up] || 0; });
                    var downSeries = filtered.map(function (x) { return x[keys.down] || 0; });
                    var labels = filtered.map(function (x) { return msToTimeLabel(x.ts_ms); });
                    drawHistoryChart(canvas, labels, upSeries, downSeries);
                } else {
                    refreshHistory();
                }
            });

            // 首次加载
            refreshHistory();
        })();

        // 历史趋势轮询（每1秒）
        poll.add(function () {
            return refreshHistory();
        },1);



        // 轮询获取数据
        poll.add(function () {
            return callStatus().then(function (result) {
                var trafficDiv = document.getElementById('traffic-status');
                var deviceCountDiv = document.getElementById('device-count');
                var statsGrid = document.getElementById('stats-grid');
                var language = uci.get('bandix', 'general', 'language');
                if (!language || language === 'auto') {
                    language = getSystemLanguage();
                }
                var speedUnit = uci.get('bandix', 'general', 'speed_unit') || 'bytes';

                var stats = result;
                if (!stats || !stats.devices) {
                    trafficDiv.innerHTML = '<div class="error">' + getTranslation('无法获取数据', language) + '</div>';
                    return;
                }

                // 更新设备计数
                var onlineCount = stats.devices.filter(d => d.online !== false).length;
                // deviceCountDiv.textContent = getTranslation('在线设备', language) + ': ' + onlineCount + ' / ' + stats.devices.length;

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
                        getTranslation('局域网流量', language)
                    ]),
                    E('div', { 'style': 'margin-top: 12px; display: flex; flex-direction: column; gap: 8px;' }, [
                        // 上传行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #ef4444; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                            E('span', { 'style': 'color: #3b82f6; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalLanSpeedUp, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-left: 4px;' }, '(' + formatSize(totalLanUp) + ')')
                        ]),
                        // 下载行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #22c55e; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                            E('span', { 'style': 'color: #3b82f6; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalLanSpeedDown, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-left: 4px;' }, '(' + formatSize(totalLanDown) + ')')
                        ])
                    ])
                ]));

                // 跨网络流量卡片
                statsGrid.appendChild(E('div', { 'class': 'stats-card' }, [
                    E('div', { 'class': 'stats-title' }, [
                        E('span', { 'style': 'color: #22c55e;' }, '🌐'),
                        getTranslation('跨网络流量', language)
                    ]),
                    E('div', { 'style': 'margin-top: 12px; display: flex; flex-direction: column; gap: 8px;' }, [
                        // 上传行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #ef4444; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                            E('span', { 'style': 'color: #22c55e; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalWanSpeedUp, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-left: 4px;' }, '(' + formatSize(totalWanUp) + ')')
                        ]),
                        // 下载行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #22c55e; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                            E('span', { 'style': 'color: #22c55e; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalWanSpeedDown, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-left: 4px;' }, '(' + formatSize(totalWanDown) + ')')
                        ])
                    ])
                ]));

                // 实时总流量卡片
                statsGrid.appendChild(E('div', { 'class': 'stats-card' }, [
                    E('div', { 'class': 'stats-title' }, [
                        E('span', {}, '⚡'),
                        getTranslation('实时总流量', language)
                    ]),
                    E('div', { 'style': 'margin-top: 12px; display: flex; flex-direction: column; gap: 8px;' }, [
                        // 上传行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #ef4444; font-size: 0.75rem; font-weight: bold;' }, '↑'),
                            E('span', { 'style': 'color: ' + (darkMode ? '#f1f5f9' : '#1f2937') + '; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalSpeedUp, speedUnit)),
                            E('span', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-left: 4px;' }, '(' + formatSize(totalUp) + ')')
                        ]),
                        // 下载行
                        E('div', { 'style': 'display: flex; align-items: center; gap: 4px;' }, [
                            E('span', { 'style': 'color: #22c55e; font-size: 0.75rem; font-weight: bold;' }, '↓'),
                            E('span', { 'style': 'color: ' + (darkMode ? '#f1f5f9' : '#1f2937') + '; font-size: 1.125rem; font-weight: 700;' }, formatByterate(totalSpeedDown, speedUnit)),
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

				// 过滤：按选择设备
				var selectedMac = (typeof document !== 'undefined' ? (document.getElementById('history-device-select')?.value || '') : '');
				var filteredDevices = (!selectedMac) ? stats.devices : stats.devices.filter(function(d){ return (d.mac === selectedMac); });

				// 填充数据
				filteredDevices.forEach(function (device) {
                    var isOnline = device.online !== false;

                    var actionButton = E('button', {
                        'class': 'action-button',
                        'title': getTranslation('设置', language)
                    }, '⚙️');

                    // 绑定点击事件
                    actionButton.addEventListener('click', function () {
                        showRateLimitModal(device);
                    });

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

                        // 跨网络流量
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
                });

                // 更新表格内容
				trafficDiv.innerHTML = '';
				trafficDiv.appendChild(table);
				// 暴露一个立即重绘表格的函数，供筛选变化时调用
				try { window.__bandixRenderTable = function(){
					var evt = new Event('resize'); // 触发重绘逻辑较重，这里直接复用渲染块
					// 简单方式：再次触发轮询渲染函数体
					// 此处不重复请求，依赖最近一次 callStatus 的 stats 缓存
					trafficDiv.innerHTML = '';
					trafficDiv.appendChild(table);
				}; } catch (e) {}

                // 更新历史趋势中的设备下拉
                try {
                    latestDevices = stats.devices || [];
                    updateDeviceOptions(latestDevices);
                } catch (e) {}
            });
        }, 1);

        return view;
    }
});
