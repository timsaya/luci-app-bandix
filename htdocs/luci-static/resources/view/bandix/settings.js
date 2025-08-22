'use strict';
'require view';
'require form';
'require ui';
'require uci';
'require fs';

const translations = {
	'zh-cn': {
		'Bandix 流量监控设置': 'Bandix 流量监控设置',
		'启用': '启用',
		'启用 Bandix 流量监控服务': '启用 Bandix 流量监控服务',
		'界面语言': '界面语言',
		'选择 Bandix 流量监控的显示语言': '选择 Bandix 流量监控的显示语言',
		'简体中文': '简体中文',
		'繁体中文': '繁体中文',
		'端口': '端口',
		'Bandix 服务监听的端口': 'Bandix 服务监听的端口',
		'监控网卡': '监控网卡',
		'选择要监控流量的物理网络接口': '选择要监控流量的物理网络接口',
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
		'持久化循环周期': '持久化循环周期',
		'设置数据持久化循环周期（秒）': '设置数据持久化循环周期(秒)。修改会删除已有数据。600秒循环周期下, 1 个设备, 固定占用约 60KB'
	},
	'zh-tw': {
		'Bandix 流量监控设置': 'Bandix 流量監控設置',
		'启用': '啟用',
		'启用 Bandix 流量监控服务': '啟用 Bandix 流量監控服務',
		'界面语言': '界面語言',
		'选择 Bandix 流量监控的显示语言': '選擇 Bandix 流量監控的顯示語言',
		'简体中文': '簡體中文',
		'繁体中文': '繁體中文',
		'端口': '端口',
		'Bandix 服务监听的端口': 'Bandix 服務監聽的端口',
		'监控网卡': '監控網卡',
		'选择要监控流量的物理网络接口': '選擇要監控流量的物理網絡接口',
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
		'持久化循环周期': '持久化循環週期',
		'设置数据持久化循环周期（秒）': '設定資料持久化循環週期(秒)。修改會刪除已有資料。600秒循環週期下, 1 個設備, 固定占用約 60KB'
	},
	'en': {
		'Bandix 流量监控设置': 'Bandix Traffic Monitor Settings',
		'启用': 'Enable',
		'启用 Bandix 流量监控服务': 'Enable Bandix Traffic Monitor Service',
		'界面语言': 'Interface Language',
		'选择 Bandix 流量监控的显示语言': 'Select the display language for Bandix Traffic Monitor',
		'简体中文': 'Simplified Chinese',
		'繁体中文': 'Traditional Chinese',
		'端口': 'Port',
		'Bandix 服务监听的端口': 'Port for Bandix service to listen on',
		'监控网卡': 'Monitor Interface',
		'选择要监控流量的物理网络接口': 'Select the physical network interface to monitor traffic',
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
		'持久化循环周期': 'Persistence Interval',
		'设置数据持久化循环周期（秒）': 'Set persistence loop interval (seconds). Changing this will delete existing data. With a 600-second interval, 1 device uses a fixed size of about 60 KB'
	},
	'fr': {
		'Bandix 流量监控设置': 'Paramètres de Surveillance du Trafic Bandix',
		'启用': 'Activer',
		'启用 Bandix 流量监控服务': 'Activer le Service de Surveillance du Trafic Bandix',
		'界面语言': 'Langue de l\'Interface',
		'选择 Bandix 流量监控的显示语言': 'Sélectionner la langue d\'affichage pour le Moniteur de Trafic Bandix',
		'简体中文': 'Chinois Simplifié',
		'繁体中文': 'Chinois Traditionnel',
		'端口': 'Port',
		'Bandix 服务监听的端口': 'Port d\'écoute du service Bandix',
		'监控网卡': 'Interface de Surveillance',
		'选择要监控流量的物理网络接口': 'Sélectionner l\'interface réseau physique à surveiller',
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
		'持久化循环周期': 'Intervalle de persistance',
		'设置数据持久化循环周期（秒）': "Définir l’intervalle de persistance (secondes). La modification supprimera les données existantes. Avec un intervalle de 600 secondes, un appareil occupe environ 60 Ko (taille fixe)"
	},
	'ja': {
		'Bandix 流量监控设置': 'Bandix トラフィックモニター設定',
		'启用': '有効',
		'启用 Bandix 流量监控服务': 'Bandix トラフィックモニターサービスを有効にする',
		'界面语言': 'インターフェース言語',
		'选择 Bandix 流量监控的显示语言': 'Bandix トラフィックモニターの表示言語を選択',
		'简体中文': '簡体字中国語',
		'繁体中文': '繁体字中国語',
		'端口': 'ポート',
		'Bandix 服务监听的端口': 'Bandix サービスのリッスンポート',
		'监控网卡': '監視インターフェース',
		'选择要监控流量的物理网络接口': 'トラフィックを監視する物理ネットワークインターフェースを選択',
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
		'持久化循环周期': '永続化ループ間隔',
		'设置数据持久化循环周期（秒）': 'データ永続化のループ間隔（秒）を設定。この設定を変更すると既存データが削除されます。600 秒のループ間隔では、1 台のデバイスで固定サイズとして約 60 KB を使用します'
	},
	'ru': {
		'Bandix 流量监控设置': 'Настройки Монитора Трафика Bandix',
		'启用': 'Включить',
		'启用 Bandix 流量监控服务': 'Включить Службу Мониторинга Трафика Bandix',
		'界面语言': 'Язык Интерфейса',
		'选择 Bandix 流量监控的显示语言': 'Выберите язык отображения для Монитора Трафика Bandix',
		'简体中文': 'Упрощенный Китайский',
		'繁体中文': 'Традиционный Китайский',
		'端口': 'Порт',
		'Bandix 服务监听的端口': 'Порт прослушивания службы Bandix',
		'监控网卡': 'Интерфейс Мониторинга',
		'选择要监控流量的物理网络接口': 'Выберите физический сетевой интерфейс для мониторинга трафика',
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
		'持久化循环周期': 'Интервал персистенции',
		'设置数据持久化循环周期（秒）': 'Установить интервал цикла персистенции (сек). Изменение этого параметра удалит существующие данные. При интервале 600 секунд одно устройство занимает около 60 КБ (фиксированный размер)'
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

		// Bandix 流量监控设置部分
		s = m.section(form.NamedSection, 'general', 'general', getTranslation('Bandix 流量监控设置', language));
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', getTranslation('启用', language),
			getTranslation('启用 Bandix 流量监控服务', language));
		o.default = '1';
		o.rmempty = false;

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

		// 添加端口设置选项
		o = s.option(form.Value, 'port', getTranslation('端口', language),
			getTranslation('Bandix 服务监听的端口', language));
		o.default = '8686';
		o.datatype = 'port';
		o.placeholder = '8686';
		o.rmempty = false;

		// 添加网卡选择下拉菜单
		o = s.option(form.ListValue, 'interface', getTranslation('监控网卡', language),
			getTranslation('选择要监控流量的物理网络接口', language));
		o.default = 'br-lan';
		o.rmempty = false;

		// 添加常用的物理接口作为备选
		var commonInterfaces = [];
		commonInterfaces.forEach(function (iface) {
			o.value(iface, iface);
		});

		// 添加从配置获取的物理接口
		physicalInterfaces.forEach(function (iface) {
			if (commonInterfaces.indexOf(iface) === -1) {
				o.value(iface, iface);
			}
		});

		// 添加网速单位选择选项
		o = s.option(form.ListValue, 'speed_unit', getTranslation('网速单位', language),
			getTranslation('选择网速显示的单位格式', language));
		o.value('bytes', getTranslation('字节单位 (B/s, KB/s, MB/s)', language));
		o.value('bits', getTranslation('比特单位 (bps, Kbps, Mbps)', language));
		o.default = 'bytes';
		o.rmempty = false;

		// 添加主题选择选项
		o = s.option(form.ListValue, 'theme', getTranslation('界面主题', language),
			getTranslation('选择 Bandix 流量监控的显示主题', language));
		o.value('auto', getTranslation('跟随系统', language));
		o.value('light', getTranslation('明亮模式', language));
		o.value('dark', getTranslation('暗黑模式', language));
		o.default = 'auto';
		o.rmempty = false;

		// 添加持久化循环周期（秒）
		o = s.option(form.Value, 'retention_seconds', getTranslation('持久化循环周期', language),
			getTranslation('设置数据持久化循环周期（秒）', language));
		o.datatype = 'uinteger';
		o.placeholder = '600';
		o.rmempty = true; // 留空则不写入 UCI，由后端决定默认值

		// 添加意见反馈信息
		o = s.option(form.DummyValue, 'feedback_info', getTranslation('意见反馈', language));
		o.href = 'https://github.com/timsaya';
		o.cfgvalue = function() {
			return 'https://github.com/timsaya';
		};

		return m.render();
	}
}); 