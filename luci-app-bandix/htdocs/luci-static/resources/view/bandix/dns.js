'use strict';
'require view';
'require ui';
'require uci';
'require rpc';
'require poll';

const translations = {
    'zh-cn': {
        'Bandix DNS 监控': 'Bandix DNS 监控',
        '正在加载数据...': '正在加载数据...',
        '无法获取数据': '无法获取数据',
        'DNS 监控': 'DNS 监控',
        'DNS 查询记录': 'DNS 查询记录',
        'DNS 统计信息': 'DNS 统计信息',
        'DNS监控未启用': 'DNS监控未启用',
        '请在设置中启用DNS监控功能': '请在设置中启用DNS监控功能',
        '前往设置': '前往设置',
        '无数据': '无数据',
        '时间': '时间',
        '域名': '域名',
        '查询类型': '查询类型',
        '类型': '类型',
        '响应码': '响应码',
        '响应时间': '响应时间',
        '源IP': '源IP',
        '目标IP': '目标IP',
        '设备': '设备',
        '响应IP': '响应IP',
        '响应结果': '响应结果',
        'DNS服务器': 'DNS服务器',
        '查询': '查询',
        '响应': '响应',
        '过滤': '过滤',
        '域名过滤': '域名过滤',
        '设备过滤': '设备过滤',
        'DNS服务器过滤': 'DNS服务器过滤',
        '类型过滤': '类型过滤',
        '全部': '全部',
        '仅查询': '仅查询',
        '仅响应': '仅响应',
        '搜索': '搜索',
        '搜索域名': '搜索域名',
        '搜索设备': '搜索设备',
        '搜索DNS服务器': '搜索DNS服务器',
        '清除': '清除',
        '上一页': '上一页',
        '下一页': '下一页',
        '第': '第',
        '页，共': '页，共',
        '共': '共',
        '条记录': '条记录',
        '每页显示': '每页显示',
        '条': '条',
        '总查询数': '总查询数',
        '总响应数': '总响应数',
        '有响应查询': '有响应查询',
        '无响应查询': '无响应查询',
        '平均响应时间': '平均响应时间',
        '最快响应时间': '最快响应时间',
        '最慢响应时间': '最慢响应时间',
        '响应时间': '响应时间',
        '成功率': '成功率',
        '成功': '成功',
        '失败': '失败',
        '最常查询域名': '最常查询域名',
        '最常用查询类型': '最常用查询类型',
        '最活跃设备': '最活跃设备',
        '最常用DNS服务器': '最常用DNS服务器',
        '唯一设备数': '唯一设备数',
        '时间范围': '时间范围',
        '毫秒': '毫秒',
        '分钟': '分钟',
        '刷新': '刷新',
        '未知设备': '未知设备',
        '成功': '成功',
        '域名未找到': '域名未找到',
        '服务器错误': '服务器错误',
        '格式错误': '格式错误',
        '拒绝': '拒绝',
        '其他': '其他',
        '不包含 DoH 和 DoT': '不包含 DoH 和 DoT',
        '总查询数': '总查询数',
        '总响应数': '总响应数',
        '有响应查询': '有响应查询',
        '无响应查询': '无响应查询',
        '平均响应时间': '平均响应时间',
        '最快响应时间': '最快响应时间',
        '最慢响应时间': '最慢响应时间',
        '最新响应时间': '最新响应时间',
        '成功率': '成功率',
        '成功': '成功',
        '失败': '失败',
        '最常查询域名': '最常查询域名',
        '最常用查询类型': '最常用查询类型',
        '最活跃设备': '最活跃设备',
        '最常用DNS服务器': '最常用DNS服务器',
        '唯一设备数': '唯一设备数',
        '时间范围': '时间范围',
        '响应码分布': '响应码分布',
        '响应时间百分位': '响应时间百分位',
        'P50': 'P50',
        'P90': 'P90',
        'P95': 'P95',
        'P99': 'P99'
    },
    'zh-tw': {
        'Bandix DNS 监控': 'Bandix DNS 監控',
        '正在加载数据...': '正在載入資料...',
        '无法获取数据': '無法獲取資料',
        'DNS 监控': 'DNS 監控',
        'DNS 查询记录': 'DNS 查詢記錄',
        'DNS 统计信息': 'DNS 統計資訊',
        'DNS监控未启用': 'DNS監控未啟用',
        '请在设置中启用DNS监控功能': '請在設置中啟用DNS監控功能',
        '前往设置': '前往設置',
        '无数据': '無數據',
        '时间': '時間',
        '域名': '域名',
        '查询类型': '查詢類型',
        '类型': '類型',
        '响应码': '響應碼',
        '响应时间': '響應時間',
        '源IP': '源IP',
        '目标IP': '目標IP',
        '设备': '設備',
        '响应IP': '響應IP',
        '响应结果': '響應結果',
        'DNS服务器': 'DNS伺服器',
        '查询': '查詢',
        '响应': '響應',
        '过滤': '過濾',
        '域名过滤': '域名過濾',
        '设备过滤': '設備過濾',
        'DNS服务器过滤': 'DNS伺服器過濾',
        '类型过滤': '類型過濾',
        '全部': '全部',
        '仅查询': '僅查詢',
        '仅响应': '僅響應',
        '搜索': '搜尋',
        '搜索域名': '搜尋域名',
        '搜索设备': '搜尋設備',
        '搜索DNS服务器': '搜尋DNS伺服器',
        '清除': '清除',
        '上一页': '上一頁',
        '下一页': '下一頁',
        '第': '第',
        '页，共': '頁，共',
        '共': '共',
        '条记录': '條記錄',
        '每页显示': '每頁顯示',
        '条': '條',
        '总查询数': '總查詢數',
        '总响应数': '總響應數',
        '有响应查询': '有響應查詢',
        '无响应查询': '無響應查詢',
        '平均响应时间': '平均響應時間',
        '最快响应时间': '最快響應時間',
        '最慢响应时间': '最慢響應時間',
        '响应时间': '響應時間',
        '成功率': '成功率',
        '成功': '成功',
        '失败': '失敗',
        '最常查询域名': '最常查詢域名',
        '最常用查询类型': '最常用查詢類型',
        '最活跃设备': '最活躍設備',
        '最常用DNS服务器': '最常用DNS伺服器',
        '唯一设备数': '唯一設備數',
        '时间范围': '時間範圍',
        '毫秒': '毫秒',
        '分钟': '分鐘',
        '刷新': '重新整理',
        '未知设备': '未知設備',
        '成功': '成功',
        '域名未找到': '域名未找到',
        '服务器错误': '伺服器錯誤',
        '格式错误': '格式錯誤',
        '拒绝': '拒絕',
        '其他': '其他',
        '不包含 DoH 和 DoT': '不包含 DoH 和 DoT',
        '总查询数': '總查詢數',
        '总响应数': '總響應數',
        '有响应查询': '有響應查詢',
        '无响应查询': '無響應查詢',
        '平均响应时间': '平均響應時間',
        '最快响应时间': '最快響應時間',
        '最慢响应时间': '最慢響應時間',
        '最新响应时间': '最新響應時間',
        '成功率': '成功率',
        '成功': '成功',
        '失败': '失敗',
        '最常查询域名': '最常查詢域名',
        '最常用查询类型': '最常用查詢類型',
        '最活跃设备': '最活躍設備',
        '最常用DNS服务器': '最常用DNS伺服器',
        '唯一设备数': '唯一設備數',
        '时间范围': '時間範圍',
        '响应码分布': '響應碼分佈',
        '响应时间百分位': '響應時間百分位',
        'P50': 'P50',
        'P90': 'P90',
        'P95': 'P95',
        'P99': 'P99'
    },
    'en': {
        'Bandix DNS 监控': 'Bandix DNS Monitor',
        '正在加载数据...': 'Loading data...',
        '无法获取数据': 'Unable to fetch data',
        'DNS 监控': 'DNS Monitor',
        'DNS 查询记录': 'DNS Query Records',
        'DNS 统计信息': 'DNS Statistics',
        'DNS监控未启用': 'DNS Monitoring Disabled',
        '请在设置中启用DNS监控功能': 'Please enable DNS monitoring in settings',
        '前往设置': 'Go to Settings',
        '无数据': 'No Data',
        '时间': 'Time',
        '域名': 'Domain',
        '查询类型': 'Query Type',
        '类型': 'Type',
        '响应码': 'Response Code',
        '响应时间': 'Response Time',
        '源IP': 'Source IP',
        '目标IP': 'Destination IP',
        '设备': 'Device',
        '响应IP': 'Response IPs',
        '响应结果': 'Response Result',
        'DNS服务器': 'DNS Server',
        '查询': 'Query',
        '响应': 'Response',
        '过滤': 'Filter',
        '域名过滤': 'Domain Filter',
        '设备过滤': 'Device Filter',
        'DNS服务器过滤': 'DNS Server Filter',
        '类型过滤': 'Type Filter',
        '全部': 'All',
        '仅查询': 'Queries Only',
        '仅响应': 'Responses Only',
        '搜索': 'Search',
        '搜索域名': 'Search Domain',
        '搜索设备': 'Search Device',
        '搜索DNS服务器': 'Search DNS Server',
        '清除': 'Clear',
        '上一页': 'Previous',
        '下一页': 'Next',
        '第': 'Page',
        '页，共': 'of',
        '共': 'Total',
        '条记录': 'records',
        '每页显示': 'Per Page',
        '条': '',
        '总查询数': 'Total Queries',
        '总响应数': 'Total Responses',
        '有响应查询': 'Queries with Response',
        '无响应查询': 'Queries without Response',
        '平均响应时间': 'Avg Response Time',
        '最快响应时间': 'Min Response Time',
        '最慢响应时间': 'Max Response Time',
        '响应时间': 'Response Time',
        '成功率': 'Success Rate',
        '成功': 'Success',
        '失败': 'Failure',
        '最常查询域名': 'Top Domains',
        '最常用查询类型': 'Top Query Types',
        '最活跃设备': 'Top Devices',
        '最常用DNS服务器': 'Top DNS Servers',
        '唯一设备数': 'Unique Devices',
        '时间范围': 'Time Range',
        '毫秒': 'ms',
        '分钟': 'minutes',
        '刷新': 'Refresh',
        '未知设备': 'Unknown Device',
        '成功': 'Success',
        '域名未找到': 'Domain not found',
        '服务器错误': 'Server error',
        '格式错误': 'Format error',
        '拒绝': 'Refused',
        '其他': 'Other',
        '不包含 DoH 和 DoT': 'Does not include DoH and DoT',
        '总查询数': 'Total Queries',
        '总响应数': 'Total Responses',
        '有响应查询': 'Queries with Response',
        '无响应查询': 'Queries without Response',
        '平均响应时间': 'Avg Response Time',
        '最快响应时间': 'Min Response Time',
        '最慢响应时间': 'Max Response Time',
        '最新响应时间': 'Latest Response Time',
        '成功率': 'Success Rate',
        '成功': 'Success',
        '失败': 'Failure',
        '最常查询域名': 'Top Domains',
        '最常用查询类型': 'Top Query Types',
        '最活跃设备': 'Top Devices',
        '最常用DNS服务器': 'Top DNS Servers',
        '唯一设备数': 'Unique Devices',
        '时间范围': 'Time Range',
        '响应码分布': 'Response Code Distribution',
        '响应时间百分位': 'Response Time Percentiles',
        'P50': 'P50',
        'P90': 'P90',
        'P95': 'P95',
        'P99': 'P99'
    },
    'fr': {
        'Bandix DNS 监控': 'Bandix Surveillance DNS',
        '正在加载数据...': 'Chargement des données...',
        '无法获取数据': 'Impossible de récupérer les données',
        'DNS 监控': 'Surveillance DNS',
        'DNS 查询记录': 'Enregistrements de Requêtes DNS',
        'DNS 统计信息': 'Statistiques DNS',
        'DNS监控未启用': 'Surveillance DNS désactivée',
        '请在设置中启用DNS监控功能': 'Veuillez activer la surveillance DNS dans les paramètres',
        '前往设置': 'Aller aux Paramètres',
        '无数据': 'Aucune Donnée',
        '时间': 'Heure',
        '域名': 'Domaine',
        '查询类型': 'Type de Requête',
        '类型': 'Type',
        '响应码': 'Code de Réponse',
        '响应时间': 'Temps de Réponse',
        '源IP': 'IP Source',
        '目标IP': 'IP de Destination',
        '设备': 'Appareil',
        '响应IP': 'IPs de Réponse',
        '响应结果': 'Résultat de Réponse',
        'DNS服务器': 'Serveur DNS',
        '查询': 'Requête',
        '响应': 'Réponse',
        '过滤': 'Filtre',
        '域名过滤': 'Filtre de Domaine',
        '设备过滤': 'Filtre d\'Appareil',
        'DNS服务器过滤': 'Filtre de Serveur DNS',
        '类型过滤': 'Filtre de Type',
        '全部': 'Tous',
        '仅查询': 'Requêtes Seulement',
        '仅响应': 'Réponses Seulement',
        '搜索': 'Rechercher',
        '搜索域名': 'Rechercher un Domaine',
        '搜索设备': 'Rechercher un Appareil',
        '搜索DNS服务器': 'Rechercher un Serveur DNS',
        '清除': 'Effacer',
        '上一页': 'Précédent',
        '下一页': 'Suivant',
        '第': 'Page',
        '页，共': 'sur',
        '共': 'Total',
        '条记录': 'enregistrements',
        '每页显示': 'Par Page',
        '条': '',
        '总查询数': 'Total des Requêtes',
        '总响应数': 'Total des Réponses',
        '有响应查询': 'Requêtes avec Réponse',
        '无响应查询': 'Requêtes sans Réponse',
        '平均响应时间': 'Temps de Réponse Moyen',
        '最快响应时间': 'Temps de Réponse Minimum',
        '最慢响应时间': 'Temps de Réponse Maximum',
        '响应时间': 'Temps de Réponse',
        '成功率': 'Taux de Réussite',
        '成功': 'Succès',
        '失败': 'Échec',
        '最常查询域名': 'Domaines les Plus Consultés',
        '最常用查询类型': 'Types de Requêtes les Plus Utilisés',
        '最活跃设备': 'Appareils les Plus Actifs',
        '最常用DNS服务器': 'Serveurs DNS les Plus Utilisés',
        '唯一设备数': 'Appareils Uniques',
        '时间范围': 'Plage de Temps',
        '毫秒': 'ms',
        '分钟': 'minutes',
        '刷新': 'Actualiser',
        '未知设备': 'Appareil Inconnu',
        '成功': 'Succès',
        '域名未找到': 'Domaine introuvable',
        '服务器错误': 'Erreur serveur',
        '格式错误': 'Erreur de format',
        '拒绝': 'Refusé',
        '其他': 'Autre',
        '不包含 DoH 和 DoT': 'N\'inclut pas DoH et DoT',
        '总查询数': 'Total des Requêtes',
        '总响应数': 'Total des Réponses',
        '有响应查询': 'Requêtes avec Réponse',
        '无响应查询': 'Requêtes sans Réponse',
        '平均响应时间': 'Temps de Réponse Moyen',
        '最快响应时间': 'Temps de Réponse Minimum',
        '最慢响应时间': 'Temps de Réponse Maximum',
        '最新响应时间': 'Dernier Temps de Réponse',
        '成功率': 'Taux de Réussite',
        '成功': 'Succès',
        '失败': 'Échec',
        '最常查询域名': 'Domaines les Plus Consultés',
        '最常用查询类型': 'Types de Requêtes les Plus Utilisés',
        '最活跃设备': 'Appareils les Plus Actifs',
        '最常用DNS服务器': 'Serveurs DNS les Plus Utilisés',
        '唯一设备数': 'Appareils Uniques',
        '时间范围': 'Plage de Temps',
        '响应码分布': 'Distribution des Codes de Réponse',
        '响应时间百分位': 'Centiles du Temps de Réponse',
        'P50': 'P50',
        'P90': 'P90',
        'P95': 'P95',
        'P99': 'P99'
    },
    'ja': {
        'Bandix DNS 监控': 'Bandix DNS監視',
        '正在加载数据...': 'データを読み込み中...',
        '无法获取数据': 'データを取得できません',
        'DNS 监控': 'DNS監視',
        'DNS 查询记录': 'DNSクエリ記録',
        'DNS 统计信息': 'DNS統計情報',
        'DNS监控未启用': 'DNS監視が無効です',
        '请在设置中启用DNS监控功能': '設定でDNS監視機能を有効にしてください',
        '前往设置': '設定へ',
        '无数据': 'データなし',
        '时间': '時刻',
        '域名': 'ドメイン',
        '查询类型': 'クエリタイプ',
        '类型': 'タイプ',
        '响应码': '応答コード',
        '响应时间': '応答時間',
        '源IP': '送信元IP',
        '目标IP': '宛先IP',
        '设备': 'デバイス',
        '响应IP': '応答IP',
        '响应结果': '応答結果',
        'DNS服务器': 'DNSサーバー',
        '查询': 'クエリ',
        '响应': '応答',
        '过滤': 'フィルター',
        '域名过滤': 'ドメインフィルター',
        '设备过滤': 'デバイスフィルター',
        'DNS服务器过滤': 'DNSサーバーフィルター',
        '类型过滤': 'タイプフィルター',
        '全部': 'すべて',
        '仅查询': 'クエリのみ',
        '仅响应': '応答のみ',
        '搜索': '検索',
        '搜索域名': 'ドメインを検索',
        '搜索设备': 'デバイスを検索',
        '搜索DNS服务器': 'DNSサーバーを検索',
        '清除': 'クリア',
        '上一页': '前へ',
        '下一页': '次へ',
        '第': 'ページ',
        '页，共': '/',
        '共': '合計',
        '条记录': '件の記録',
        '每页显示': 'ページあたり',
        '条': '',
        '总查询数': '総クエリ数',
        '总响应数': '総応答数',
        '有响应查询': '応答ありのクエリ',
        '无响应查询': '応答なしのクエリ',
        '平均响应时间': '平均応答時間',
        '最快响应时间': '最小応答時間',
        '最慢响应时间': '最大応答時間',
        '响应时间': '応答時間',
        '成功率': '成功率',
        '成功': '成功',
        '失败': '失敗',
        '最常查询域名': '最も頻繁にクエリされるドメイン',
        '最常用查询类型': '最も使用されるクエリタイプ',
        '最活跃设备': '最もアクティブなデバイス',
        '最常用DNS服务器': '最も使用されるDNSサーバー',
        '唯一设备数': 'ユニークデバイス数',
        '时间范围': '時間範囲',
        '毫秒': 'ミリ秒',
        '分钟': '分',
        '刷新': '更新',
        '未知设备': '不明なデバイス',
        '成功': '成功',
        '域名未找到': 'ドメインが見つかりません',
        '服务器错误': 'サーバーエラー',
        '格式错误': 'フォーマットエラー',
        '拒绝': '拒否',
        '其他': 'その他',
        '不包含 DoH 和 DoT': 'DoH と DoT は含まれません',
        '总查询数': '総クエリ数',
        '总响应数': '総応答数',
        '有响应查询': '応答ありのクエリ',
        '无响应查询': '応答なしのクエリ',
        '平均响应时间': '平均応答時間',
        '最快响应时间': '最小応答時間',
        '最慢响应时间': '最大応答時間',
        '最新响应时间': '最新応答時間',
        '成功率': '成功率',
        '成功': '成功',
        '失败': '失敗',
        '最常查询域名': '最も頻繁にクエリされるドメイン',
        '最常用查询类型': '最も使用されるクエリタイプ',
        '最活跃设备': '最もアクティブなデバイス',
        '最常用DNS服务器': '最も使用されるDNSサーバー',
        '唯一设备数': 'ユニークデバイス数',
        '时间范围': '時間範囲',
        '响应码分布': '応答コード分布',
        '响应时间百分位': '応答時間パーセンタイル',
        'P50': 'P50',
        'P90': 'P90',
        'P95': 'P95',
        'P99': 'P99'
    },
    'ru': {
        'Bandix DNS 监控': 'Bandix Мониторинг DNS',
        '正在加载数据...': 'Загрузка данных...',
        '无法获取数据': 'Не удалось получить данные',
        'DNS 监控': 'Мониторинг DNS',
        'DNS 查询记录': 'Записи DNS-запросов',
        'DNS 统计信息': 'Статистика DNS',
        'DNS监控未启用': 'Мониторинг DNS отключен',
        '请在设置中启用DNS监控功能': 'Пожалуйста, включите мониторинг DNS в настройках',
        '前往设置': 'Перейти в Настройки',
        '无数据': 'Нет Данных',
        '时间': 'Время',
        '域名': 'Домен',
        '查询类型': 'Тип Запроса',
        '类型': 'Тип',
        '响应码': 'Код Ответа',
        '响应时间': 'Время Ответа',
        '源IP': 'Исходный IP',
        '目标IP': 'IP Назначения',
        '设备': 'Устройство',
        '响应IP': 'IP Ответов',
        '响应结果': 'Результат Ответа',
        'DNS服务器': 'DNS Сервер',
        '查询': 'Запрос',
        '响应': 'Ответ',
        '过滤': 'Фильтр',
        '域名过滤': 'Фильтр Домена',
        '设备过滤': 'Фильтр Устройства',
        'DNS服务器过滤': 'Фильтр DNS Сервера',
        '类型过滤': 'Фильтр Типа',
        '全部': 'Все',
        '仅查询': 'Только Запросы',
        '仅响应': 'Только Ответы',
        '搜索': 'Поиск',
        '搜索域名': 'Поиск Домена',
        '搜索设备': 'Поиск Устройства',
        '搜索DNS服务器': 'Поиск DNS Сервера',
        '清除': 'Очистить',
        '上一页': 'Предыдущая',
        '下一页': 'Следующая',
        '第': 'Страница',
        '页，共': 'из',
        '共': 'Всего',
        '条记录': 'записей',
        '每页显示': 'На Странице',
        '条': '',
        '总查询数': 'Всего Запросов',
        '总响应数': 'Всего Ответов',
        '有响应查询': 'Запросы с Ответом',
        '无响应查询': 'Запросы без Ответа',
        '平均响应时间': 'Среднее Время Ответа',
        '最快响应时间': 'Минимальное Время Ответа',
        '最慢响应时间': 'Максимальное Время Ответа',
        '响应时间': 'Время Ответа',
        '成功率': 'Процент Успеха',
        '成功': 'Успех',
        '失败': 'Неудача',
        '最常查询域名': 'Наиболее Запрашиваемые Домены',
        '最常用查询类型': 'Наиболее Используемые Типы Запросов',
        '最活跃设备': 'Наиболее Активные Устройства',
        '最常用DNS服务器': 'Наиболее Используемые DNS Серверы',
        '唯一设备数': 'Уникальных Устройств',
        '时间范围': 'Временной Диапазон',
        '毫秒': 'мс',
        '分钟': 'минут',
        '刷新': 'Обновить',
        '未知设备': 'Неизвестное Устройство',
        '成功': 'Успех',
        '域名未找到': 'Домен не найден',
        '服务器错误': 'Ошибка сервера',
        '格式错误': 'Ошибка формата',
        '拒绝': 'Отклонено',
        '其他': 'Другое',
        '不包含 DoH 和 DoT': 'Не включает DoH и DoT',
        '总查询数': 'Всего Запросов',
        '总响应数': 'Всего Ответов',
        '有响应查询': 'Запросы с Ответом',
        '无响应查询': 'Запросы без Ответа',
        '平均响应时间': 'Среднее Время Ответа',
        '最快响应时间': 'Минимальное Время Ответа',
        '最慢响应时间': 'Максимальное Время Ответа',
        '最新响应时间': 'Последнее Время Ответа',
        '成功率': 'Процент Успеха',
        '成功': 'Успех',
        '失败': 'Неудача',
        '最常查询域名': 'Наиболее Запрашиваемые Домены',
        '最常用查询类型': 'Наиболее Используемые Типы Запросов',
        '最活跃设备': 'Наиболее Активные Устройства',
        '最常用DNS服务器': 'Наиболее Используемые DNS Серверы',
        '唯一设备数': 'Уникальных Устройств',
        '时间范围': 'Временной Диапазон',
        '响应码分布': 'Распределение Кодов Ответа',
        '响应时间百分位': 'Процентили Времени Ответа',
        'P50': 'P50',
        'P90': 'P90',
        'P95': 'P95',
        'P99': 'P99'
    }
};

