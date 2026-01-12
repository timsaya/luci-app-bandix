'use strict';
'require view';
'require form';
'require ui';
'require uci';
'require rpc';


// 暗色模式检测已改为使用 CSS 媒体查询 @media (prefers-color-scheme: dark)

// 简单的 Markdown 解析函数
function parseMarkdown(text) {
	if (!text) return '';

	// 转义 HTML 特殊字符
	function escapeHtml(html) {
		var div = document.createElement('div');
		div.textContent = html;
		return div.innerHTML;
	}

	// 先处理代码块（避免其他格式化影响代码）
	var codeBlocks = [];
	var codeBlockIndex = 0;
	text = text.replace(/```([\s\S]*?)```/g, function (match, code) {
		var id = 'CODE_BLOCK_' + codeBlockIndex++;
		codeBlocks.push({
			id: id,
			content: escapeHtml(code.trim())
		});
		return id;
	});

	// 处理行内代码
	text = text.replace(/`([^`]+)`/g, function (match, code) {
		return '<code style="background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.9em;">' + escapeHtml(code) + '</code>';
	});

	// 处理换行（GitHub markdown 使用 \r\n）
	text = text.replace(/\r\n/g, '\n');

	// 处理标题
	text = text.replace(/^### (.*$)/gm, '<h3 style="font-size: 1.1em; font-weight: 600; margin: 12px 0 8px 0;">$1</h3>');
	text = text.replace(/^## (.*$)/gm, '<h2 style="font-size: 1.2em; font-weight: 600; margin: 14px 0 10px 0;">$1</h2>');
	text = text.replace(/^# (.*$)/gm, '<h1 style="font-size: 1.3em; font-weight: 600; margin: 16px 0 12px 0;">$1</h1>');

	// 处理粗体
	text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

	// 处理斜体
	text = text.replace(/\*(.+?)\*/g, function (match, content) {
		// 避免匹配代码块中的 *
		if (match.indexOf('<code') === -1 && match.indexOf('</code>') === -1) {
			return '<em>' + content + '</em>';
		}
		return match;
	});
	text = text.replace(/_(.+?)_/g, function (match, content) {
		// 避免匹配代码块中的 _
		if (match.indexOf('<code') === -1 && match.indexOf('</code>') === -1) {
			return '<em>' + content + '</em>';
		}
		return match;
	});

	// 处理链接
	text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color: #3b82f6; text-decoration: underline;">$1</a>');

	// 处理图片
	text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;" />');

	// 处理无序列表
	var lines = text.split('\n');
	var inList = false;
	var result = [];

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		var listMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);

		if (listMatch) {
			if (!inList) {
				result.push('<ul style="margin: 8px 0; padding-left: 20px;">');
				inList = true;
			}
			result.push('<li style="margin: 4px 0;">' + listMatch[1] + '</li>');
		} else {
			if (inList) {
				result.push('</ul>');
				inList = false;
			}
			result.push(line);
		}
	}
	if (inList) {
		result.push('</ul>');
	}
	text = result.join('\n');

	// 处理有序列表
	lines = text.split('\n');
	inList = false;
	result = [];

	for (i = 0; i < lines.length; i++) {
		line = lines[i];
		var orderedMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);

		if (orderedMatch) {
			if (!inList) {
				result.push('<ol style="margin: 8px 0; padding-left: 20px;">');
				inList = true;
			}
			result.push('<li style="margin: 4px 0;">' + orderedMatch[1] + '</li>');
		} else {
			if (inList) {
				result.push('</ol>');
				inList = false;
			}
			result.push(line);
		}
	}
	if (inList) {
		result.push('</ol>');
	}
	text = result.join('\n');

	// 处理段落（空行分隔）
	text = text.split(/\n\s*\n/).map(function (para) {
		para = para.trim();
		if (para && !para.match(/^<[h|u|o|l|i]/)) {
			return '<p style="margin: 8px 0; line-height: 1.6;">' + para + '</p>';
		}
		return para;
	}).join('\n');

	// 处理单行换行（两个空格或反斜杠结尾）
	text = text.replace(/  \n/g, '<br />\n');
	text = text.replace(/\\\n/g, '<br />\n');

	// 恢复代码块
	for (var j = 0; j < codeBlocks.length; j++) {
		var block = codeBlocks[j];
		text = text.replace(block.id, '<pre style="background: rgba(0,0,0,0.05); padding: 12px; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 0.875rem; margin: 8px 0;"><code>' + block.content + '</code></pre>');
	}

	return text;
}

// 声明 RPC 调用方法
var callClearData = rpc.declare({
	object: 'luci.bandix',
	method: 'clearData',
	expect: {}
});

var callRestartService = rpc.declare({
	object: 'luci.bandix',
	method: 'restartService',
	expect: {}
});

var callGetVersion = rpc.declare({
	object: 'luci.bandix',
	method: 'getVersion',
	expect: {}
});

var callCheckUpdate = rpc.declare({
	object: 'luci.bandix',
	method: 'checkUpdate',
	expect: {}
});

var callInstallUpdate = rpc.declare({
	object: 'luci.bandix',
	method: 'installUpdate',
	params: ['package_type', 'download_url']
});

return view.extend({
	load: function () {
		var self = this;
		return Promise.all([
			uci.load('bandix'),
			uci.load('network'),
			uci.load('luci'),
			uci.load('argon').catch(function () {
				// argon 配置可能不存在，忽略错误
				return null;
			}),
			callGetVersion().then(function (result) {
				// 存储版本信息到 view 实例
				self.versionInfo = result || {};
				return result;
			}).catch(function (err) {
				// 如果获取失败，使用默认值
				self.versionInfo = {
					luci_app_version: _('Unknown'),
					bandix_version: _('Unknown')
				};
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

		// 添加数据目录设置
		o = s.option(form.Value, 'data_dir', _('Data Directory'),
			_('If you change the directory, please manually add it to the backup directory'));
		o.default = '/usr/share/bandix';
		o.datatype = 'string';
		o.placeholder = '/usr/share/bandix';
		o.rmempty = false;

		// 添加版本信息显示（合并显示）
		o = s.option(form.DummyValue, 'version', _('Version'));
		o.cfgvalue = function () {
			var versionInfo = this.map.view.versionInfo || {};
			var luciVersion = versionInfo.luci_app_version || _('Unknown');
			var bandixVersion = versionInfo.bandix_version || _('Unknown');
			return 'luci-app-bandix: ' + luciVersion + ' / bandix: ' + bandixVersion;
		};

		// 添加检查更新按钮
		var checkUpdateOption = s.option(form.Button, 'check_update', _('Check for Updates'));
		checkUpdateOption.inputtitle = _('Check for Updates');
		checkUpdateOption.inputstyle = 'apply';
		checkUpdateOption.onclick = function () {
			var button = this;
			var originalText = button.inputtitle;

			// 显示加载状态
			button.inputtitle = _('Checking...');
			button.disabled = true;

			return callCheckUpdate().then(function (result) {
				// 恢复按钮状态
				button.inputtitle = originalText;
				button.disabled = false;

				if (!result) {
					ui.addNotification(null, E('p', _('Failed to check for updates')), 'error');
					return;
				}

				var messages = [];
				var hasUpdate = false;

				// 显示调试信息（架构、包管理器和资产数量）
				if (result.detected_arch) {
					var debugInfo = E('div', {
						'style': 'font-size: 0.75rem; color: #6b7280; margin-bottom: 12px; padding: 8px; background: rgba(0,0,0,0.02); border-radius: 4px;'
					}, [
						E('div', {}, _('Detected Architecture') + ': ' + result.detected_arch),
						E('div', {}, _('Package Manager') + ': ' + (result.detected_pkg_manager || _('Unknown'))),
						E('div', {}, _('LuCI Assets') + ': ' + (result.luci_asset_count || 0)),
						E('div', {}, _('Bandix Assets') + ': ' + (result.bandix_asset_count || 0))
					]);
					messages.push(debugInfo);
				}

				// 检查 luci-app-bandix 更新
				if (result.luci_has_update === true || result.luci_has_update === '1' || result.luci_has_update === 1) {
					hasUpdate = true;
					var luciContainer = E('div', { 'style': 'margin-bottom: 20px;' });

					var luciMsg = E('p', { 'style': 'font-weight: 600; margin-bottom: 8px;' },
						_('LuCI App has update: ') + (result.current_luci_version || _('Unknown')) +
						' → ' + (result.latest_luci_version || _('Unknown'))
					);
					luciContainer.appendChild(luciMsg);

					// 显示更新日志（解析 Markdown）
					if (result.luci_release_body) {
						var changelogDiv = E('div', {
							'style': 'background: rgba(0,0,0,0.05); padding: 12px; border-radius: 4px; margin: 8px 0; max-height: 300px; overflow-y: auto; font-size: 0.875rem; line-height: 1.6;'
						});
						changelogDiv.innerHTML = parseMarkdown(result.luci_release_body);
						luciContainer.appendChild(changelogDiv);
					}

					// 检查是否有错误（找不到匹配格式的包）
					if (result.luci_error) {
						var errorMsg = E('div', {
							'style': 'background: rgba(239, 68, 68, 0.1); color: #dc2626; padding: 10px; border-radius: 4px; margin: 8px 0; font-size: 0.875rem;'
						}, result.luci_error);
						luciContainer.appendChild(errorMsg);
					}

					// 添加下载安装按钮（只有在有下载链接时才显示）
					if (result.luci_download_url) {
						// 创建状态提示区域
						var statusDiv = E('div', {
							'style': 'margin-top: 8px; padding: 10px; border-radius: 4px; display: none;'
						});
						luciContainer.appendChild(statusDiv);

						var installBtn = E('button', {
							'class': 'btn cbi-button-action',
							'style': 'margin-top: 8px;',
							'click': function () {
								var installButton = this;
								var originalBtnText = installButton.textContent;

								installButton.textContent = _('Installing...');
								installButton.disabled = true;

								// 显示开始安装的提示
								statusDiv.style.display = 'block';
								statusDiv.style.background = 'rgba(59, 130, 246, 0.1)';
								statusDiv.style.color = '#1e40af';
								statusDiv.textContent = _('Starting installation... The page will refresh automatically in 5 seconds.');

								// 对于 luci-app-bandix 安装，由于会重启 uhttpd/rpcd 导致连接断开，
								// 所以不等待响应，直接设置 5 秒后刷新页面
								callInstallUpdate('luci', result.luci_download_url).catch(function (err) {
									// 忽略错误，因为连接可能会断开
									// 即使出错也会刷新页面，让用户看到最新状态
								});

								// 5秒后自动刷新页面
								setTimeout(function () {
									window.location.reload();
								}, 5000);
							}
						}, _('Download and Install'));
						luciContainer.appendChild(installBtn);
					}

					// 添加手动下载链接
					if (result.luci_update_url) {
						var manualLink = E('a', {
							'href': result.luci_update_url,
							'target': '_blank',
							'style': 'display: inline-block; margin-left: 8px; margin-top: 8px;'
						}, _('Manual Download'));
						luciContainer.appendChild(manualLink);
					}

					messages.push(luciContainer);
				} else {
					messages.push(E('p', {}, _('LuCI App is up to date: ') + (result.current_luci_version || result.latest_luci_version || _('Unknown'))));
				}

				// 检查 bandix 更新
				if (result.bandix_has_update === true || result.bandix_has_update === '1' || result.bandix_has_update === 1) {
					hasUpdate = true;
					var bandixContainer = E('div', { 'style': 'margin-bottom: 20px;' });

					var bandixMsg = E('p', { 'style': 'font-weight: 600; margin-bottom: 8px;' },
						_('Bandix has update: ') + (result.current_bandix_version || _('Unknown')) +
						' → ' + (result.latest_bandix_version || _('Unknown'))
					);
					bandixContainer.appendChild(bandixMsg);

					// 显示更新日志（解析 Markdown）
					if (result.bandix_release_body) {
						var changelogDiv = E('div', {
							'style': 'background: rgba(0,0,0,0.05); padding: 12px; border-radius: 4px; margin: 8px 0; max-height: 300px; overflow-y: auto; font-size: 0.875rem; line-height: 1.6;'
						});
						changelogDiv.innerHTML = parseMarkdown(result.bandix_release_body);
						bandixContainer.appendChild(changelogDiv);
					}

					// 检查是否有错误（找不到匹配格式的包）
					if (result.bandix_error) {
						var errorMsg = E('div', {
							'style': 'background: rgba(239, 68, 68, 0.1); color: #dc2626; padding: 10px; border-radius: 4px; margin: 8px 0; font-size: 0.875rem;'
						}, result.bandix_error);
						bandixContainer.appendChild(errorMsg);
					}

					// 添加下载安装按钮（只有在有下载链接时才显示）
					if (result.bandix_download_url) {
						// 创建状态提示区域
						var statusDiv = E('div', {
							'style': 'margin-top: 8px; padding: 10px; border-radius: 4px; display: none;'
						});
						bandixContainer.appendChild(statusDiv);

						var installBtn = E('button', {
							'class': 'btn cbi-button-action',
							'style': 'margin-top: 8px;',
							'click': function () {
								var installButton = this;
								var originalBtnText = installButton.textContent;

								installButton.textContent = _('Installing...');
								installButton.disabled = true;

								// 显示开始安装的提示
								statusDiv.style.display = 'block';
								statusDiv.style.background = 'rgba(59, 130, 246, 0.1)';
								statusDiv.style.color = '#1e40af';
								statusDiv.textContent = _('Starting installation...');

								return callInstallUpdate('bandix', result.bandix_download_url).then(function (installResult) {
									// 判断成功：success 为 true 或 step 为 completed
									var isSuccess = installResult && (
										installResult.success === true ||
										installResult.success === 1 ||
										installResult.success === "true" ||
										installResult.success === "1" ||
										installResult.step === "completed"
									);

									if (isSuccess) {
										installButton.textContent = originalBtnText;
										installButton.disabled = false;
										// 显示成功提示
										var successMsg = _('Bandix updated successfully!');
										if (installResult.message) {
											successMsg = installResult.message;
										}
										if (installResult.restart_exit_code !== undefined) {
											if (installResult.restart_exit_code === 0) {
												successMsg += ' ' + _('Service restarted successfully.');
											} else {
												successMsg += ' ' + _('Service restart may have failed. Please check manually.');
											}
										} else {
											successMsg += ' ' + _('Please restart the service.');
										}
										statusDiv.style.background = 'rgba(34, 197, 94, 0.1)';
										statusDiv.style.color = '#15803d';
										statusDiv.textContent = successMsg + ' ' + _('Page will refresh in 3 seconds.');
										// 3秒后刷新页面
										setTimeout(function () {
											window.location.reload();
										}, 3000);
									} else {
										installButton.textContent = originalBtnText;
										installButton.disabled = false;
										var errorMsg = installResult && installResult.error ? installResult.error : _('Installation failed');
										if (installResult && installResult.step) {
											errorMsg = _('Installation failed at step: ') + installResult.step + '. ' + errorMsg;
										}
										if (installResult && installResult.output) {
											// 截取输出信息的前500个字符，避免提示过长
											var output = installResult.output;
											if (output.length > 500) {
												output = output.substring(0, 500) + '...';
											}
											errorMsg += '\n' + _('Details: ') + output;
										}
										statusDiv.style.background = 'rgba(239, 68, 68, 0.1)';
										statusDiv.style.color = '#dc2626';
										statusDiv.innerHTML = errorMsg.replace(/\n/g, '<br>');
									}
								}).catch(function (err) {
									installButton.textContent = originalBtnText;
									installButton.disabled = false;
									var errorMsg = _('Installation failed: ') + (err.message || err || _('Unknown error'));
									statusDiv.style.background = 'rgba(239, 68, 68, 0.1)';
									statusDiv.style.color = '#dc2626';
									statusDiv.textContent = errorMsg;
								});
							}
						}, _('Download and Install'));
						bandixContainer.appendChild(installBtn);
					}

					// 添加手动下载链接
					if (result.bandix_update_url) {
						var manualLink = E('a', {
							'href': result.bandix_update_url,
							'target': '_blank',
							'style': 'display: inline-block; margin-left: 8px; margin-top: 8px;'
						}, _('Manual Download'));
						bandixContainer.appendChild(manualLink);
					}

					messages.push(bandixContainer);
				} else {
					messages.push(E('p', {}, _('Bandix is up to date: ') + (result.current_bandix_version || result.latest_bandix_version || _('Unknown'))));
				}

				// 显示结果（添加关闭按钮）
				var title = hasUpdate ? _('Updates Available') : _('No Updates Available');

				// 添加红色提示文字（如果有更新）
				if (hasUpdate) {
					var warningMsg = E('div', {
						'style': 'background: rgba(239, 68, 68, 0.1); color: #dc2626; padding: 12px; border-radius: 4px; margin-bottom: 16px; font-weight: 600;'
					}, _('Please clear your browser cache manually after updating.'));
					messages.unshift(warningMsg);
				}

				// 创建弹窗内容，包含关闭按钮
				var modalContent = E('div', {}, messages);

				// 添加关闭按钮
				var closeBtn = E('button', {
					'class': 'btn',
					'style': 'margin-top: 16px;',
					'click': ui.hideModal
				}, _('Close'));

				modalContent.appendChild(closeBtn);

				ui.showModal(title, modalContent);
			}).catch(function (err) {
				// 恢复按钮状态
				button.inputtitle = originalText;
				button.disabled = false;
				ui.addNotification(null, E('p', _('Failed to check for updates: ') + (err.message || err)), 'error');
			});
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


		// 添加意见反馈信息
		o = s.option(form.Button, 'feedback_info', _('Feedback'));
		o.inputtitle = _('Feedback');
		o.inputstyle = 'link';
		o.onclick = function () {
			window.open('https://github.com/timsaya', '_blank');
			return false;
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
		// o = s.option(form.Value, 'offline_timeout', _('Offline Timeout'),
		// 	_('Set the timeout for device offline detection (seconds). Devices inactive for longer than this time will be marked as offline'));
		// o.datatype = 'uinteger';
		// o.placeholder = '120';
		// o.default = '120';
		// o.rmempty = true;

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
		o.value('1800', _('30 minutes'));
		o.default = '600';
		o.rmempty = false;
		o.depends('traffic_persist_history', '1');

		// 添加历史流量周期（秒）
		o = s.option(form.ListValue, 'traffic_retention_seconds', _('Realtime Traffic Period'),
			_('Does not occupy storage space, stored only in memory'));
		o.value('600', _('10 minutes'));
		o.value('900', _('15 minutes'));
		o.value('1800', _('30 minutes'));
		o.value('3600', _('1 hour'));
		o.default = '600';
		o.rmempty = false;

		// 添加流量导出URL选项
		o = s.option(form.Value, 'traffic_export_url', _('Traffic Push URL'),
			_('Push traffic data to a remote HTTP endpoint (POST JSON). Leave empty to disable.'));
		o.datatype = 'string';
		o.placeholder = '';
		o.rmempty = true;

		// 添加设备事件导出URL选项
		o = s.option(form.Value, 'traffic_event_url', _('Device Event Push URL'),
			_('Push device online/offline events to a remote HTTP endpoint (POST JSON on state change). Leave empty to disable.'));
		o.datatype = 'string';
		o.placeholder = '';
		o.rmempty = true;

		// 添加额外子网选项
		o = s.option(form.Value, 'traffic_additional_subnets', _('Additional Subnets'),
			_('Additional local subnets (comma-separated CIDR notation, e.g. \'192.168.2.0/24,10.0.0.0/8\'). Leave empty to use only interface subnet.'));
		o.datatype = 'string';
		o.placeholder = '192.168.2.0/24,10.0.0.0/8';
		o.rmempty = true;

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

		// 将 view 实例关联到 form map，以便在 cfgvalue 中访问
		m.view = this;

		return m.render();
	}
}); 