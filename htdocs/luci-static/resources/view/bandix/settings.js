'use strict';
'require view';
'require form';
'require ui';
'require uci';
'require fs';

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('bandix'),
			uci.load('network')
		]);
	},

	render: function(data) {
		var m, s, o;
		var networkConfig = uci.sections('network', 'device');
		var physicalInterfaces = [];
		
		// 从network配置中提取物理接口名称
		if (networkConfig && networkConfig.length > 0) {
			networkConfig.forEach(function(device) {
				if (device.name) {
					physicalInterfaces.push(device.name);
				}
			});
		}
		
		// 添加网络接口配置中的物理接口
		var interfaces = uci.sections('network', 'interface');
		if (interfaces && interfaces.length > 0) {
			interfaces.forEach(function(iface) {
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
		m = new form.Map('bandix', _('Bandix流量监控设置'),
			_('设置和配置 Bandix 流量监控服务'));

		// 基本设置部分
		s = m.section(form.NamedSection, 'general', 'general', _('基本设置'));
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('启用'),
			_('启用 Bandix 流量监控服务'));
		o.default = '1';
		o.rmempty = false;

		// 添加网卡选择下拉菜单
		o = s.option(form.ListValue, 'interface', _('监控网卡'),
			_('选择要监控流量的物理网络接口'));
		o.default = 'br-lan';
		o.rmempty = false;
		
		// 添加常用的物理接口作为备选
		var commonInterfaces = [];
		commonInterfaces.forEach(function(iface) {
			o.value(iface, iface);
		});
		
		// 添加从配置获取的物理接口
		physicalInterfaces.forEach(function(iface) {
			if (commonInterfaces.indexOf(iface) === -1) {
				o.value(iface, iface);
			}
		});

		return m.render();
	}
}); 