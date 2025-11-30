'use strict';
'require view';
'require form';
'require ui';
'require uci';
'require rpc';


// 暗色模式检测已改为使用 CSS 媒体查询 @media (prefers-color-scheme: dark)

// 声明 RPC 调用方法
var callClearData = rpc.declare({
	object: 'luci.bandix',
	method: 'clearData',
	expect: { }
});

var callRestartService = rpc.declare({
	object: 'luci.bandix',
	method: 'restartService',
	expect: { }
});

return view.extend({
	load: function () {
		return Promise.all([
			uci.load('bandix'),
			uci.load('network'),
			uci.load('luci'),
			uci.load('argon').catch(function () {
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
		if (!uci.get('bandix', 'dns')) {
			uci.add('bandix', 'dns', 'dns');
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
		s = m.section(form.NamedSection, 'general', 'general', _('Basic Settings'));
		s.description = _('Configure basic parameters for Bandix service');
		s.addremove = false;

		// 添加端口设置选项
		o = s.option(form.Value, 'port', _('Port'),
			_('Port for Bandix service to listen on'));
		o.default = '8686';
		o.datatype = 'port';
		o.placeholder = '8686';
		o.rmempty = false;

		// 添加网卡选择下拉菜单
		o = s.option(form.ListValue, 'iface', _('Monitor Interface'),
			_('Select the LAN network interface to monitor'));
		o.rmempty = false;

		// 添加从配置获取的物理接口
		physicalInterfaces.forEach(function (iface) {
			o.value(iface, iface);
		});

		// 添加日志级别选择选项
		o = s.option(form.ListValue, 'log_level', _('Log Level'),
			_('Set the log level for Bandix service'));
		o.value('trace', 'Trace');
		o.value('debug', 'Debug');
		o.value('info', 'Info');
		o.value('warn', 'Warn');
		o.value('error', 'Error');
		o.default = 'info';
		o.rmempty = false;

		// 添加数据目录设置（只读）
		o = s.option(form.DummyValue, 'data_dir', _('Data Directory'));
		o.default = '/usr/share/bandix';
		o.cfgvalue = function (section_id) {
			return uci.get('bandix', section_id, 'data_dir') || '/usr/share/bandix';
		};

	// 添加意见反馈信息
	o = s.option(form.DummyValue, 'feedback_info', _('Feedback'));
	o.href = 'https://github.com/timsaya';
	o.cfgvalue = function () {
		return 'https://github.com/timsaya';
	};

	// 添加清空数据按钮
	o = s.option(form.Button, 'clear_data', _('Clear Traffic Data'));
	o.inputtitle = _('Clear Traffic Data');
	o.inputstyle = 'reset';
	o.onclick = function () {
		return ui.showModal(_('Clear Traffic Data'), [
			E('p', _('Are you sure you want to clear all traffic data? This action cannot be undone.')),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'btn',
					'click': ui.hideModal
				}, _('Cancel')),
				' ',
				E('button', {
					'class': 'btn cbi-button-negative',
					'click': function () {
						ui.hideModal();
						return callClearData()
							.then(function (result) {
								if (result && !result.success) {
									ui.addNotification(null, E('p', _('Failed to clear traffic data: ') + (result.error || 'Unknown error')), 'error');
								}
							})
							.catch(function (err) {
								ui.addNotification(null, E('p', _('Failed to clear traffic data: ') + err.message), 'error');
							});
					}
				}, _('Confirm'))
			])
		]);
	};

	// 添加重启服务按钮
	o = s.option(form.Button, 'restart_service', _('Restart Service'));
	o.inputtitle = _('Restart Bandix Service');
	o.inputstyle = 'apply';
	o.onclick = function () {
		return ui.showModal(_('Restart Service'), [
			E('p', _('Are you sure you want to restart the Bandix service?')),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'btn',
					'click': ui.hideModal
				}, _('Cancel')),
				' ',
				E('button', {
					'class': 'btn cbi-button-action',
					'click': function () {
						ui.hideModal();
						return callRestartService()
							.then(function (result) {
								if (result && !result.success) {
									ui.addNotification(null, E('p', _('Failed to restart service: ') + (result.error || 'Unknown error')), 'error');
								}
							})
							.catch(function (err) {
								ui.addNotification(null, E('p', _('Failed to restart service: ') + err.message), 'error');
							});
					}
				}, _('Confirm'))
			])
		]);
	};

	// 2. 流量监控设置部分 (traffic)
		s = m.section(form.NamedSection, 'traffic', 'traffic', _('Traffic Monitor Settings'));
		s.description = _('Configure traffic monitoring related parameters');
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Enable Traffic Monitoring'),
			_('Enable Bandix Traffic Monitor Service'));
		o.default = '0';
		o.rmempty = false;

		// 添加网速单位选择选项
		o = s.option(form.ListValue, 'speed_unit', _('Speed Units'),
			_('Select the speed display unit format'));
		o.value('bytes', _('Bytes Units (B/s, KB/s, MB/s)'));
		o.value('bits', _('Bits Units (bps, Kbps, Mbps)'));
		o.default = 'bytes';
		o.rmempty = false;

		// 添加离线超时时间（秒）
		o = s.option(form.Value, 'offline_timeout', _('Offline Timeout'),
			_('Set the timeout for device offline detection (seconds). Devices inactive for longer than this time will be marked as offline'));
		o.datatype = 'uinteger';
		o.placeholder = '600';
		o.default = '600';
		o.rmempty = true;

		// 添加持久化历史数据选项
		o = s.option(form.Flag, 'traffic_persist_history', _('Persist History Data'),
			_('Enable data persistence functionality, data will only be persisted to disk when this option is enabled'));
		o.default = '0';
		o.rmempty = false;


		// 添加数据 flush 间隔（秒）
		o = s.option(form.ListValue, 'traffic_flush_interval_seconds', _('Data Flush Interval'),
			_('Set the interval for flushing data to disk'));
		o.value('60', _('1 minute'));
		o.value('300', _('5 minutes'));
		o.value('600', _('10 minutes'));
		o.value('900', _('15 minutes'));
		o.value('1200', _('20 minutes'));
		o.value('1500', _('25 minutes'));
		o.value('1800', _('30 minutes'));
		o.value('3600', _('1 hour'));
		o.value('7200', _('2 hours'));
		o.default = '600';
		o.rmempty = false;
		o.depends('traffic_persist_history', '1');

		// 添加历史流量周期（秒）
		o = s.option(form.ListValue, 'traffic_retention_seconds', _('Traffic History Period'),
			_('10 minutes interval uses about 60 KB per device'));
		o.value('600', _('10 minutes'));
		o.value('900', _('15 minutes'));
		o.value('1800', _('30 minutes'));
		o.value('3600', _('1 hour'));
		o.default = '600';
		o.rmempty = false;

		// 3. 连接监控设置部分 (connections)
		s = m.section(form.NamedSection, 'connections', 'connections', _('Connection Monitor Settings'));
		s.description = _('Configure connection monitoring related parameters');
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Enable Connection Monitoring'),
			_('Enable Bandix connection monitoring'));
		o.default = '0';
		o.rmempty = false;

		// 4. DNS监控设置部分 (dns)
		s = m.section(form.NamedSection, 'dns', 'dns', _('DNS Monitor Settings'));
		s.description = _('Configure DNS monitoring related parameters');
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Enable DNS Monitoring'),
			_('Enable Bandix DNS monitoring'));
		o.default = '0';
		o.rmempty = false;

		// 添加DNS最大记录数选项
		o = s.option(form.Value, 'dns_max_records', _('DNS Max Records'),
			_('Set the maximum number of DNS query records to keep. Older records will be deleted when this limit is exceeded'));
		o.datatype = 'uinteger';
		o.placeholder = '10000';
		o.default = '10000';
		o.rmempty = false;

		return m.render();
	}
}); 