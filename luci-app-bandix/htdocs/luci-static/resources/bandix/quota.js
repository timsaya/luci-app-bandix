'use strict';
'require baseclass';
'require rpc';

var callSave = rpc.declare({ object: 'luci.bandix', method: 'setTrafficQuotaConfig', params: ['quota'], expect: {} });
var periods = [
	{ key: 'minute', label: _('Minute') }, { key: 'hourly', label: _('Hourly') },
	{ key: 'daily', label: _('Daily') }, { key: 'weekly', label: _('Weekly') },
	{ key: 'monthly', label: _('Monthly') }, { key: 'total', label: _('Lifetime') }
];
var units = [1, 1024, 1048576, 1073741824, 1099511627776];
var unitNames = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];

function modeOf(quota) { return quota && quota.mode === 'directional' ? 'directional' : 'combined'; }
function blockedText(quota) {
	if (!quota || !quota.blocked) return '';
	if (modeOf(quota) === 'combined' || !quota.upload || !quota.download || (quota.upload.blocked && quota.download.blocked)) return _('Upload and download blocked');
	if (quota.upload.blocked) return _('Upload blocked');
	if (quota.download.blocked) return _('Download blocked');
	return _('Quota blocked');
}
function summary(quota, formatSize) {
	if (!quota) return null;
	var groups = modeOf(quota) === 'directional'
		? [{ label: _('Upload'), data: quota.upload || {} }, { label: _('Download'), data: quota.download || {} }]
		: [{ label: _('Combined'), data: quota }];
	return E('div', { 'class': 'traffic-quota-cell', title: blockedText(quota) || _('Traffic Quota') }, groups.map(function (group) {
		var mostUsed = null;
		periods.forEach(function (period) {
			var limit = group.data[period.key + '_bytes'] || 0, used = group.data[period.key + '_used_bytes'] || 0;
			if (limit > 0 && (!mostUsed || used / limit > mostUsed.ratio)) mostUsed = { label: period.label, used: used, limit: limit, ratio: used / limit };
		});
		var text = mostUsed ? mostUsed.label + ': ' + formatSize(mostUsed.used) + ' / ' + formatSize(mostUsed.limit) : _('Unlimited');
		var blocked = group.data.blocked;
		return E('div', { 'class': blocked ? 'traffic-quota-exceeded' : '' },
			group.label + ' · ' + text + (blocked ? ' · ' + _('Blocked') : ''));
	}));
}

