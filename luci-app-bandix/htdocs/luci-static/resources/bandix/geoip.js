'use strict';
'require baseclass';
'require rpc';
'require ui';
'require poll';
'require request';

var callStatus = rpc.declare({ object: 'luci.bandix', method: 'getGeoipStatus', expect: {} });
var callManage = rpc.declare({ object: 'luci.bandix', method: 'manageGeoip', params: ['action', 'profile', 'enabled'], expect: {} });

function size(bytes) {
	if (bytes == null) return '—';
	if (bytes < 1024) return bytes + ' B';
	if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KiB';
	return (bytes / 1048576).toFixed(1) + ' MiB';
}
function unwrap(reply) {
	if (!reply || reply.status !== 'success' || !reply.data) throw new Error(reply && (reply.message || reply.error) || _('GeoIP service is unavailable. Enable connection monitoring and apply settings, or update Bandix.'));
	return reply.data;
}
function locale() {
	// Standard LuCI exposes the active language on <html>, not in L.env.
	return (L.env.lang || document.documentElement.lang || 'en').replace(/_/g, '-');
}
function localized(names) {
	var language = locale();
	var key = /^zh/i.test(language) ? 'zh-CN' : language.split('-')[0];
	return names && (names[key] || names.en) || '';
}
function countryName(info) {
	if (info.country_code && typeof Intl !== 'undefined' && Intl.DisplayNames) {
		try { return new Intl.DisplayNames([locale()], { type: 'region' }).of(info.country_code); } catch (e) { /* use database names */ }
	}
	return localized(info.country_names) || info.country_code || '';
}
var scopes = {
	local: _('Local network'), private: _('Private address'), loopback: _('Loopback'),
	link_local: _('Link-local address'), shared: _('Shared address (CGNAT)'),
	multicast: _('Multicast'), unspecified: _('Unspecified address'),
	documentation: _('Documentation address'), reserved: _('Reserved address'), unknown: _('Unknown location')
};
var phases = {
	preparing: _('Checking database version…'), checking_space: _('Checking storage…'),
	downloading: _('Downloading database…'), verifying: _('Verifying database…'),
	activating: _('Loading database…'), importing: _('Importing database…'),
	completed: _('Database ready'), up_to_date: _('Database is up to date'),
	cancelled: _('Download cancelled'), failed: _('Database operation failed')
};

