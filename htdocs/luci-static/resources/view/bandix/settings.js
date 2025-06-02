'use strict';
'require view';
'require form';
'require ui';
'require uci';
'require fs';

const translations = {
	'zh-cn': {
		'Bandix流量监控设置': 'Bandix流量监控设置',
		'基本设置': '基本设置',
		'启用': '启用',
		'启用 Bandix 流量监控服务': '启用 Bandix 流量监控服务',
		'界面语言': '界面语言',
		'选择 Bandix 流量监控的显示语言': '选择 Bandix 流量监控的显示语言',
		'简体中文': '简体中文',
		'繁体中文': '繁体中文',
		'端口': '端口',
		'Bandix 服务监听的端口': 'Bandix 服务监听的端口',
		'监控网卡': '监控网卡',
		'选择要监控流量的物理网络接口': '选择要监控流量的物理网络接口'
	},
	'zh-tw': {
		'Bandix流量监控设置': 'Bandix流量監控設置',
		'基本设置': '基本設置',
		'启用': '啟用',
		'启用 Bandix 流量监控服务': '啟用 Bandix 流量監控服務',
		'界面语言': '界面語言',
		'选择 Bandix 流量监控的显示语言': '選擇 Bandix 流量監控的顯示語言',
		'简体中文': '簡體中文',
		'繁体中文': '繁體中文',
		'端口': '端口',
		'Bandix 服务监听的端口': 'Bandix 服務監聽的端口',
		'监控网卡': '監控網卡',
		'选择要监控流量的物理网络接口': '選擇要監控流量的物理網絡接口'
	},
	'en': {
		'Bandix流量监控设置': 'Bandix Traffic Monitor Settings',
		'基本设置': 'Basic Settings',
		'启用': 'Enable',
		'启用 Bandix 流量监控服务': 'Enable Bandix Traffic Monitor Service',
		'界面语言': 'Interface Language',
		'选择 Bandix 流量监控的显示语言': 'Select the display language for Bandix Traffic Monitor',
		'简体中文': 'Simplified Chinese',
		'繁体中文': 'Traditional Chinese',
		'端口': 'Port',
		'Bandix 服务监听的端口': 'Port for Bandix service to listen on',
		'监控网卡': 'Monitor Interface',
		'选择要监控流量的物理网络接口': 'Select the physical network interface to monitor traffic'
	},
	'fr': {
		'Bandix流量监控设置': 'Paramètres du Moniteur de Trafic Bandix',
		'基本设置': 'Paramètres de Base',
		'启用': 'Activer',
		'启用 Bandix 流量监控服务': 'Activer le Service de Surveillance du Trafic Bandix',
		'界面语言': 'Langue de l\'Interface',
		'选择 Bandix 流量监控的显示语言': 'Sélectionner la langue d\'affichage pour le Moniteur de Trafic Bandix',
		'简体中文': 'Chinois Simplifié',
		'繁体中文': 'Chinois Traditionnel',
		'端口': 'Port',
		'Bandix 服务监听的端口': 'Port d\'écoute du service Bandix',
		'监控网卡': 'Interface de Surveillance',
		'选择要监控流量的物理网络接口': 'Sélectionner l\'interface réseau physique à surveiller'
	},
	'ja': {
		'Bandix流量监控设置': 'Bandix トラフィックモニター設定',
		'基本设置': '基本設定',
		'启用': '有効',
		'启用 Bandix 流量监控服务': 'Bandix トラフィックモニターサービスを有効にする',
		'界面语言': 'インターフェース言語',
		'选择 Bandix 流量监控的显示语言': 'Bandix トラフィックモニターの表示言語を選択',
		'简体中文': '簡体字中国語',
		'繁体中文': '繁体字中国語',
		'端口': 'ポート',
		'Bandix 服务监听的端口': 'Bandix サービスのリッスンポート',
		'监控网卡': '監視インターフェース',
		'选择要监控流量的物理网络接口': 'トラフィックを監視する物理ネットワークインターフェースを選択'
	},
	'ru': {
		'Bandix流量监控设置': 'Настройки Монитора Трафика Bandix',
		'基本设置': 'Основные Настройки',
		'启用': 'Включить',
		'启用 Bandix 流量监控服务': 'Включить Службу Мониторинга Трафика Bandix',
		'界面语言': 'Язык Интерфейса',
		'选择 Bandix 流量监控的显示语言': 'Выберите язык отображения для Монитора Трафика Bandix',
		'简体中文': 'Упрощенный Китайский',
		'繁体中文': 'Традиционный Китайский',
		'端口': 'Порт',
		'Bandix 服务监听的端口': 'Порт прослушивания службы Bandix',
		'监控网卡': 'Интерфейс Мониторинга',
		'选择要监控流量的物理网络接口': 'Выберите физический сетевой интерфейс для мониторинга трафика'
	}
};

function getTranslation(key, language) {
	return translations[language]?.[key] || key;
}

// 获取系统语言并返回支持的语言代码
function getSystemLanguage() {
	// 获取系统语言
	var systemLang = document.documentElement.lang || 'en';
	
	// 检查是否支持该语言
	if (translations[systemLang]) {
		return systemLang;
	}
	
	// 如果不支持，返回英语
	return 'en';
}

return view.extend({
	load: function () {
		return Promise.all([
			uci.load('bandix'),
			uci.load('network')
		]);
	},

	render: function (data) {
		var m, s, o;
		var networkConfig = uci.sections('network', 'device');
		var physicalInterfaces = [];
		var language = uci.get('bandix', 'general', 'language') || getSystemLanguage();

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
		m = new form.Map('bandix', getTranslation('Bandix流量监控设置', language),
			_('https://github.com/timsaya'));

		// 基本设置部分
		s = m.section(form.NamedSection, 'general', 'general', getTranslation('基本设置', language));
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', getTranslation('启用', language),
			getTranslation('启用 Bandix 流量监控服务', language));
		o.default = '1';
		o.rmempty = false;

		// 添加语言选择选项
		o = s.option(form.ListValue, 'language', getTranslation('界面语言', language),
			getTranslation('选择 Bandix 流量监控的显示语言', language));
		o.value('zh-cn', getTranslation('简体中文', language));
		o.value('zh-tw', getTranslation('繁体中文', language));
		o.value('en', 'English');
		o.value('fr', 'Français');
		o.value('ja', '日本語');
		o.value('ru', 'Русский');
		o.default = 'zh-cn';
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

		return m.render();
	}
}); 