return baseclass.extend({
	blockedText: blockedText,
	summary: summary,
	save: function (quota) {
		return callSave(JSON.stringify(quota)).then(function (result) {
			if (!result || result.success !== true) {
				var errors = {
					'Update the Bandix service to configure separate upload and download quotas.': _('Update the Bandix service to configure separate upload and download quotas.'),
					'Failed to connect to Bandix service': _('Failed to connect to Bandix service')
				};
				throw new Error(errors[result && result.error] || _('Failed to save traffic quota'));
			}
			return result;
		});
	},
	create: function (options) {
		var inputs = {}, badges = {}, busy = false, ready = false, supported = false, error = null, current = null;
		var message = E('div', { 'class': 'traffic-quota-message', role: 'status' });
		var combinedState = E('span', { 'class': 'traffic-quota-status unconfigured' });
		var separateOption = E('option', { value: 'directional' }, _('Separate upload / download'));
		var mode = E('select', { 'class': 'cbi-input-select', id: 'traffic-quota-mode' }, [
			E('option', { value: 'combined' }, _('Combined quota')), separateOption
		]);
		mode.value = 'combined';
		var help = E('p', { 'class': 'traffic-quota-help' });
		function changed() { syncDisabled(); if (options.changed) options.changed(); }
		function inputGroup(direction, period) {
			var id = 'traffic-quota-' + direction + '-' + period.key;
			var title = (direction === 'upload' ? _('Upload') : direction === 'download' ? _('Download') : _('Combined')) + ' · ' + period.label;
			var value = E('input', { type: 'number', min: '0', step: 'any', 'class': 'form-input', id: id, 'aria-label': title, placeholder: '0' });
			var unit = E('select', { 'class': 'cbi-input-select', 'aria-label': title + ' · ' + _('Unit') }, units.map(function (size, index) {
				return E('option', { value: String(size) }, unitNames[index]);
			}));
			var usage = E('div', { 'class': 'traffic-quota-period-usage' });
			inputs[direction][period.key] = { value: value, unit: unit, usage: usage };
			value.addEventListener('input', changed); unit.addEventListener('change', changed);
			return E('div', { 'class': 'traffic-quota-period' }, [
				E('label', { 'class': 'form-label', 'for': id }, period.label),
				E('div', { 'class': 'traffic-quota-input-row' }, [value, unit]), usage
			]);
		}
		function fields(direction) {
			inputs[direction] = {};
			return periods.map(function (period) { return inputGroup(direction, period); });
		}
		function directionCard(direction, label) {
			badges[direction] = E('span', { 'class': 'traffic-quota-status unconfigured' });
			return E('section', { 'class': 'traffic-quota-direction traffic-quota-' + direction, 'aria-label': label }, [
				E('div', { 'class': 'traffic-quota-header' }, [E('strong', {}, label), badges[direction]]),
				E('div', {}, fields(direction))
			]);
		}
		var directions = E('div', { 'class': 'traffic-quota-directions' }, [
			directionCard('upload', '↑ ' + _('Upload Quota')), directionCard('download', '↓ ' + _('Download Quota'))
		]);
		var combined = E('section', { 'class': 'traffic-quota-combined' }, [
			E('div', { 'class': 'traffic-quota-header' }, [E('strong', {}, _('Combined quota (upload + download)')), combinedState]),
			E('div', { 'class': 'traffic-quota-grid' }, fields('combined'))
		]);
		var root = E('div', { 'class': 'traffic-quota-form' }, [
			E('div', { 'class': 'form-group' }, [E('label', { 'class': 'form-label', 'for': 'traffic-quota-mode' }, _('Quota mode')), mode]),
			E('p', { 'class': 'traffic-quota-help' }, _('Only the selected mode takes effect. Switching modes preserves usage and clears the other limits when saved.')),
			message, help, combined, directions
		]);
		function fill(input, bytes, period) {
			var unit = bytes > 0 ? 1 : period === 'minute' ? 1048576 : 1073741824;
			for (var i = units.length - 1; bytes > 0 && i >= 0; i--) {
				if (bytes >= units[i] && bytes % units[i] === 0) { unit = units[i]; break; }
			}
			input.unit.value = String(unit);
			input.value.value = String(bytes / unit);
		}
		function canEdit() { return options.writable !== false && ready && !error && !busy; }
		function canSave() { return canEdit() && (mode.value === 'combined' || supported); }
		function syncDisabled() {
			var directional = mode.value === 'directional';
			mode.disabled = !canEdit(); separateOption.disabled = !supported;
			directions.style.display = directional ? '' : 'none';
			combined.style.display = directional ? 'none' : '';
			help.textContent = directional
				? _('WAN upload and download have separate quotas. Only the exhausted direction is blocked. Enter 0 for unlimited.')
				: _('WAN upload and download are counted together. Enter 0 for unlimited.');
			Object.keys(inputs).forEach(function (direction) {
				var active = directional ? direction !== 'combined' : direction === 'combined';
				periods.forEach(function (period) {
					var input = inputs[direction][period.key];
					input.value.disabled = !canSave() || !active; input.unit.disabled = !canSave() || !active;
				});
				var badge = direction === 'combined' ? combinedState : badges[direction];
				var data = current && (direction === 'combined' ? current : current[direction]);
				var pending = current && mode.value !== modeOf(current);
				badge.textContent = error ? _('Unavailable') : !ready ? _('Loading...') : pending ? _('Not saved')
					: !data ? _('Not configured') : data.blocked ? _('Blocked') : _('Active');
				badge.classList.toggle('blocked', !pending && !!(data && data.blocked));
				badge.classList.toggle('unconfigured', !data || !!error || !!pending);
			});
		}
		mode.addEventListener('change', changed);
		return {
			root: root,
			canSave: canSave,
			setBusy: function (value) { busy = value; syncDisabled(); },
			render: function (quota, state) {
				ready = state.ready; supported = state.supported; error = state.error; current = quota;
				if (!state.preserveInputs && !busy) mode.value = modeOf(quota);
				message.textContent = error || (!ready ? _('Loading...') : !supported
					? _('This service supports combined quotas only. Update Bandix to use separate quotas.')
					: !quota ? _('Usage starts when a quota is first saved.') : '');
				message.classList.toggle('traffic-quota-exceeded', !!error);
				Object.keys(inputs).forEach(function (direction) {
					var data = quota && (direction === 'combined' ? quota : quota[direction]);
					periods.forEach(function (period) {
						var input = inputs[direction][period.key];
						var limit = data && data[period.key + '_bytes'] || 0, used = data && data[period.key + '_used_bytes'] || 0;
						if (!state.preserveInputs && !busy) fill(input, limit, period.key);
						input.usage.textContent = data ? _('Used') + ': ' + options.formatSize(used) + ' / ' + (limit > 0 ? options.formatSize(limit) : _('Unlimited')) : '—';
						input.usage.classList.toggle('traffic-quota-exceeded', limit > 0 && used >= limit);
					});
				});
				syncDisabled();
			},
			read: function (mac) {
				var result = { mac: mac, mode: mode.value, upload: {}, download: {} };
				if (!canSave()) throw new Error(_('Failed to save traffic quota'));
				Object.keys(inputs).forEach(function (direction) {
					var target = direction === 'combined' ? result : result[direction];
					var active = mode.value === 'combined' ? direction === 'combined' : direction !== 'combined';
					periods.forEach(function (period) {
						if (!active) { target[period.key + '_bytes'] = 0; return; }
						var input = inputs[direction][period.key], value = Number(input.value.value || 0), unit = Number(input.unit.value);
						var bytes = Math.round(value * unit);
						if ((input.value.validity && input.value.validity.badInput) || !Number.isFinite(value) || value < 0 || units.indexOf(unit) < 0 || !Number.isSafeInteger(bytes)) {
							throw new Error(_('Quota values must be non-negative and within the supported range.'));
						}
						target[period.key + '_bytes'] = bytes;
					});
				});
				return result;
			}
		};
	}
});
