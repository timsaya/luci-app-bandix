'use strict';
'require view';
'require form';
'require ui';
'require uci';
'require fs';

const translations = {
	'zh-cn': {
		'基本设置': '基本设置',
		'流量监控设置': '流量监控设置',
		'连接监控设置': '连接监控设置',
		'Bandix 基本配置': 'Bandix 基本配置',
		'配置 Bandix 服务的基本参数': '配置 Bandix 服务的基本参数',
		'Bandix 流量监控配置': 'Bandix 流量监控配置',
		'配置流量监控相关参数': '配置流量监控相关参数',
		'Bandix 连接监控配置': 'Bandix 连接监控配置',
		'配置连接监控相关参数': '配置连接监控相关参数',
		'启用': '启用',
		'启用 Bandix 流量监控服务': '启用 Bandix 流量监控服务',
		'启用流量监控': '启用流量监控',
		'启用连接监控': '启用连接监控',
		'界面语言': '界面语言',
		'选择 Bandix 流量监控的显示语言': '选择 Bandix 流量监控的显示语言',
		'简体中文': '简体中文',
		'繁体中文': '繁体中文',
		'端口': '端口',
		'Bandix 服务监听的端口': 'Bandix 服务监听的端口',
		'监控网卡': '监控网卡',
		'选择要监控的网络接口': '选择要监控的LAN网络接口',
		'网速单位': '网速单位',
		'选择网速显示的单位格式': '选择网速显示的单位格式',
		'字节单位 (B/s, KB/s, MB/s)': '字节单位 (B/s, KB/s, MB/s)',
		'比特单位 (bps, Kbps, Mbps)': '比特单位 (bps, Kbps, Mbps)',
		'界面主题': '界面主题',
		'选择 Bandix 流量监控的显示主题': '选择 Bandix 流量监控的显示主题',
		'跟随系统': '跟随系统',
		'明亮模式': '明亮模式',
		'暗黑模式': '暗黑模式',
		'意见反馈': '意见反馈',
		'离线超时时间': '离线超时时间',
		'设置设备离线判断的超时时间（秒）': '设置设备离线判断的超时时间（秒）。超过此时间未活动的设备将被标记为离线',
		'历史流量周期': '历史流量周期',
		'设置历史流量数据周期': '10分钟下，1个设备固定占用约60KB，修改会清空已有数据。\n由于ubus单次通信限制，无法设置更大的值。',
		'数据 flush 间隔': '数据 flush 间隔',
		'设置数据 flush 间隔': '设置数据写入磁盘的时间间隔',
		'1 分钟': '1 分钟',
		'5 分钟': '5 分钟',
		'10 分钟': '10 分钟',
		'15 分钟': '15 分钟',
		'20 分钟': '20 分钟',
		'25 分钟': '25 分钟',
		'30 分钟': '30 分钟',
		'1 小时': '1 小时',
		'2 小时': '2 小时',
		'数据目录': '数据目录',
		'Bandix 数据存储目录': 'Bandix 数据存储目录',
		'启用 Bandix 连接监控功能': '启用 Bandix 连接监控功能',
		'持久化历史数据': '持久化历史数据',
		'启用数据持久化功能': '启用数据持久化功能，只有启用此选项后才会持久化到磁盘',
		'实时流量持久化': '实时流量持久化',
		'启用实时流量数据持久化': '启用实时流量数据的持久化存储',
		'最近24小时流量持久化': '最近24小时流量持久化',
		'启用最近24小时流量数据持久化': '启用最近24小时流量数据的持久化存储（固定1分钟采样间隔）',
		'最近7天流量持久化': '最近7天流量持久化',
		'启用最近7天流量数据持久化': '启用最近7天流量数据的持久化存储（固定5分钟采样间隔）',
		'最近一月流量持久化': '最近一月流量持久化',
		'启用最近一月流量数据持久化': '启用最近一月流量数据的持久化存储（固定15分钟采样间隔）',
		'最近一年流量持久化': '最近一年流量持久化',
		'启用最近一年流量数据持久化': '启用最近一年流量数据的持久化存储（固定30分钟采样间隔）',
		'实时流量周期': '实时流量周期',
		'设置实时流量数据的采集周期': '设置实时流量数据的采集周期，影响数据精度和存储空间'
	},
	'zh-tw': {
		'基本设置': '基本設置',
		'流量监控设置': '流量監控設置',
		'连接监控设置': '連接監控設置',
		'Bandix 基本配置': 'Bandix 基本配置',
		'配置 Bandix 服务的基本参数': '配置 Bandix 服務的基本參數',
		'Bandix 流量监控配置': 'Bandix 流量監控配置',
		'配置流量监控相关参数': '配置流量監控相關參數',
		'Bandix 连接监控配置': 'Bandix 連接監控配置',
		'配置连接监控相关参数': '配置連接監控相關參數',
		'启用': '啟用',
		'启用 Bandix 流量监控服务': '啟用 Bandix 流量監控服務',
		'启用流量监控': '啟用流量監控',
		'启用连接监控': '啟用連接監控',
		'界面语言': '界面語言',
		'选择 Bandix 流量监控的显示语言': '選擇 Bandix 流量監控的顯示語言',
		'简体中文': '簡體中文',
		'繁体中文': '繁體中文',
		'端口': '端口',
		'Bandix 服务监听的端口': 'Bandix 服務監聽的端口',
		'监控网卡': '監控網卡',
		'选择要监控的网络接口': '選擇要監控的LAN網絡接口',
		'网速单位': '網速單位',
		'选择网速显示的单位格式': '選擇網速顯示的單位格式',
		'字节单位 (B/s, KB/s, MB/s)': '字節單位 (B/s, KB/s, MB/s)',
		'比特单位 (bps, Kbps, Mbps)': '比特單位 (bps, Kbps, Mbps)',
		'界面主题': '介面主題',
		'选择 Bandix 流量监控的显示主题': '選擇 Bandix 流量監控的顯示主題',
		'跟随系统': '跟隨系統',
		'明亮模式': '明亮模式',
		'暗黑模式': '暗黑模式',
		'意见反馈': '意見反饋',
		'离线超时时间': '離線超時時間',
		'设置设备离线判断的超时时间（秒）': '設定設備離線判斷的超時時間（秒）。超過此時間未活動的設備將被標記為離線',
		'历史流量周期': '歷史流量週期',
		'设置历史流量数据周期': '10分鐘下，1個設備固定占用約60KB，修改會清空已有資料。\n由於ubus單次通信限制，無法設置更大的值。',
		'数据 flush 间隔': '資料flush間隔',
		'设置数据 flush 间隔': '設定資料寫入磁碟的時間間隔',
		'1 分钟': '1 分鐘',
		'5 分钟': '5 分鐘',
		'10 分钟': '10 分鐘',
		'15 分钟': '15 分鐘',
		'20 分钟': '20 分鐘',
		'25 分钟': '25 分鐘',
		'30 分钟': '30 分鐘',
		'1 小时': '1 小時',
		'2 小时': '2 小時',
		'数据目录': '數據目錄',
		'Bandix 数据存储目录': 'Bandix 數據存儲目錄',
		'启用 Bandix 连接监控功能': '啟用 Bandix 連接監控功能',
		'持久化历史数据': '持久化歷史數據',
		'启用数据持久化功能': '啟用數據持久化功能，只有啟用此選項後才會持久化到磁碟',
		'实时流量持久化': '實時流量持久化',
		'启用实时流量数据持久化': '啟用實時流量數據的持久化存儲',
		'最近24小时流量持久化': '最近24小時流量持久化',
		'启用最近24小时流量数据持久化': '啟用最近24小時流量數據的持久化存儲（固定1分鐘採樣間隔）',
		'最近7天流量持久化': '最近7天流量持久化',
		'启用最近7天流量数据持久化': '啟用最近7天流量數據的持久化存儲（固定5分鐘採樣間隔）',
		'最近一月流量持久化': '最近一月流量持久化',
		'启用最近一月流量数据持久化': '啟用最近一月流量數據的持久化存儲（固定15分鐘採樣間隔）',
		'最近一年流量持久化': '最近一年流量持久化',
		'启用最近一年流量数据持久化': '啟用最近一年流量數據的持久化存儲（固定30分鐘採樣間隔）',
		'实时流量周期': '實時流量週期',
		'设置实时流量数据的采集周期': '設定實時流量數據的採集週期，影響數據精度和存儲空間'
	},
	'en': {
		'基本设置': 'Basic Settings',
		'流量监控设置': 'Traffic Monitor Settings',
		'连接监控设置': 'Connection Monitor Settings',
		'Bandix 基本配置': 'Bandix Basic Configuration',
		'配置 Bandix 服务的基本参数': 'Configure basic parameters for Bandix service',
		'Bandix 流量监控配置': 'Bandix Traffic Monitor Configuration',
		'配置流量监控相关参数': 'Configure traffic monitoring related parameters',
		'Bandix 连接监控配置': 'Bandix Connection Monitor Configuration',
		'配置连接监控相关参数': 'Configure connection monitoring related parameters',
		'启用': 'Enable',
		'启用 Bandix 流量监控服务': 'Enable Bandix Traffic Monitor Service',
		'启用流量监控': 'Enable Traffic Monitoring',
		'启用连接监控': 'Enable Connection Monitoring',
		'界面语言': 'Interface Language',
		'选择 Bandix 流量监控的显示语言': 'Select the display language for Bandix Traffic Monitor',
		'简体中文': 'Simplified Chinese',
		'繁体中文': 'Traditional Chinese',
		'端口': 'Port',
		'Bandix 服务监听的端口': 'Port for Bandix service to listen on',
		'监控网卡': 'Monitor Interface',
		'选择要监控的网络接口': 'Select the LAN network interface to monitor',
		'网速单位': 'Speed Units',
		'选择网速显示的单位格式': 'Select the speed display unit format',
		'字节单位 (B/s, KB/s, MB/s)': 'Bytes Units (B/s, KB/s, MB/s)',
		'比特单位 (bps, Kbps, Mbps)': 'Bits Units (bps, Kbps, Mbps)',
		'界面主题': 'Interface Theme',
		'选择 Bandix 流量监控的显示主题': 'Select the display theme for Bandix Traffic Monitor',
		'跟随系统': 'Follow System',
		'明亮模式': 'Light Mode',
		'暗黑模式': 'Dark Mode',
		'意见反馈': 'Feedback',
		'离线超时时间': 'Offline Timeout',
		'设置设备离线判断的超时时间（秒）': 'Set the timeout for device offline detection (seconds). Devices inactive for longer than this time will be marked as offline',
		'历史流量周期': 'Traffic History Period',
		'设置历史流量数据周期': 'With 10-minute interval, 1 device uses a fixed size of about 60 KB, changing will clear existing data.\nDue to ubus single communication limit, larger values cannot be set.',
		'数据 flush 间隔': 'Data Flush Interval',
		'设置数据 flush 间隔': 'Set the interval for flushing data to disk',
		'1 分钟': '1 minute',
		'5 分钟': '5 minutes',
		'10 分钟': '10 minutes',
		'15 分钟': '15 minutes',
		'20 分钟': '20 minutes',
		'25 分钟': '25 minutes',
		'30 分钟': '30 minutes',
		'1 小时': '1 hour',
		'2 小时': '2 hours',
		'数据目录': 'Data Directory',
		'Bandix 数据存储目录': 'Bandix data storage directory',
		'启用 Bandix 连接监控功能': 'Enable Bandix connection monitoring',
		'持久化历史数据': 'Persist History Data',
		'启用数据持久化功能': 'Enable data persistence functionality, data will only be persisted to disk when this option is enabled',
		'实时流量持久化': 'Real-time Traffic Persistence',
		'启用实时流量数据持久化': 'Enable real-time traffic data persistence',
		'最近24小时流量持久化': 'Last 24 Hours Traffic Persistence',
		'启用最近24小时流量数据持久化': 'Enable last 24 hours traffic data persistence (fixed 1-minute sampling interval)',
		'最近7天流量持久化': 'Last 7 Days Traffic Persistence',
		'启用最近7天流量数据持久化': 'Enable last 7 days traffic data persistence (fixed 5-minute sampling interval)',
		'最近一月流量持久化': 'Last 30 Days Traffic Persistence',
		'启用最近一月流量数据持久化': 'Enable last 30 days traffic data persistence (fixed 15-minute sampling interval)',
		'最近一年流量持久化': 'Last 365 Days Traffic Persistence',
		'启用最近一年流量数据持久化': 'Enable last 365 days traffic data persistence (fixed 30-minute sampling interval)',
		'实时流量周期': 'Real-time Traffic Cycle',
		'设置实时流量数据的采集周期': 'Set the collection cycle for real-time traffic data, affects data accuracy and storage space'
	},
	'fr': {
		'基本设置': 'Paramètres de Base',
		'流量监控设置': 'Paramètres de Surveillance du Trafic',
		'连接监控设置': 'Paramètres de Surveillance des Connexions',
		'Bandix 基本配置': 'Configuration de Base Bandix',
		'配置 Bandix 服务的基本参数': 'Configurer les paramètres de base du service Bandix',
		'Bandix 流量监控配置': 'Configuration de Surveillance du Trafic Bandix',
		'配置流量监控相关参数': 'Configurer les paramètres liés à la surveillance du trafic',
		'Bandix 连接监控配置': 'Configuration de Surveillance des Connexions Bandix',
		'配置连接监控相关参数': 'Configurer les paramètres liés à la surveillance des connexions',
		'启用': 'Activer',
		'启用 Bandix 流量监控服务': 'Activer le Service de Surveillance du Trafic Bandix',
		'启用流量监控': 'Activer la Surveillance du Trafic',
		'启用连接监控': 'Activer la Surveillance des Connexions',
		'界面语言': 'Langue de l\'Interface',
		'选择 Bandix 流量监控的显示语言': 'Sélectionner la langue d\'affichage pour le Moniteur de Trafic Bandix',
		'简体中文': 'Chinois Simplifié',
		'繁体中文': 'Chinois Traditionnel',
		'端口': 'Port',
		'Bandix 服务监听的端口': 'Port d\'écoute du service Bandix',
		'监控网卡': 'Interface de Surveillance',
		'选择要监控的网络接口': 'Sélectionner l\'interface réseau LAN à surveiller',
		'网速单位': 'Unités de Vitesse',
		'选择网速显示的单位格式': 'Sélectionner le format d\'unité d\'affichage de la vitesse',
		'字节单位 (B/s, KB/s, MB/s)': 'Unités d\'Octets (B/s, KB/s, MB/s)',
		'比特单位 (bps, Kbps, Mbps)': 'Unités de Bits (bps, Kbps, Mbps)',
		'界面主题': 'Thème de l\'Interface',
		'选择 Bandix 流量监控的显示主题': 'Sélectionner le thème d\'affichage pour le Moniteur de Trafic Bandix',
		'跟随系统': 'Suivre le Système',
		'明亮模式': 'Mode Clair',
		'暗黑模式': 'Mode Sombre',
		'意见反馈': 'Commentaires',
		'离线超时时间': 'Délai d\'expiration hors ligne',
		'设置设备离线判断的超时时间（秒）': 'Définir le délai d\'expiration pour la détection hors ligne des appareils (secondes). Les appareils inactifs plus longtemps que cette durée seront marqués comme hors ligne',
		'历史流量周期': 'Période d\'Historique du Trafic',
		'设置历史流量数据周期': "Avec un intervalle de 10 minutes, 1 appareil occupe environ 60 Ko (taille fixe), la modification effacera les données existantes.\nEn raison de la limite de communication unique d'ubus, des valeurs plus importantes ne peuvent pas être définies.",
		'数据 flush 间隔': 'Intervalle de flush',
		'设置数据 flush 间隔': 'Définir l\'intervalle pour effectuer le flush des données sur le disque',
		'1 分钟': '1 minute',
		'5 分钟': '5 minutes',
		'10 分钟': '10 minutes',
		'15 分钟': '15 minutes',
		'20 分钟': '20 minutes',
		'25 分钟': '25 minutes',
		'30 分钟': '30 minutes',
		'1 小时': '1 heure',
		'2 小时': '2 heures',
		'数据目录': 'Répertoire de Données',
		'Bandix 数据存储目录': 'Répertoire de stockage de données Bandix',
		'启用 Bandix 连接监控功能': 'Activer la surveillance des connexions Bandix',
		'持久化历史数据': 'Persister les Données Historiques',
		'启用数据持久化功能': 'Activer la fonctionnalité de persistance des données, les données ne seront persistées sur le disque que lorsque cette option est activée',
		'实时流量持久化': 'Persistance du Trafic en Temps Réel',
		'启用实时流量数据持久化': 'Activer la persistance des données de trafic en temps réel',
		'最近24小时流量持久化': 'Persistance du Trafic des 24 Dernières Heures',
		'启用最近24小时流量数据持久化': 'Activer la persistance des données de trafic des 24 dernières heures (intervalle d\'échantillonnage fixe de 1 minute)',
		'最近7天流量持久化': 'Persistance du Trafic des 7 Derniers Jours',
		'启用最近7天流量数据持久化': 'Activer la persistance des données de trafic des 7 derniers jours (intervalle d\'échantillonnage fixe de 5 minutes)',
		'最近一月流量持久化': 'Persistance du Trafic des 30 Derniers Jours',
		'启用最近一月流量数据持久化': 'Activer la persistance des données de trafic des 30 derniers jours (intervalle d\'échantillonnage fixe de 15 minutes)',
		'最近一年流量持久化': 'Persistance du Trafic des 365 Derniers Jours',
		'启用最近一年流量数据持久化': 'Activer la persistance des données de trafic des 365 derniers jours (intervalle d\'échantillonnage fixe de 30 minutes)',
		'实时流量周期': 'Cycle du Trafic en Temps Réel',
		'设置实时流量数据的采集周期': 'Définir le cycle de collecte des données de trafic en temps réel, affecte la précision des données et l\'espace de stockage'
	},
	'ja': {
		'基本设置': '基本設定',
		'流量监控设置': 'トラフィック監視設定',
		'连接监控设置': '接続監視設定',
		'Bandix 基本配置': 'Bandix 基本設定',
		'配置 Bandix 服务的基本参数': 'Bandix サービスの基本パラメータを設定',
		'Bandix 流量监控配置': 'Bandix トラフィック監視設定',
		'配置流量监控相关参数': 'トラフィック監視関連パラメータを設定',
		'Bandix 连接监控配置': 'Bandix 接続監視設定',
		'配置连接监控相关参数': '接続監視関連パラメータを設定',
		'启用': '有効',
		'启用 Bandix 流量监控服务': 'Bandix トラフィックモニターサービスを有効にする',
		'启用流量监控': 'トラフィック監視を有効にする',
		'启用连接监控': '接続監視を有効にする',
		'界面语言': 'インターフェース言語',
		'选择 Bandix 流量监控的显示语言': 'Bandix トラフィックモニターの表示言語を選択',
		'简体中文': '簡体字中国語',
		'繁体中文': '繁体字中国語',
		'端口': 'ポート',
		'Bandix 服务监听的端口': 'Bandix サービスのリッスンポート',
		'监控网卡': '監視インターフェース',
		'选择要监控的网络接口': '監視するLANネットワークインターフェースを選択',
		'网速单位': '速度単位',
		'选择网速显示的单位格式': '速度表示の単位形式を選択',
		'字节单位 (B/s, KB/s, MB/s)': 'バイト単位 (B/s, KB/s, MB/s)',
		'比特单位 (bps, Kbps, Mbps)': 'ビット単位 (bps, Kbps, Mbps)',
		'界面主题': 'インターフェーステーマ',
		'选择 Bandix 流量监控的显示主题': 'Bandix トラフィックモニターの表示テーマを選択',
		'跟随系统': 'システムに従う',
		'明亮模式': 'ライトモード',
		'暗黑模式': 'ダークモード',
		'意见反馈': 'フィードバック',
		'离线超时时间': 'オフラインタイムアウト',
		'设置设备离线判断的超时时间（秒）': 'デバイスのオフライン検出のタイムアウト時間（秒）を設定。この時間を超えて非アクティブなデバイスはオフラインとしてマークされます',
		'历史流量周期': 'トラフィック履歴期間',
		'设置历史流量数据周期': '10分間隔では、1台のデバイスで固定サイズとして約60KBを使用し、変更すると既存データがクリアされます。\nubusの単一通信制限により、より大きな値を設定することはできません。',
		'数据 flush 间隔': 'データflush間隔',
		'设置数据 flush 间隔': 'データをディスクにflushする間隔を設定',
		'1 分钟': '1 分',
		'5 分钟': '5 分',
		'10 分钟': '10 分',
		'15 分钟': '15 分',
		'20 分钟': '20 分',
		'25 分钟': '25 分',
		'30 分钟': '30 分',
		'1 小时': '1 時間',
		'2 小时': '2 時間',
		'数据目录': 'データディレクトリ',
		'Bandix 数据存储目录': 'Bandix データ保存ディレクトリ',
		'启用 Bandix 连接监控功能': 'Bandix 接続監視機能を有効にする',
		'持久化历史数据': '履歴データの永続化',
		'启用数据持久化功能': 'データ永続化機能を有効にする。このオプションが有効な場合のみ、データがディスクに永続化されます',
		'实时流量持久化': 'リアルタイムトラフィック永続化',
		'启用实时流量数据持久化': 'リアルタイムトラフィックデータの永続化を有効にする',
		'最近24小时流量持久化': '過去24時間トラフィック永続化',
		'启用最近24小时流量数据持久化': '過去24時間トラフィックデータの永続化を有効にする（固定1分サンプリング間隔）',
		'最近7天流量持久化': '過去7日間トラフィック永続化',
		'启用最近7天流量数据持久化': '過去7日間トラフィックデータの永続化を有効にする（固定5分サンプリング間隔）',
		'最近一月流量持久化': '過去30日間トラフィック永続化',
		'启用最近一月流量数据持久化': '過去30日間トラフィックデータの永続化を有効にする（固定15分サンプリング間隔）',
		'最近一年流量持久化': '過去365日間トラフィック永続化',
		'启用最近一年流量数据持久化': '過去365日間トラフィックデータの永続化を有効にする（固定30分サンプリング間隔）',
		'实时流量周期': 'リアルタイムトラフィック周期',
		'设置实时流量数据的采集周期': 'リアルタイムトラフィックデータの収集周期を設定、データ精度とストレージ容量に影響'
	},
	'ru': {
		'基本设置': 'Основные Настройки',
		'流量监控设置': 'Настройки Мониторинга Трафика',
		'连接监控设置': 'Настройки Мониторинга Соединений',
		'Bandix 基本配置': 'Базовая Конфигурация Bandix',
		'配置 Bandix 服务的基本参数': 'Настроить основные параметры службы Bandix',
		'Bandix 流量监控配置': 'Конфигурация Мониторинга Трафика Bandix',
		'配置流量监控相关参数': 'Настроить параметры, связанные с мониторингом трафика',
		'Bandix 连接监控配置': 'Конфигурация Мониторинга Соединений Bandix',
		'配置连接监控相关参数': 'Настроить параметры, связанные с мониторингом соединений',
		'启用': 'Включить',
		'启用 Bandix 流量监控服务': 'Включить Службу Мониторинга Трафика Bandix',
		'启用流量监控': 'Включить Мониторинг Трафика',
		'启用连接监控': 'Включить Мониторинг Соединений',
		'界面语言': 'Язык Интерфейса',
		'选择 Bandix 流量监控的显示语言': 'Выберите язык отображения для Монитора Трафика Bandix',
		'简体中文': 'Упрощенный Китайский',
		'繁体中文': 'Традиционный Китайский',
		'端口': 'Порт',
		'Bandix 服务监听的端口': 'Порт прослушивания службы Bandix',
		'监控网卡': 'Интерфейс Мониторинга',
		'选择要监控的网络接口': 'Выберите сетевой интерфейс LAN для мониторинга',
		'网速单位': 'Единицы Скорости',
		'选择网速显示的单位格式': 'Выберите формат единиц отображения скорости',
		'字节单位 (B/s, KB/s, MB/s)': 'Единицы Байтов (B/s, KB/s, MB/s)',
		'比特单位 (bps, Kbps, Mbps)': 'Единицы Битов (bps, Kbps, Mbps)',
		'界面主题': 'Тема Интерфейса',
		'选择 Bandix 流量监控的显示主题': 'Выберите тему отображения для Монитора Трафика Bandix',
		'跟随系统': 'Следовать Системе',
		'明亮模式': 'Светлый Режим',
		'暗黑模式': 'Темный Режим',
		'意见反馈': 'Обратная связь',
		'离线超时时间': 'Таймаут отключения',
		'设置设备离线判断的超时时间（秒）': 'Установить таймаут для обнаружения отключения устройств (секунды). Устройства, неактивные дольше этого времени, будут помечены как отключенные',
		'历史流量周期': 'Период Истории Трафика',
		'设置历史流量数据周期': 'При интервале 10 минут одно устройство занимает около 60 КБ (фиксированный размер), изменение очистит существующие данные.\nИз-за ограничения единичной связи ubus нельзя установить большие значения.',
		'数据 flush 间隔': 'Интервал flush данных',
		'设置数据 flush 间隔': 'Установить интервал flush данных на диск',
		'1 分钟': '1 минута',
		'5 分钟': '5 минут',
		'10 分钟': '10 минут',
		'15 分钟': '15 минут',
		'20 分钟': '20 минут',
		'25 分钟': '25 минут',
		'30 分钟': '30 минут',
		'1 小时': '1 час',
		'2 小时': '2 часа',
		'数据目录': 'Каталог Данных',
		'Bandix 数据存储目录': 'Каталог хранения данных Bandix',
		'启用 Bandix 连接监控功能': 'Включить мониторинг соединений Bandix',
		'持久化历史数据': 'Персистентность Исторических Данных',
		'启用数据持久化功能': 'Включить функциональность персистентности данных, данные будут сохраняться на диск только при включении этой опции',
		'实时流量持久化': 'Персистентность Трафика в Реальном Времени',
		'启用实时流量数据持久化': 'Включить персистентность данных трафика в реальном времени',
		'最近24小时流量持久化': 'Персистентность Трафика за Последние 24 Часа',
		'启用最近24小时流量数据持久化': 'Включить персистентность данных трафика за последние 24 часа (фиксированный интервал выборки 1 минута)',
		'最近7天流量持久化': 'Персистентность Трафика за Последние 7 Дней',
		'启用最近7天流量数据持久化': 'Включить персистентность данных трафика за последние 7 дней (фиксированный интервал выборки 5 минут)',
		'最近一月流量持久化': 'Персистентность Трафика за Последние 30 Дней',
		'启用最近一月流量数据持久化': 'Включить персистентность данных трафика за последние 30 дней (фиксированный интервал выборки 15 минут)',
		'最近一年流量持久化': 'Персистентность Трафика за Последние 365 Дней',
		'启用最近一年流量数据持久化': 'Включить персистентность данных трафика за последние 365 дней (фиксированный интервал выборки 30 минут)',
		'实时流量周期': 'Цикл Трафика в Реальном Времени',
		'设置实时流量数据的采集周期': 'Установить цикл сбора данных трафика в реальном времени, влияет на точность данных и пространство хранения'
	}
};

