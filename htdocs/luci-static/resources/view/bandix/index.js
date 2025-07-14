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
        '实时总流量': '实时总流量'
    },
    'zh-tw': {
        'Bandix 局域网流量监控': 'Bandix 局域網流量監控',
        '正在加载数据...': '正在載入資料...',
        '无法获取数据': '無法獲取資料',
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
        '实时总流量': '即時總流量'
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
        '实时总流量': 'Real-time Total Traffic'
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

// 解析速度字符串为字节/秒
function parseSpeed(speedStr) {
    if (!speedStr || speedStr === '0' || speedStr === '0 B/s') return 0;

    const match = speedStr.match(/^([\d.]+)\s*([KMGT]?B\/s)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    const multipliers = {
        'B/S': 1,
        'KB/S': 1024,
        'MB/S': 1024 * 1024,
        'GB/S': 1024 * 1024 * 1024,
        'TB/S': 1024 * 1024 * 1024 * 1024
    };

    return value * (multipliers[unit] || 1);
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
                font-size: 0.875rem;
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
                background-color: white;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                transform: scale(0.9) translateY(20px);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .modal-overlay.show .modal {
                transform: scale(1) translateY(0);
                opacity: 1;
            }
            
            .modal-header {
                padding: 24px 24px 0 24px;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 16px;
            }
            
            .modal-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: #1f2937;
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
                color: #374151;
                margin-bottom: 8px;
                font-size: 0.875rem;
            }
            
            .form-input {
                width: 100%;
                padding: 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 0.875rem;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-sizing: border-box;
                transform: translateY(0);
            }
            
            .form-input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                transform: translateY(-1px);
            }
            
            .form-select {
                width: 100%;
                padding: 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 0.875rem;
                background-color: white;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-sizing: border-box;
                transform: translateY(0);
            }
            
            .form-select:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
                background-color: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }
            
            .btn-secondary:hover {
                background-color: #e5e7eb;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .device-summary {
                background-color: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 16px;
            }
            
            .device-summary-name {
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 4px;
            }
            
            .device-summary-details {
                color: #6b7280;
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
                            E('select', { 'class': 'form-select', 'id': 'upload-limit-unit', 'style': 'width: 100px;' }, [
                                E('option', { 'value': '1024' }, 'KB/s'),
                                E('option', { 'value': '1048576' }, 'MB/s'),
                                E('option', { 'value': '1073741824' }, 'GB/s')
                            ])
                        ]),
                        E('div', { 'style': 'font-size: 0.75rem; color: #6b7280; margin-top: 4px;' }, getTranslation('提示：输入 0 表示无限制', language))
                    ]),
                    E('div', { 'class': 'form-group' }, [
                        E('label', { 'class': 'form-label' }, getTranslation('下载限速', language)),
                        E('div', { 'style': 'display: flex; gap: 8px;' }, [
                            E('input', { 'type': 'number', 'class': 'form-input', 'id': 'download-limit-value', 'min': '0', 'step': '1', 'placeholder': '0' }),
                            E('select', { 'class': 'form-select', 'id': 'download-limit-unit', 'style': 'width: 100px;' }, [
                                E('option', { 'value': '1024' }, 'KB/s'),
                                E('option', { 'value': '1048576' }, 'MB/s'),
                                E('option', { 'value': '1073741824' }, 'GB/s')
                            ])
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
            var uploadUnit = '1024';
            if (uploadValue === 0) {
                document.getElementById('upload-limit-value').value = 0;
            } else if (uploadValue >= 1073741824) {
                uploadValue = uploadValue / 1073741824;
                uploadUnit = '1073741824';
                document.getElementById('upload-limit-value').value = Math.round(uploadValue);
            } else if (uploadValue >= 1048576) {
                uploadValue = uploadValue / 1048576;
                uploadUnit = '1048576';
                document.getElementById('upload-limit-value').value = Math.round(uploadValue);
            } else if (uploadValue >= 1024) {
                uploadValue = uploadValue / 1024;
                uploadUnit = '1024';
                document.getElementById('upload-limit-value').value = Math.round(uploadValue);
            } else {
                document.getElementById('upload-limit-value').value = uploadValue;
            }
            document.getElementById('upload-limit-unit').value = uploadUnit;

            // 设置下载限速值
            var downloadValue = downloadLimit;
            var downloadUnit = '1024';
            if (downloadValue === 0) {
                document.getElementById('download-limit-value').value = 0;
            } else if (downloadValue >= 1073741824) {
                downloadValue = downloadValue / 1073741824;
                downloadUnit = '1073741824';
                document.getElementById('download-limit-value').value = Math.round(downloadValue);
            } else if (downloadValue >= 1048576) {
                downloadValue = downloadValue / 1048576;
                downloadUnit = '1048576';
                document.getElementById('download-limit-value').value = Math.round(downloadValue);
            } else if (downloadValue >= 1024) {
                downloadValue = downloadValue / 1024;
                downloadUnit = '1024';
                document.getElementById('download-limit-value').value = Math.round(downloadValue);
            } else {
                document.getElementById('download-limit-value').value = downloadValue;
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

            // 获取上传限速值
            var uploadValue = parseInt(document.getElementById('upload-limit-value').value) || 0;
            var uploadUnit = parseInt(document.getElementById('upload-limit-unit').value);
            if (uploadValue > 0) {
                uploadLimit = uploadValue * uploadUnit;
            }

            // 获取下载限速值
            var downloadValue = parseInt(document.getElementById('download-limit-value').value) || 0;
            var downloadUnit = parseInt(document.getElementById('download-limit-unit').value);
            if (downloadValue > 0) {
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
                        getTranslation('跨网络流量', language)
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
                        getTranslation('实时总流量', language)
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
                            actionButton
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