return baseclass.extend({
	describe: function (info) {
		if (!info) return null;
		if (info.scope !== 'public') return { summary: scopes[info.scope] || scopes.unknown, details: scopes[info.scope] || scopes.unknown };
		var country = countryName(info), region = localized(info.region_names), city = localized(info.city_names);
		var location = [country, region, city].filter(function (value, index, all) { return value && all.indexOf(value) === index; }).join(' · ');
		return {
			location: location || scopes.unknown,
			organization: info.organization || '',
			summary: [location, info.organization].filter(Boolean).join(' · ') || scopes.unknown,
			details: [location, info.asn ? 'AS' + info.asn : '', info.organization].filter(Boolean).join('\n')
		};
	},

	render: function () {
		if (this._root) return this._root;
		var root, current = null, pending = false, refreshing = false, dirtyProfile = false;
		var badge = E('strong', {}, _('Loading…'));
		var controlStyle = 'appearance:auto;display:block;position:static;transform:none;flex:0 0 16px;box-sizing:border-box;width:16px;height:16px;margin:0;padding:0;align-self:center;';
		var enabled = E('input', { type: 'checkbox', 'class': 'bandix-geoip-control', style: controlStyle + '-webkit-appearance:checkbox', disabled: true });
		var country = E('input', { type: 'radio', 'class': 'bandix-geoip-control', style: controlStyle + '-webkit-appearance:radio', name: 'bandix-geoip-location', value: 'country', checked: true, disabled: true });
		var city = E('input', { type: 'radio', 'class': 'bandix-geoip-control', style: controlStyle + '-webkit-appearance:radio', name: 'bandix-geoip-location', value: 'city', disabled: true });
		var asn = E('input', { type: 'checkbox', 'class': 'bandix-geoip-control', style: controlStyle + '-webkit-appearance:checkbox', disabled: true, 'aria-label': _('ASN / network organization') });
		var choices = [country, city, asn];
		var selection = E('div', { style: 'font-size:0.9em;margin:8px 0' });
		var installed = E('div', { style: 'margin-bottom:6px' });
		var details = E('div', { style: 'color:var(--text-color-secondary,#888);font-size:0.9em;line-height:1.6;overflow-wrap:anywhere' });
		var message = E('div', { role: 'status', 'aria-live': 'polite', style: 'font-size:0.9em;overflow-wrap:anywhere' });
		var progressFill = E('div', { style: 'width:0%' });
		var progress = E('div', { 'class': 'cbi-progressbar', style: 'display:none;margin:8px 0', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, progressFill);
		var download = E('button', { type: 'button', 'class': 'btn cbi-button cbi-button-apply' }, _('Download and enable'));
		var upload = E('button', { type: 'button', 'class': 'btn cbi-button' }, _('Upload database'));
		var cancel = E('button', { type: 'button', 'class': 'btn cbi-button', style: 'display:none' }, _('Cancel'));
		var remove = E('button', { type: 'button', 'class': 'btn cbi-button cbi-button-negative', style: 'display:none' }, _('Delete'));

		function controlLabel(input, text) {
			return E('label', { style: 'display:inline-flex;align-items:center;gap:6px;min-height:32px;margin:0;padding:0;width:auto;line-height:16px;box-sizing:border-box' }, [
				input, E('span', { style: 'display:block;font-size:13px;line-height:16px;margin:0;padding:0' }, text)
			]);
		}
		function selectedProfile() {
			return (city.checked ? 'city' : 'country') + (asn.checked ? '_asn' : '');
		}
		function setProfile(value) {
			city.checked = value === 'city' || value === 'city_asn';
			country.checked = !city.checked;
			asn.checked = value === 'country_asn' || value === 'city_asn';
		}
		function databaseName(kind) {
			return { country: _('Country/region'), city: _('Country/region + province/city'), asn: _('ASN / network organization') }[kind] || kind;
		}
		function showSelection() {
			selection.textContent = _('Download contents') + ': ' + [databaseName(city.checked ? 'city' : 'country'), asn.checked ? databaseName('asn') : ''].filter(Boolean).join(' + ');
			selection.style.display = current && current.databases && current.databases.length && current.profile !== selectedProfile() ? '' : 'none';
		}
		function display(status) {
			var wasBusy = current && current.job && current.job.busy;
			if (wasBusy && status.job && !status.job.busy && status.job.phase === 'completed') dirtyProfile = false;
			current = status;
			var job = status.job || {}, databases = status.databases || [], busy = pending || job.busy;
			badge.style.color = status.enabled ? 'var(--success-color,#2f9e44)' : '';
			badge.textContent = status.enabled ? _('Enabled') : databases.length ? _('Disabled') : _('Not installed');
			enabled.checked = !!status.enabled; enabled.disabled = busy || !databases.length;
			if (!dirtyProfile && status.profile) setProfile(status.profile);
			if (job.busy && job.profile) setProfile(job.profile);
			choices.forEach(function (input) { input.disabled = busy; });
			showSelection();
			download.disabled = busy; upload.disabled = busy;
			download.textContent = databases.length && status.profile === selectedProfile() ? _('Update database') : _('Download and enable');
			remove.style.display = databases.length || status.load_error ? '' : 'none'; remove.disabled = busy;
			cancel.style.display = job.busy && job.phase !== 'activating' ? '' : 'none'; cancel.disabled = pending;
			installed.textContent = _('Installed databases') + ': ' + (databases.length ? databases.map(function (db) { return databaseName(db.kind); }).join(' + ') : _('Not installed'));
			installed.style.display = databases.length ? '' : 'none';
			var builds = databases.map(function (db) {
				var date = '—';
				if (db.build_epoch) {
					try { date = new Date(db.build_epoch * 1000).toLocaleDateString(locale()); }
					catch (e) { date = new Date(db.build_epoch * 1000).toLocaleDateString(); }
				}
				return databaseName(db.kind) + ': ' + date;
			});
			details.textContent = [
				status.source ? _('Installed data source') + ': ' + status.source : '',
				status.version ? _('Release version') + ': ' + status.version : '',
				builds.length ? _('Database build dates') + ':\n' + builds.join('\n') : '',
				_('Storage used') + ': ' + size(status.installed_bytes) + ' · ' + _('Available space') + ': ' + size(status.free_bytes),
				_('Database directory') + ': ' + status.directory
			].filter(Boolean).join('\n'); details.style.whiteSpace = 'pre-line';
			var total = job.total_bytes;
			var percent = total > 0 ? Math.min(100, Math.floor((job.downloaded_bytes || 0) * 100 / total)) : null;
			progress.style.display = job.busy && total > 0 ? '' : 'none';
			progressFill.style.width = (percent || 0) + '%';
			progress.title = percent == null ? '' : percent + '%';
			if (percent != null) progress.setAttribute('aria-valuenow', percent);
			message.style.color = job.phase === 'failed' || status.load_error ? 'var(--error-color,#c0392b)' : '';
			if (status.load_error && !job.busy) {
				message.textContent = _('The installed database could not be loaded. Download or upload it again.');
				message.title = status.load_error;
			} else if (job.phase === 'failed') {
				var errorMessage = job.error_phase === 'checking_space'
					? _('Cannot prepare storage. Check free space and directory permissions.')
					: job.error_phase === 'verifying'
					? _('Database validation failed. The previous database is unchanged.')
					: _('Database operation failed. Retry or upload a local database.');
				if (job.error_phase === 'checking_space' && status.free_bytes != null && job.required_bytes > status.free_bytes) {
					errorMessage = _('Not enough free space for this database.') + ' ' + _('Required space') + ': ' + size(job.required_bytes) + ' · ' + _('Available space') + ': ' + size(status.free_bytes);
				}
				message.textContent = errorMessage; message.title = job.error || '';
			} else {
				message.textContent = (phases[job.phase] || '') + (job.busy && total > 0 ? ' ' + size(job.downloaded_bytes || 0) + ' / ' + size(total) + ' (' + percent + '%)' : '');
				message.title = job.current_file || '';
			}
		}
		function refresh() {
			if (refreshing || (root && !root.isConnected)) return Promise.resolve();
			refreshing = true;
			return callStatus().then(unwrap).then(display).catch(function (error) {
				message.textContent = _('GeoIP service is unavailable. Enable connection monitoring and apply settings, or update Bandix.');
				message.title = error.message || String(error);
				download.disabled = true; upload.disabled = true; enabled.disabled = true;
				choices.forEach(function (input) { input.disabled = true; });
			}).finally(function () { refreshing = false; });
		}
		function manage(action, selected, checked) {
			pending = true; if (current) display(current);
			return callManage(action, selected || '', checked ? '1' : '0').then(unwrap).then(function (status) {
				if (action === 'download') dirtyProfile = true;
				display(status);
			}).catch(function (error) {
				ui.addNotification(null, E('p', _('Database operation failed') + ': ' + (error.message || error)), 'error');
			}).finally(function () { pending = false; if (current) display(current); });
		}
		choices.forEach(function (input) {
			input.addEventListener('change', function () {
				if (input === country || input === city) {
					country.checked = input === country;
					city.checked = input === city;
				}
				dirtyProfile = true;
				if (current) display(current); else showSelection();
			});
		});
		enabled.addEventListener('change', function () { manage('enable', null, enabled.checked); });
		download.addEventListener('click', function () { manage('download', selectedProfile()); });
		cancel.addEventListener('click', function () { manage('cancel'); });
		remove.addEventListener('click', function () {
			ui.showModal(_('Delete GeoIP databases'), [
				E('p', _('Remove installed databases and disable IP location lookup?')),
				E('div', { 'class': 'right' }, [
					E('button', { type: 'button', 'class': 'btn', click: ui.hideModal }, _('Cancel')), ' ',
					E('button', { type: 'button', 'class': 'btn cbi-button-negative', click: function () { ui.hideModal(); dirtyProfile = false; manage('delete'); } }, _('Delete'))
				])
			]);
		});
		upload.addEventListener('click', function () {
			if (!current) return;
			var limit = typeof current.upload_max_bytes === 'number' ? current.upload_max_bytes : 8 * 1048576;
			var selection = E('input', { type: 'file', accept: '.mmdb', 'aria-label': _('Upload database') });
			var uploadError = E('p', { style: 'color:var(--error-color,#c0392b)', role: 'alert' });
			var uploadAction = E('button', { type: 'button', 'class': 'btn cbi-button-action important', disabled: true }, _('Upload and enable'));
			selection.addEventListener('change', function () {
				var file = selection.files[0];
				uploadAction.disabled = !file || !/\.mmdb$/i.test(file.name) || file.size === 0 || file.size > limit;
				uploadError.textContent = uploadAction.disabled && file ? _('Choose an uncompressed .mmdb file within the upload size limit.') : '';
			});
			uploadAction.addEventListener('click', function () {
				var file = selection.files[0]; if (!file || uploadAction.disabled) return;
				pending = true; display(current);
				var fill = E('div', { style: 'width:0%' });
				var bar = E('div', { 'class': 'cbi-progressbar' }, fill);
				ui.showModal(_('Uploading database…'), [bar]);
				var data = new FormData();
				data.append('sessionid', rpc.getSessionID());
				data.append('filename', '/tmp/bandix-geoip-upload.mmdb');
				data.append('filedata', file);
				request.post(L.env.cgi_base + '/cgi-upload', data, {
					timeout: 0,
					progress: function (event) {
						if (!event.total) return;
						var percent = Math.min(100, Math.round(event.loaded * 100 / event.total));
						fill.style.width = percent + '%'; bar.title = percent + '%';
					}
				}).then(function (response) {
					var reply = response.json();
					if (!response.ok || reply.failure) throw new Error(reply.message || _('Database upload failed'));
					ui.hideModal(); return manage('import');
				}).catch(function (error) {
					ui.hideModal(); ui.addNotification(null, E('p', _('Database upload failed') + ': ' + (error.message || error)), 'error');
				}).finally(function () { pending = false; if (current) display(current); });
			});
			ui.showModal(_('Upload database'), [
				E('p', {}, _('Upload an uncompressed Country, City or ASN .mmdb file. To add ASN, install a Country or City database first.')),
				E('p', {}, _('Maximum upload size') + ': ' + size(limit)), selection, uploadError,
				E('div', { 'class': 'right' }, [E('button', { type: 'button', 'class': 'btn', click: ui.hideModal }, _('Cancel')), ' ', uploadAction])
			]);
		});
		root = E('div', { style: 'max-width:780px' }, [
			E('style', {}, '.bandix-geoip-control::before,.bandix-geoip-control::after{content:none!important;display:none!important}'),
			E('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;gap:16px;margin-bottom:12px' }, [
				controlLabel(enabled, _('Enable IP location lookup')), badge
			]),
			E('fieldset', { style: 'border:1px solid var(--border-color,#aaa);border-radius:6px;padding:12px;margin:0 0 10px' }, [
				E('legend', {}, _('Database contents')),
				E('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;margin-bottom:10px' }, [
					controlLabel(country, _('Country/region')),
					controlLabel(city, _('Country/region + province/city'))
				]),
				controlLabel(asn, _('ASN / network organization')),
				selection
			]),
			E('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px' }, [download, upload, cancel, remove]),
			progress, message,
			E('div', { style: 'font-size:0.85em;opacity:0.75;margin-top:8px' }, [
				_('Data source') + ': ', E('a', { href: 'https://github.com/P3TERX/GeoLite.mmdb/releases/latest', target: '_blank', rel: 'noopener noreferrer' }, 'P3TERX / MaxMind GeoLite2')
			]),
			E('details', { style: 'margin-top:8px' }, [
				E('summary', { style: 'cursor:pointer' }, _('Database details')),
				installed, details,
				E('div', { style: 'font-size:0.85em;margin-top:6px' }, [
					E('a', { href: 'https://www.maxmind.com/en/geolite2/eula', target: '_blank', rel: 'noopener noreferrer' }, _('Data terms'))
				])
			])
		]);
		this._root = root;
		poll.add(refresh, 2);
		// renderWidget returns before LuCI attaches the form to the document.
		setTimeout(refresh, 0);
		return root;
	}
});
