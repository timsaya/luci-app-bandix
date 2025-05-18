'use strict';
'require view';
'require form';
'require ui';
'require uci';
'require rpc';

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('bandix')
		]);
	},

	render: function(data) {
		var m, s, o;

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

		return m.render();
	}
}); 