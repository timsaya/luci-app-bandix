'use strict';
'require view';
'require ui';
'require uci';
'require rpc';
'require poll';

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

		// 创建表格UI元素
		var traffictable = E('div', { 'class': 'table' }, [
			E('div', { 'class': 'tr table-titles' }, [
				E('div', { 'class': 'th' }, _('主机名')),
				E('div', { 'class': 'th' }, _('IP地址')),
				E('div', { 'class': 'th' }, _('MAC地址')),
				E('div', { 'class': 'th' }, _('下载速度')),
				E('div', { 'class': 'th' }, _('上传速度')),
				E('div', { 'class': 'th' }, _('总下载量')),
				E('div', { 'class': 'th' }, _('总上传量'))
			])
		]);

		// 添加主要视图容器
		var view = E('div', {}, [
			E('h2', {}, _('Bandix 局域网流量监控')),
			E('div', { 'class': 'cbi-section-descr' }, [
				E('span', {}, _('GitHub: ')),
				E('a', { 'href': 'https://github.com/timsaya', 'target': '_blank' }, _('https://github.com/timsaya'))
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('div', {}, [
					E('div', { id: 'traffic-status' }, [
						E('em', {}, _('正在加载数据...'))
					])
				])
			])
		]);

		// 轮询获取数据
		poll.add(function () {
			return callStatus().then(function (result) {
				var trafficDiv = document.getElementById('traffic-status');


				// 处理嵌套的响应格式
				var stats = result;

				if (!stats || !stats.devices) {
					trafficDiv.textContent = _('无法获取数据');
					return;
				}

				// 重新创建表格
				var table = E('div', { 'class': 'table' }, [
					E('div', { 'class': 'tr table-titles' }, [
						E('div', { 'class': 'th' }, _('主机名')),
						E('div', { 'class': 'th' }, _('IP地址')),
						E('div', { 'class': 'th' }, _('MAC地址')),
						E('div', { 'class': 'th' }, _('下载速度')),
						E('div', { 'class': 'th' }, _('上传速度')),
						E('div', { 'class': 'th' }, _('总下载量')),
						E('div', { 'class': 'th' }, _('总上传量'))
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