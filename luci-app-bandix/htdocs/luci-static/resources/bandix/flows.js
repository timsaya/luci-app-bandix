'use strict';
'require baseclass';
'require bandix.geoip as geoip';

function normalize(value) {
	return String(value == null ? '' : value).normalize('NFKC').toLowerCase();
}

// Index a loaded page once, including information hidden in tooltips/reply columns.
return baseclass.extend({
	index: function (items, information) {
		information = information || {};
		return items.map(function (flow) {
			var fields = [flow.protocol, flow.state];
			fields.push(Array.isArray(flow.flags) ? flow.flags.join(' ') : flow.flags);
			[flow.orig, flow.repl].forEach(function (direction) {
				if (!direction) return;
				[['src', 'sport'], ['dst', 'dport']].forEach(function (endpoint) {
					var address = direction[endpoint[0]], port = direction[endpoint[1]];
					fields.push(address, port);
					if (address != null && port != null) {
						fields.push(address + ':' + port);
						if (String(address).indexOf(':') >= 0) fields.push('[' + address + ']:' + port);
					}
					var info = information[address];
					if (!info) return;
					fields.push(info.country_code, info.organization, info.asn, info.asn != null ? 'AS' + info.asn : '');
					['country_names', 'region_names', 'city_names'].forEach(function (field) {
						Object.keys(info[field] || {}).forEach(function (language) { fields.push(info[field][language]); });
					});
					var description = geoip.describe(info);
					if (description) fields.push(description.summary, description.details);
				});
			});
			return { flow: flow, text: fields.map(normalize).join('\n') };
		});
	},
	filter: function (index, query) {
		var terms = normalize(query).trim().split(/\s+/).filter(Boolean);
		return index.filter(function (entry) {
			return terms.every(function (term) { return entry.text.indexOf(term) >= 0; });
		}).map(function (entry) { return entry.flow; });
	}
});
