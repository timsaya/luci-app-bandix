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
        '界面语言': '界面语言',
        '选择 Bandix 流量监控的显示语言': '选择 Bandix 流量监控的显示语言'
    },
    'zh-tw': {
        'Bandix 局域网流量监控': 'Bandix 區域網流量監控',
        '正在加载数据...': '正在載入數據...',
        '无法获取数据': '無法獲取數據',
        '主机名': '主機名',
        'IP地址': 'IP地址',
        'MAC地址': 'MAC地址',
        '下载速度': '下載速度',
        '上传速度': '上傳速度',
        '总下载量': '總下載量',
        '总上传量': '總上傳量',
        '界面语言': '界面語言',
        '选择 Bandix 流量监控的显示语言': '選擇 Bandix 流量監控的顯示語言'
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
        '界面语言': 'Interface Language',
        '选择 Bandix 流量监控的显示语言': 'Select the display language for Bandix Traffic Monitor'
    },
    'fr': {
        'Bandix 局域网流量监控': 'Moniteur de Trafic LAN Bandix',
        '正在加载数据...': 'Chargement des données...',
        '无法获取数据': 'Impossible d\'obtenir les données',
        '主机名': 'Nom d\'hôte',
        'IP地址': 'Adresse IP',
        'MAC地址': 'Adresse MAC',
        '下载速度': 'Vitesse de téléchargement',
        '上传速度': 'Vitesse d\'envoi',
        '总下载量': 'Téléchargement total',
        '总上传量': 'Envoi total',
        '界面语言': 'Langue de l\'interface',
        '选择 Bandix 流量监控的显示语言': 'Sélectionnez la langue d\'affichage pour le moniteur de trafic Bandix'
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
        '界面语言': 'インターフェース言語',
        '选择 Bandix 流量监控的显示语言': 'Bandix トラフィックモニターの表示言語を選択'
    },
    'ru': {
        'Bandix 局域网流量监控': 'Монитор трафика LAN Bandix',
        '正在加载数据...': 'Загрузка данных...',
        '无法获取数据': 'Невозможно получить данные',
        '主机名': 'Имя хоста',
        'IP地址': 'IP-адрес',
        'MAC地址': 'MAC-адрес',
        '下载速度': 'Скорость загрузки',
        '上传速度': 'Скорость отдачи',
        '总下载量': 'Всего загружено',
        '总上传量': 'Всего отдано',
        '界面语言': 'Язык интерфейса',
        '选择 Bandix 流量监控的显示语言': 'Выберите язык отображения для монитора трафика Bandix'
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

// 定义自定义格式化函数
function formatSize(bytes) {
	if (bytes === 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));

	// 保留两位小数
	return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
}

function formatByterate(bytes_per_sec) {
	if (bytes_per_sec === 0) return '0 B/s';

	const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
	const i = Math.floor(Math.log(bytes_per_sec) / Math.log(1024));

	// 保留两位小数
	return parseFloat((bytes_per_sec / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
}

// 定义RPC调用
var callStatus = rpc.declare({
	object: 'luci.bandix',
	method: 'status',
	expect: {}
});

return view.extend({
	// 加载配置和数据
	load: function () {
		return Promise.all([
			uci.load('bandix')
		]);
	},

	// 渲染页面
	render: function (data) {
		var m, s, o;
		// 使用系统语言作为默认值
		var language = uci.get('bandix', 'general', 'language') || getSystemLanguage();

		// 添加主要视图容器
		var view = E('div', {}, [
			E('h2', {}, getTranslation('Bandix 局域网流量监控', language)),
			E('div', { 'class': 'cbi-section' }, [
				E('div', {}, [
					E('div', { id: 'traffic-status' }, [
						E('em', {}, getTranslation('正在加载数据...', language))
					])
				])
			])
		]);

		// 轮询获取数据
		poll.add(function () {
			return callStatus().then(function (result) {
				var trafficDiv = document.getElementById('traffic-status');
				var language = uci.get('bandix', 'general', 'language') || 'en';

				// 处理嵌套的响应格式
				var stats = result;

				if (!stats || !stats.devices) {
					trafficDiv.textContent = getTranslation('无法获取数据', language);
					return;
				}

				// 重新创建表格
				var table = E('div', { 'class': 'table' }, [
					E('div', { 'class': 'tr table-titles' }, [
						E('div', { 'class': 'th' }, getTranslation('主机名', language)),
						E('div', { 'class': 'th' }, getTranslation('IP地址', language)),
						E('div', { 'class': 'th' }, getTranslation('MAC地址', language)),
						E('div', { 'class': 'th' }, getTranslation('下载速度', language)),
						E('div', { 'class': 'th' }, getTranslation('上传速度', language)),
						E('div', { 'class': 'th' }, getTranslation('总下载量', language)),
						E('div', { 'class': 'th' }, getTranslation('总上传量', language))
					])
				]);

				// 填充数据
				stats.devices.forEach(function (device) {
					table.appendChild(E('div', { 'class': 'tr' }, [
						E('div', { 'class': 'td' }, device.hostname || '-'),
						E('div', { 'class': 'td' }, device.ip),
						E('div', { 'class': 'td' }, device.mac || '-'),
						E('div', { 'class': 'td' }, formatByterate(device.rx_rate)),
						E('div', { 'class': 'td' }, formatByterate(device.tx_rate)),
						E('div', { 'class': 'td' }, formatSize(device.rx_bytes)),
						E('div', { 'class': 'td' }, formatSize(device.tx_bytes))
					]));
				});

				// 更新表格内容
				while (trafficDiv.firstChild)
					trafficDiv.removeChild(trafficDiv.firstChild);

				trafficDiv.appendChild(table);
			});
		}, 1);

		return view;
	}
}); 