function getTranslation(key, language) {
	return translations[language]?.[key] || key;
}

// 获取系统语言并返回支持的语言代码
function getSystemLanguage() {
	// 尝试获取 LuCI 的语言设置
	var luciLang = uci.get('luci', 'main', 'lang');
	
	if (luciLang && translations[luciLang]) {
		return luciLang;
	}
	
	// 如果没有 LuCI 语言设置，尝试获取浏览器语言作为回退
	var systemLang = document.documentElement.lang || 'en';
	
	// 检查是否支持该语言
	if (translations[systemLang]) {
		return systemLang;
	}
	
	// 如果不支持，返回英语
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

return view.extend({
	load: function () {
		return Promise.all([
			uci.load('bandix'),
			uci.load('network'),
			uci.load('luci'),
			uci.load('argon').catch(function() {
				// argon 配置可能不存在，忽略错误
				return null;
			})
		]);
	},

	render: function (data) {
		var m, s, o;
		var networkConfig = uci.sections('network', 'device');
		var physicalInterfaces = [];
		
		// 确保UCI section存在，否则表单不会显示
		if (!uci.get('bandix', 'general')) {
			uci.add('bandix', 'general', 'general');
		}
		if (!uci.get('bandix', 'traffic')) {
			uci.add('bandix', 'traffic', 'traffic');
		}
		if (!uci.get('bandix', 'connections')) {
			uci.add('bandix', 'connections', 'connections');
		}
		
		var language = uci.get('bandix', 'general', 'language');
		if (!language || language === 'auto') {
			language = getSystemLanguage();
		}
		var darkMode = isDarkMode();

		// 添加暗黑模式样式支持
		if (darkMode) {
			var style = E('style', {}, `
				body, .main {
					background-color: #0f172a !important;
					color: #e2e8f0 !important;
				}
				
				.cbi-section {
					background-color: #1E1E1E !important;
					
					border-radius: 8px !important;
				}
				
				.cbi-section h3 {
					color: #f1f5f9 !important;
					background-color: #333333 !important;
					border-bottom: 1px solid #1E1E1E !important;
				}
				
				.cbi-section-descr {
					color: #94a3b8 !important;
				}
				
				.cbi-value {
					border-bottom: 1px solid #1E1E1E !important;
				}
				
				.cbi-value-title {
					color: #e2e8f0 !important;
				}
				
				.cbi-value-description {
					color: #94a3b8 !important;
				}
				
				input[type="text"], input[type="number"], select, textarea {
					background-color: #333333 !important;
					
					color: #e2e8f0 !important;
				}
				
				input[type="text"]:focus, input[type="number"]:focus, select:focus, textarea:focus {
					border-color: #3b82f6 !important;
					box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
				}
				
				input[type="checkbox"] {
					accent-color: #3b82f6 !important;
				}
				
				.cbi-button, .btn {
					background-color: #333333 !important;
					
					color: #e2e8f0 !important;
				}
				
				.cbi-button:hover, .btn:hover {
					background-color: #1E1E1E !important;
				}
				
				.cbi-button-save {
					background-color: #3b82f6 !important;
					border-color: #3b82f6 !important;
					color: white !important;
				}
				
				.cbi-button-save:hover {
					background-color: #2563eb !important;
				}
				
				.cbi-section-error {
					background-color: #7f1d1d !important;
					border-color: #dc2626 !important;
					color: #fca5a5 !important;
				}
				
				/* 表格样式 */
				.table {
					background-color: #1E1E1E !important;
					
				}
				
				.table th {
					background-color: #333333 !important;
					color: #e2e8f0 !important;
					border-bottom: 1px solid #1E1E1E !important;
				}
				
				.table td {
					color: #cbd5e1 !important;
					border-bottom: 1px solid #1E1E1E !important;
				}
				
				.table tr:hover {
					background-color: #1E1E1E !important;
				}
			`);
			document.head.appendChild(style);
		}

		// 从network配置中提取物理接口名称
		if (networkConfig && networkConfig.length > 0) {
			networkConfig.forEach(function (device) {
				if (device.name) {
					physicalInterfaces.push(device.name);
				}
			});
		}

		// 添加网络接口配置中的物理接口
		var interfaces = uci.sections('network', 'interface');
		if (interfaces && interfaces.length > 0) {
			interfaces.forEach(function (iface) {
				if (iface.device && physicalInterfaces.indexOf(iface.device) === -1) {
					physicalInterfaces.push(iface.device);
				}
			});
		}

		// 确保至少有一些默认值
		if (physicalInterfaces.length === 0) {
			physicalInterfaces = [];
		}

		// 创建表单
		m = new form.Map('bandix');

		// 1. 基本设置部分 (general)
		s = m.section(form.NamedSection, 'general', 'general', getTranslation('基本设置', language));
		s.description = getTranslation('配置 Bandix 服务的基本参数', language);
		s.addremove = false;

		// 添加端口设置选项
		o = s.option(form.Value, 'port', getTranslation('端口', language),
			getTranslation('Bandix 服务监听的端口', language));
		o.default = '8686';
		o.datatype = 'port';
		o.placeholder = '8686';
		o.rmempty = false;

	// 添加网卡选择下拉菜单
	o = s.option(form.ListValue, 'iface', getTranslation('监控网卡', language),
		getTranslation('选择要监控的网络接口', language));
	o.rmempty = false;

	// 添加从配置获取的物理接口
	physicalInterfaces.forEach(function (iface) {
		o.value(iface, iface);
	});

		// 添加语言选择选项
		o = s.option(form.ListValue, 'language', getTranslation('界面语言', language),
			getTranslation('选择 Bandix 流量监控的显示语言', language));
		o.value('auto', getTranslation('跟随系统', language));
		o.value('zh-cn', getTranslation('简体中文', language));
		o.value('zh-tw', getTranslation('繁体中文', language));
		o.value('en', 'English');
		o.value('fr', 'Français');
		o.value('ja', '日本語');
		o.value('ru', 'Русский');
		o.default = 'auto';
		o.rmempty = false;

		// 添加主题选择选项
		o = s.option(form.ListValue, 'theme', getTranslation('界面主题', language),
			getTranslation('选择 Bandix 流量监控的显示主题', language));
		o.value('auto', getTranslation('跟随系统', language));
		o.value('light', getTranslation('明亮模式', language));
		o.value('dark', getTranslation('暗黑模式', language));
		o.default = 'auto';
		o.rmempty = false;

		// 添加数据目录设置（只读）
		o = s.option(form.DummyValue, 'data_dir', getTranslation('数据目录', language));
		o.default = '/usr/share/bandix';
		o.cfgvalue = function(section_id) {
			return uci.get('bandix', section_id, 'data_dir') || '/usr/share/bandix';
		};

		// 添加意见反馈信息
		o = s.option(form.DummyValue, 'feedback_info', getTranslation('意见反馈', language));
		o.href = 'https://github.com/timsaya';
		o.cfgvalue = function() {
			return 'https://github.com/timsaya';
		};

		// 2. 流量监控设置部分 (traffic)
		s = m.section(form.NamedSection, 'traffic', 'traffic', getTranslation('流量监控设置', language));
		s.description = getTranslation('配置流量监控相关参数', language);
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', getTranslation('启用流量监控', language),
			getTranslation('启用 Bandix 流量监控服务', language));
		o.default = '0';
		o.rmempty = false;

		// 添加网速单位选择选项
		o = s.option(form.ListValue, 'speed_unit', getTranslation('网速单位', language),
			getTranslation('选择网速显示的单位格式', language));
		o.value('bytes', getTranslation('字节单位 (B/s, KB/s, MB/s)', language));
		o.value('bits', getTranslation('比特单位 (bps, Kbps, Mbps)', language));
		o.default = 'bytes';
		o.rmempty = false;

		// 添加离线超时时间（秒）
		o = s.option(form.Value, 'offline_timeout', getTranslation('离线超时时间', language),
			getTranslation('设置设备离线判断的超时时间（秒）', language));
		o.datatype = 'uinteger';
		o.placeholder = '600';
		o.default = '600';
		o.rmempty = true;

		// 添加主环持久化选项（实时流量）
		o = s.option(form.Flag, 'traffic_persist_main_ring', getTranslation('实时流量持久化', language),
			getTranslation('启用实时流量数据持久化', language));
		o.default = '0';
		o.rmempty = false;

		// 添加实时流量周期设置
		o = s.option(form.ListValue, 'traffic_main_ring_retention_seconds', getTranslation('实时流量周期', language),
		getTranslation('设置实时流量数据的采集周期', language));
		o.value('60', getTranslation('1 分钟', language));
		o.value('300', getTranslation('5 分钟', language));
		o.value('600', getTranslation('10 分钟', language));
		o.value('1200', getTranslation('20 分钟', language));
		o.value('1800', getTranslation('30 分钟', language));
		o.default = '600';
		o.rmempty = false;


		// 添加日环持久化选项（最近24小时）
		o = s.option(form.Flag, 'traffic_persist_day_ring', getTranslation('最近24小时流量持久化', language),
			getTranslation('启用最近24小时流量数据持久化', language));
		o.default = '0';
		o.rmempty = false;

		// 添加周环持久化选项（最近7天）
		o = s.option(form.Flag, 'traffic_persist_week_ring', getTranslation('最近7天流量持久化', language),
			getTranslation('启用最近7天流量数据持久化', language));
		o.default = '0';
		o.rmempty = false;

		// 添加月环持久化选项（最近30天）
		o = s.option(form.Flag, 'traffic_persist_month_ring', getTranslation('最近一月流量持久化', language),
			getTranslation('启用最近一月流量数据持久化', language));
		o.default = '0';
		o.rmempty = false;

		// 添加年环持久化选项（最近365天）
		o = s.option(form.Flag, 'traffic_persist_year_ring', getTranslation('最近一年流量持久化', language),
			getTranslation('启用最近一年流量数据持久化', language));
		o.default = '0';
		o.rmempty = false;


		// 添加数据 flush 间隔（秒）
		o = s.option(form.ListValue, 'traffic_flush_interval_seconds', getTranslation('数据 flush 间隔', language),
			getTranslation('设置数据 flush 间隔', language));
		o.value('60', getTranslation('1 分钟', language));
		o.value('300', getTranslation('5 分钟', language));
		o.value('600', getTranslation('10 分钟', language));
		o.value('900', getTranslation('15 分钟', language));
		o.value('1200', getTranslation('20 分钟', language));
		o.value('1500', getTranslation('25 分钟', language));
		o.value('1800', getTranslation('30 分钟', language));
		o.value('3600', getTranslation('1 小时', language));
		o.value('7200', getTranslation('2 小时', language));
		o.default = '600';
		o.rmempty = false;
		// 当任何持久化选项启用时显示 flush 间隔设置
		o.depends('traffic_persist_main_ring', '1');
		o.depends('traffic_persist_day_ring', '1');
		o.depends('traffic_persist_week_ring', '1');
		o.depends('traffic_persist_month_ring', '1');
		o.depends('traffic_persist_year_ring', '1');


		// 3. 连接监控设置部分 (connections)
		s = m.section(form.NamedSection, 'connections', 'connections', getTranslation('连接监控设置', language));
		s.description = getTranslation('配置连接监控相关参数', language);
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', getTranslation('启用连接监控', language),
			getTranslation('启用 Bandix 连接监控功能', language));
		o.default = '0';
		o.rmempty = false;

		return m.render();
	}
}); 