function getTranslation(key, language) {
    return translations[language]?.[key] || key;
}

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
    var language = getSystemLanguage();
    if (code === 'Success' || code === 'NOERROR') return getTranslation('成功', language);
    if (code === 'Domain not found' || code === 'NXDomain' || code === 'NXDOMAIN') return getTranslation('域名未找到', language);
    if (code === 'Server error' || code === 'ServFail' || code === 'SERVFAIL') return getTranslation('服务器错误', language);
    if (code === 'Format error' || code === 'FormErr' || code === 'FORMERR') return getTranslation('格式错误', language);
    if (code === 'Refused' || code === 'Refused' || code === 'REFUSED') return getTranslation('拒绝', language);
    return code || getTranslation('其他', language);
}

function formatDeviceName(device) {
    var language = getSystemLanguage();
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
        return getTranslation('未知设备', language);
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
        var language = uci.get('bandix', 'general', 'language');
        if (!language || language === 'auto') {
            language = getSystemLanguage();
        }
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
            E('h1', { 'class': 'bandix-title' }, getTranslation('Bandix DNS 监控', language))
        ]);
        container.appendChild(header);

        if (!dnsEnabled) {
            var alertDiv = E('div', { 'class': 'bandix-alert' }, [
                E('div', {}, [
                    E('strong', {}, getTranslation('DNS监控未启用', language)),
                    E('p', { 'style': 'margin: 4px 0 0 0;' },
                        getTranslation('请在设置中启用DNS监控功能', language))
                ])
            ]);
            container.appendChild(alertDiv);

            var settingsCard = E('div', { 'class': 'cbi-section' }, [
                E('div', { 'style': 'text-align: center; padding: 16px;' }, [
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
            E('span', {}, getTranslation('不包含 DoH 和 DoT', language))
        ]);
        container.appendChild(infoAlert);

        // DNS 统计信息卡片
        var statsGrid = E('div', { 'class': 'stats-grid', 'id': 'dns-stats-grid' });
        container.appendChild(statsGrid);

        // DNS 查询记录
        var queriesSection = E('div', { 'class': 'cbi-section' }, [
            E('h3', {}, getTranslation('DNS 查询记录', language)),
            E('div', {}, [
            E('div', { 'class': 'filter-section' }, [
                E('div', { 'class': 'filter-group' }, [
                    E('label', { 'class': 'filter-label' }, getTranslation('类型过滤', language) + ':'),
                    E('select', { 'class': 'cbi-select', 'id': 'type-filter' }, [
                        E('option', { 'value': '' }, getTranslation('全部', language)),
                        E('option', { 'value': 'true' }, getTranslation('仅查询', language)),
                        E('option', { 'value': 'false' }, getTranslation('仅响应', language))
                    ])
                ]),
                E('div', { 'class': 'filter-group' }, [
                    E('label', { 'class': 'filter-label' }, getTranslation('域名过滤', language) + ':'),
                    E('input', {
                        'type': 'text',
                        'class': 'filter-input',
                        'id': 'domain-filter',
                        'placeholder': getTranslation('搜索域名', language)
                    })
                ]),
                E('div', { 'class': 'filter-group' }, [
                    E('label', { 'class': 'filter-label' }, getTranslation('设备过滤', language) + ':'),
                    E('input', {
                        'type': 'text',
                        'class': 'filter-input',
                        'id': 'device-filter',
                        'placeholder': getTranslation('搜索设备', language)
                    })
                ]),
                E('div', { 'class': 'filter-group' }, [
                    E('label', { 'class': 'filter-label' }, getTranslation('DNS服务器过滤', language) + ':'),
                    E('input', {
                        'type': 'text',
                        'class': 'filter-input',
                        'id': 'dns-server-filter',
                        'placeholder': getTranslation('搜索DNS服务器', language)
                    })
                ]),
                E('div', { 'class': 'filter-group', 'style': 'margin-left: auto;' }, [
                    E('button', {
                        'class': 'cbi-button cbi-button-action',
                        'id': 'refresh-queries-btn'
                    }, getTranslation('刷新', language))
                ])
            ]),
            E('div', { 'id': 'dns-queries-container' }, [
                E('div', { 'class': 'loading-state' }, getTranslation('正在加载数据...', language))
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
                    }, getTranslation('正在加载数据...', language));
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
                    getTranslation('正在加载数据...', language)));
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
                        getTranslation('无法获取数据', language)));
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
                        getTranslation('无数据', language)));
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
                            E('th', { 'style': 'width: 180px;' }, getTranslation('时间', language)),
                            E('th', { 'style': 'width: 200px;' }, getTranslation('域名', language)),
                            E('th', { 'style': 'width: 100px;' }, getTranslation('查询类型', language)),
                            E('th', { 'style': 'width: 100px;' }, getTranslation('类型', language)),
                            E('th', { 'style': 'width: 100px;' }, getTranslation('响应时间', language)),
                            E('th', { 'style': 'width: 200px;' }, getTranslation('设备', language)),
                            E('th', { 'style': 'width: 140px;' }, getTranslation('DNS服务器', language)),
                            E('th', { 'style': 'width: 200px;' }, getTranslation('响应结果', language))
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
                                }, query.is_query ? getTranslation('查询', language) : getTranslation('响应', language))
                            ]),
                            E('td', {}, query.response_time_ms ? query.response_time_ms + ' ' + getTranslation('毫秒', language) : '-'),
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
                        getTranslation('第', language) + ' ' + currentPage + ' ' + getTranslation('页，共', language) + ' ' + totalPages + '，' + getTranslation('共', language) + ' ' + total + ' ' + getTranslation('条记录', language)
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
                        }, getTranslation('上一页', language)),
                        E('button', {
                            'class': 'cbi-button cbi-button-action',
                            'id': 'next-page-btn',
                            'disabled': currentPage >= totalPages ? 'disabled' : null
                        }, getTranslation('下一页', language))
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
                    getTranslation('无法获取数据', language)));
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
                    return startStr + ' - ' + endStr + ' (' + durationMinutes + ' ' + getTranslation('分钟', language) + ')';
                }
                
                // 格式化百分比
                function formatPercent(value) {
                    if (typeof value !== 'number') return '-';
                    return (value * 100).toFixed(2) + '%';
                }
                
                // 总查询数卡片（合并成功率）
                var totalQueriesCard = E('div', { 'class': 'cbi-section' }, [
                    E('div', { 'class': 'stats-card-title' }, getTranslation('总查询数', language)),
                    E('div', { 'class': 'stats-card-main-value' }, (stats.total_queries || 0).toLocaleString()),
                    E('div', { 'class': 'stats-card-details' }, [
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, getTranslation('成功率', language) + ':'),
                            E('span', { 'class': 'stats-detail-value' }, formatPercent(stats.success_rate || 0))
                        ]),
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, getTranslation('成功', language) + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.success_count || 0).toLocaleString())
                        ]),
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, getTranslation('失败', language) + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.failure_count || 0).toLocaleString())
                        ])
                    ])
                ]);
                
                statsGrid.appendChild(totalQueriesCard);
                
                // 响应时间卡片
                statsGrid.appendChild(E('div', { 'class': 'cbi-section' }, [
                    E('div', { 'class': 'stats-card-title' }, getTranslation('响应时间', language)),
                    E('div', { 'class': 'stats-card-main-value' }, (stats.avg_response_time_ms || 0).toFixed(2) + ' ' + getTranslation('毫秒', language)),
                    E('div', { 'class': 'stats-card-details' }, [
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, getTranslation('最快响应时间', language) + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.min_response_time_ms || 0) + ' ' + getTranslation('毫秒', language))
                        ]),
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, getTranslation('最慢响应时间', language) + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.max_response_time_ms || 0) + ' ' + getTranslation('毫秒', language))
                        ]),
                        E('div', { 'class': 'stats-detail-row' }, [
                            E('span', { 'class': 'stats-detail-label' }, getTranslation('最新响应时间', language) + ':'),
                            E('span', { 'class': 'stats-detail-value' }, (stats.latest_response_time_ms || 0) + ' ' + getTranslation('毫秒', language))
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
                        E('div', { 'class': 'stats-card-title' }, getTranslation('最常用查询类型', language)),
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
                        E('div', { 'class': 'stats-card-title' }, getTranslation('最常查询域名', language)),
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
                        E('div', { 'class': 'stats-card-title' }, getTranslation('最活跃设备', language)),
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
                        E('div', { 'class': 'stats-card-title' }, getTranslation('最常用DNS服务器', language)),
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

