'use strict';
'require baseclass';
'require rpc';
'require ui';

var callDeleteDevices = rpc.declare({
	object: 'luci.bandix', method: 'deleteDevices', params: ['macs'], nobatch: true, expect: {}
});

function key(mac) { return String(mac || '').toLowerCase(); }

// Validate per-device results: HTTP success alone does not mean deletion succeeded.
function result(reply, requested) {
	if (!reply || reply.status !== 'success' || !reply.data) {
		var message = reply && (reply.message || reply.error);
		if (message === 'Batch deletion is unavailable. Update the Bandix service.') message = _('Batch deletion is unavailable. Update the Bandix service.');
		throw new Error(message || _('Failed to delete devices'));
	}
	var data = reply.data, remaining = new Set(requested);
	['deleted', 'not_found', 'failed'].forEach(function (field) {
		if (!Array.isArray(data[field])) throw new Error(_('Invalid batch deletion response'));
		data[field].forEach(function (entry) {
			var mac = field === 'failed' ? entry && entry.mac : entry;
			if (typeof mac !== 'string' || !remaining.delete(key(mac))) throw new Error(_('Invalid batch deletion response'));
		});
	});
	if (remaining.size) throw new Error(_('Invalid batch deletion response'));
	return data;
}

return baseclass.extend({
	create: function (options) {
		var selected = new Set(), visible = new Map(), inputs = [], busy = false;
		var writable = options.writable !== false;
		var checkboxStyle = 'appearance:none;-webkit-appearance:none;display:block;position:static;transform:none;flex:0 0 16px;box-sizing:border-box;width:16px;height:16px;margin:0;padding:0;align-self:center';
		var selectAll = E('input', { type: 'checkbox', 'class': 'bandix-device-checkbox', disabled: true, style: checkboxStyle });
		var remove = E('button', {
			type: 'button', 'class': 'cbi-button cbi-button-negative', disabled: true,
			style: 'margin:0;min-height:32px;box-sizing:border-box;align-self:center'
		}, _('Delete selected'));
		var toolbar = E('div', { style: 'display:flex;align-items:center;gap:12px;margin:0;font-size:0.875rem;font-weight:normal;white-space:nowrap' }, [
			E('label', { style: 'display:inline-flex;align-items:center;gap:6px;height:32px;margin:0;padding:0;width:auto;line-height:16px;box-sizing:border-box;white-space:nowrap' }, [
				selectAll, E('span', { style: 'display:block;font-size:13px;line-height:16px;margin:0;padding:0' }, _('Select all'))
			]), remove
		]);
		function sync() {
			selectAll.checked = visible.size > 0 && selected.size === visible.size;
			selectAll.indeterminate = selected.size > 0 && selected.size < visible.size;
			selectAll.disabled = busy || !writable || !visible.size;
			remove.disabled = busy || !writable || !selected.size;
			remove.textContent = _('Delete selected') + (selected.size ? ' (' + selected.size + ')' : '');
			inputs.forEach(function (item) {
				item.input.checked = selected.has(item.mac);
				item.input.disabled = busy || !writable;
			});
		}
		selectAll.addEventListener('change', function () {
			if (busy || !writable) return;
			selected.clear();
			if (selectAll.checked) visible.forEach(function (_, mac) { selected.add(mac); });
			sync();
		});
		remove.addEventListener('click', function () {
			if (busy || !writable || !selected.size) return;
			// Capture what was selected when opening confirmation, even if polling redraws the list.
			var macs = Array.from(selected);
			options.confirm(_('Delete selected'), _('Delete selected devices (%d)? Their traffic history, hostname bindings, rate limits and quotas will also be removed. Online devices may reappear.').format(macs.length), function () {
				if (busy) return;
				busy = true; sync();
				var counts = { deleted: 0, not_found: 0, failed: 0 }, failures = [];
				function report(error) {
					if (!error && !counts.failed) return;
					var text = _('Deleted: %d; not found: %d; failed: %d.').format(counts.deleted, counts.not_found, counts.failed);
					if (failures.length) text += '\n' + failures.join('\n');
					if (error) text = _('Failed to delete devices') + ': ' + (error.message || error) + '\n' + text;
					ui.addNotification(null, E('p', { style: 'white-space:pre-line' }, text), error ? 'error' : 'warning');
				}
				var chain = Promise.resolve();
				// Smaller requests leave time for cleanup within LuCI's RPC timeout.
				for (var offset = 0; offset < macs.length; offset += 50) {
					(function (batch) {
						chain = chain.then(function () {
							return callDeleteDevices(JSON.stringify(batch)).then(function (reply) {
								var data = result(reply, batch);
								['deleted', 'not_found'].forEach(function (field) {
									counts[field] += data[field].length;
									data[field].forEach(function (mac) { selected.delete(key(mac)); });
								});
								counts.failed += data.failed.length;
								data.failed.forEach(function (entry) { failures.push(entry.mac + ': ' + (entry.message || _('Failed to delete device'))); });
							});
						});
					})(macs.slice(offset, offset + 50));
				}
				return chain.then(function () {
					report();
				}).catch(function (error) {
					report(error);
				}).finally(function () {
					busy = false; sync();
					return options.refresh();
				});
			});
		});
		return {
			toolbar: toolbar,
			setDevices: function (devices) {
				visible.clear(); inputs = [];
				devices.forEach(function (device) { if (device.mac) visible.set(key(device.mac), device); });
				// Selection follows the displayed list; hidden devices are never deleted by Select all.
				selected.forEach(function (mac) { if (!visible.has(mac)) selected.delete(mac); });
				sync();
			},
			checkbox: function (device) {
				var mac = key(device.mac);
				var input = E('input', {
					type: 'checkbox', 'class': 'bandix-device-checkbox', 'aria-label': _('Select device') + ': ' + (device.host || device.mac),
					style: checkboxStyle
				});
				// E() stringifies attributes: checked="false" still checks the box.
				// Set boolean DOM properties after creation instead.
				input.checked = selected.has(mac);
				input.disabled = busy || !writable;
				input.addEventListener('click', function (event) { event.stopPropagation(); });
				input.addEventListener('change', function () {
					if (busy || !writable) return;
					if (input.checked) selected.add(mac); else selected.delete(mac);
					sync();
				});
				inputs.push({ mac: mac, input: input });
				return input;
			}
		};
	}
});
