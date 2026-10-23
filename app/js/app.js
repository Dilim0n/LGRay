/**
 * X-ray Client for LG webOS TV - Main Application Controller
 */

document.addEventListener('DOMContentLoaded', function() {
  var state = {
    running: false,
    pid: null,
    uptimeTimer: null,
    uptimeSeconds: 0,
    config: null,
    activeTab: 'tab-dashboard',
    isPinging: false
  };

  // UI Elements
  var powerBtn = document.getElementById('main-power-btn');
  var heroCard = document.querySelector('.hero-card');
  var powerBtnLabel = document.getElementById('power-btn-label');
  var connStateText = document.getElementById('connection-state-text');
  var sysStatusDot = document.getElementById('system-status-dot');
  var sysStatusText = document.getElementById('system-status-text');

  // Header Elements
  var pageTitle = document.getElementById('page-title');
  var headerNodeFlag = document.getElementById('header-node-flag');
  var headerNodeName = document.getElementById('header-node-name');
  var headerNodePing = document.getElementById('header-node-ping');
  var headerModePill = document.getElementById('header-mode-pill');

  // Dashboard Elements
  var dashNodeFlag = document.getElementById('dash-node-flag');
  var dashNodeName = document.getElementById('dash-node-name');
  var dashNodeFlow = document.getElementById('dash-node-flow');
  var dashNodePing = document.getElementById('dash-node-ping');
  var statLatency = document.getElementById('stat-latency');
  var statMode = document.getElementById('stat-mode');
  var statUptime = document.getElementById('stat-uptime');
  var dashTestConnBtn = document.getElementById('dash-test-conn-btn');
  var dashSwitchServerBtn = document.getElementById('dash-switch-server-btn');

  // Servers Tab Elements
  var serversContainer = document.getElementById('servers-container');
  var serversCountBadge = document.getElementById('servers-count-badge');
  var serversSubStatus = document.getElementById('servers-sub-status');
  var serversCountPill = document.getElementById('servers-count-pill');
  var serversSubName = document.getElementById('servers-sub-name');
  var serversSubExpire = document.getElementById('servers-sub-expire');
  var serversRefreshSubBtn = document.getElementById('servers-refresh-sub-btn');
  var pingAllBtn = document.getElementById('ping-all-btn');

  // Subscriptions Tab Elements
  var subAddUrlInput = document.getElementById('sub-add-url-input');
  var btnAddSub = document.getElementById('btn-add-sub');
  var subsListContainer = document.getElementById('subs-list-container');
  var subsCountBadge = document.getElementById('subs-count-badge');
  var subsCountNavBadge = document.getElementById('subs-count-nav-badge');

  // Settings Elements
  var themeBtnDark = document.getElementById('theme-btn-dark');
  var themeBtnLight = document.getElementById('theme-btn-light');
  var themeBtnOled = document.getElementById('theme-btn-oled');

  var langBtnRu = document.getElementById('lang-btn-ru');
  var langBtnEn = document.getElementById('lang-btn-en');
  var langBtnZh = document.getElementById('lang-btn-zh');

  var settingAutostart = document.getElementById('setting-autostart');
  var settingDisableIpv6 = document.getElementById('setting-disable-ipv6');
  var btnRestartCore = document.getElementById('btn-restart-core');

  var dnsSub = document.getElementById('dns-sub');
  var dnsCloudflare = document.getElementById('dns-cloudflare');
  var dnsGoogle = document.getElementById('dns-google');
  var dnsCustom = document.getElementById('dns-custom');
  var customDnsRow = document.getElementById('setting-custom-dns-row');
  var customDnsInput = document.getElementById('setting-custom-dns');

  var pingModeTcp = document.getElementById('ping-mode-tcp');
  var pingModeHttps = document.getElementById('ping-mode-https');

  var subInterval1 = document.getElementById('sub-interval-1');
  var subInterval3 = document.getElementById('sub-interval-3');
  var subInterval6 = document.getElementById('sub-interval-6');
  var subInterval12 = document.getElementById('sub-interval-12');
  var subInterval24 = document.getElementById('sub-interval-24');
  var subInterval0 = document.getElementById('sub-interval-0');
  var settingAutoupdateHint = document.getElementById('setting-autoupdate-hint');

  // Logs Elements
  var logsTerminal = document.getElementById('logs-terminal');
  var btnRefreshLogs = document.getElementById('btn-refresh-logs');
  var btnClearLogs = document.getElementById('btn-clear-logs');
  var logsInterval = null;

  function showToast(msg) {
    var toast = document.getElementById('toast-message');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() {
      toast.classList.remove('show');
    }, 3200);
  }

  function getActiveNode() {
    if (!state.config || !state.config.nodes || state.config.nodes.length === 0) return null;
    for (var i = 0; i < state.config.nodes.length; i++) {
      if (state.config.nodes[i].id === state.config.activeNodeId) {
        return state.config.nodes[i];
      }
    }
    return state.config.nodes[0] || null;
  }

  function getActiveSubscription() {
    if (!state.config || !state.config.subscriptions || state.config.subscriptions.length === 0) return null;
    var active = state.config.subscriptions.find(function(s) { return s.active; });
    return active || state.config.subscriptions[0];
  }

  function updateActiveNodeUI() {
    var node = getActiveNode();
    var t = window.I18n ? window.I18n.t : function(k) { return k; };

    if (!node) {
      headerNodeFlag.textContent = '--';
      headerNodeName.textContent = t('no_server_selected');
      headerNodePing.textContent = '-- ms';
      dashNodeFlag.textContent = '--';
      dashNodeName.textContent = t('no_server_selected');
      dashNodeFlow.textContent = '--';
      dashNodePing.textContent = '-- ms';
      statLatency.textContent = '-- ms';
      return;
    }

    var pingStr = (node.ping ? (node.ping + ' ms') : '-- ms');
    var flag = node.country || 'VPN';

    headerNodeFlag.textContent = flag;
    headerNodeName.textContent = node.name;
    headerNodePing.textContent = pingStr;

    dashNodeFlag.textContent = flag;
    dashNodeName.textContent = node.name;
    dashNodeFlow.textContent = node.flow || 'Vision';
    dashNodePing.textContent = pingStr;
    statLatency.textContent = pingStr;

    var modeKey = 'mode_' + (state.config ? (state.config.routeMode || 'bypass_ru') : 'bypass_ru');
    var modeStr = t(modeKey);
    headerModePill.textContent = modeStr;
    statMode.textContent = modeStr;
  }

  function renderServersTabHeader() {
    if (!state.config) return;
    var t = window.I18n ? window.I18n.t : function(k) { return k; };
    var activeSub = getActiveSubscription();
    var nodes = state.config.nodes || [];

    if (activeSub) {
      serversSubName.textContent = activeSub.name;
      serversSubStatus.textContent = t('sub_status_active');
      serversSubStatus.className = 'sub-status-pill active';
      serversSubExpire.textContent = activeSub.expire || '--.--.----';
    } else {
      serversSubName.textContent = t('no_active_sub');
      serversSubStatus.textContent = t('sub_status_inactive');
      serversSubStatus.className = 'sub-status-pill inactive';
      serversSubExpire.textContent = '--.--.----';
    }

    var pluralText = window.I18n ? window.I18n.formatPluralNodes(nodes.length) : (nodes.length + ' узлов');
    serversCountPill.textContent = pluralText;
    serversCountBadge.textContent = nodes.length;
  }

  function renderServersList() {
    if (!state.config) return;
    serversContainer.innerHTML = '';
    var nodes = state.config.nodes || [];
    var t = window.I18n ? window.I18n.t : function(k) { return k; };

    renderServersTabHeader();

    if (nodes.length === 0) {
      var emptyEl = document.createElement('div');
      emptyEl.className = 'empty-servers-placeholder';
      emptyEl.innerHTML = [
        '<div class="placeholder-icon">',
          '<svg viewBox="0 0 24 24" class="svg-icon-large"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
        '</div>',
        '<h3>' + t('empty_servers_title') + '</h3>',
        '<p>' + t('empty_servers_desc') + '</p>',
        '<button class="btn btn-primary" id="btn-goto-subs" tabindex="0" data-nav="servers">',
          '<span>' + t('btn_goto_subs') + '</span>',
        '</button>'
      ].join('');
      serversContainer.appendChild(emptyEl);

      var gotoBtn = document.getElementById('btn-goto-subs');
      if (gotoBtn) {
        gotoBtn.addEventListener('click', function() {
          switchTab('tab-subs', true);
        });
      }
      return;
    }

    nodes.forEach(function(node) {
      var isActive = node.id === state.config.activeNodeId;
      var card = document.createElement('div');
      card.className = 'server-item-card' + (isActive ? ' active' : '');
      card.setAttribute('data-nav', 'servers');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-id', node.id);

      var pingMs = node.ping || 0;
      var pingText = pingMs > 0 ? (pingMs + ' ms') : '-- ms';
      var pingClass = pingMs > 0 ? (pingMs < 80 ? '' : (pingMs < 180 ? 'medium' : 'high')) : '';

      card.innerHTML = [
        '<div class="server-flag country-badge">' + (node.country || 'VPN') + '</div>',
        '<div class="server-details">',
          '<div class="server-name">' + node.name + '</div>',
          '<div class="server-address">' + node.address + ':' + (node.port || 443) + '</div>',
        '</div>',
        '<div class="server-meta">',
          '<span class="badge badge-cyan">' + (node.protocol ? node.protocol.toUpperCase() : 'VLESS') + '</span>',
          '<span class="server-ping-pill ' + pingClass + '" id="ping-pill-' + node.id + '">' + pingText + '</span>',
          '<div class="server-radio"></div>',
        '</div>'
      ].join('');

      card.addEventListener('click', function() {
        selectServer(node.id);
      });

      serversContainer.appendChild(card);
    });

    if (window.SpatialNav) {
      window.SpatialNav.scan();
    }
  }

  function selectServer(nodeId) {
    if (!state.config) return;
    state.config.activeNodeId = nodeId;
    updateActiveNodeUI();
    renderServersList();

    var node = getActiveNode();
    var t = window.I18n ? window.I18n.t : function(k) { return k; };
    showToast(t('toast_server_selected') + (node ? node.name : ''));

    XrayBridge.saveConfig(state.config);

    if (state.running) {
      showToast(t('toast_tunnel_switched') + (node ? node.name : ''));
      XrayBridge.start(state.config, function() {
        checkStatus();
      });
    }
  }

  // Subscriptions Tab Management
  function renderSubscriptionsTab() {
    if (!state.config) return;
    var subs = state.config.subscriptions || [];
    var t = window.I18n ? window.I18n.t : function(k) { return k; };

    subsCountBadge.textContent = subs.length;
    subsCountNavBadge.textContent = subs.length;
    subsListContainer.innerHTML = '';

    if (subs.length === 0) {
      var emptyBox = document.createElement('div');
      emptyBox.className = 'empty-servers-placeholder';
      emptyBox.style.margin = '10px 0';
      emptyBox.innerHTML = [
        '<div class="placeholder-icon">',
          '<svg viewBox="0 0 24 24" class="svg-icon-large"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
        '</div>',
        '<h3>' + t('no_subs_placeholder_title') + '</h3>',
        '<p>' + t('no_subs_placeholder_desc') + '</p>'
      ].join('');
      subsListContainer.appendChild(emptyBox);
      return;
    }

    subs.forEach(function(sub) {
      var card = document.createElement('div');
      card.className = 'sub-item-card' + (sub.active ? ' active-sub' : '');
      card.setAttribute('data-id', sub.id);

      var nodeCount = sub.totalNodes || (sub.nodes ? sub.nodes.length : 0);
      var nodesStr = window.I18n ? window.I18n.formatPluralNodes(nodeCount) : (nodeCount + ' узлов');

      // Shorten URL for clean display
      var cleanUrl = sub.url || '';
      var shortUrl = cleanUrl.length > 50 ? (cleanUrl.substring(0, 48) + '...') : cleanUrl;

      var updatedStr = '--.--.----';
      if (sub.updatedAt) {
        var d = new Date(sub.updatedAt);
        updatedStr = (d.getDate() < 10 ? '0' : '') + d.getDate() + '.' +
                     ((d.getMonth() + 1) < 10 ? '0' : '') + (d.getMonth() + 1) + '.' +
                     d.getFullYear();
      }

      card.innerHTML = [
        '<div class="sub-item-header">',
          '<div class="sub-item-title-wrap">',
            '<h4 class="sub-item-name">' + sub.name + '</h4>',
            '<span class="sub-status-pill ' + (sub.active ? 'active' : 'inactive') + '">' + (sub.active ? t('sub_badge_active') : t('sub_badge_inactive')) + '</span>',
          '</div>',
          '<span class="badge badge-purple">' + nodesStr + '</span>',
        '</div>',
        '<div class="sub-item-details-row">',
          '<span class="sub-item-url">' + shortUrl + '</span>',
          '<span>' + t('sub_updated') + ' <strong>' + updatedStr + '</strong></span>',
          (sub.expire ? ('<span>' + t('sub_expires') + ' <strong class="text-cyan">' + sub.expire + '</strong></span>') : ''),
        '</div>',
        '<div class="sub-item-actions">',
          (!sub.active ? ('<button class="btn btn-secondary btn-sub-action btn-activate-sub" data-id="' + sub.id + '" data-nav="subs" tabindex="0">' + t('btn_make_active') + '</button>') : ''),
          '<button class="btn btn-secondary btn-sub-action btn-refresh-sub-item" data-id="' + sub.id + '" data-nav="subs" tabindex="0">',
            '<svg viewBox="0 0 24 24" class="btn-svg" style="width:14px;height:14px;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
            '<span>' + t('btn_refresh_single') + '</span>',
          '</button>',
          '<button class="btn btn-danger btn-sub-action btn-delete-sub" data-id="' + sub.id + '" data-nav="subs" tabindex="0">',
            '<svg viewBox="0 0 24 24" class="btn-svg" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
            '<span>' + t('btn_delete_sub') + '</span>',
          '</button>',
        '</div>'
      ].join('');

      subsListContainer.appendChild(card);
    });

    // Attach actions
    subsListContainer.querySelectorAll('.btn-activate-sub').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var subId = btn.getAttribute('data-id');
        activateSubscription(subId);
      });
    });

    subsListContainer.querySelectorAll('.btn-refresh-sub-item').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var subId = btn.getAttribute('data-id');
        refreshSingleSubscription(subId, btn);
      });
    });

    subsListContainer.querySelectorAll('.btn-delete-sub').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var subId = btn.getAttribute('data-id');
        deleteSubscription(subId);
      });
    });

    if (window.SpatialNav) {
      window.SpatialNav.scan();
    }
  }

  function activateSubscription(subId) {
    var t = window.I18n ? window.I18n.t : function(k) { return k; };
    XrayBridge.activateSubscription(subId, function(res) {
      if (res && res.success) {
        state.config = res.config;
        showToast(t('sub_activated_toast') + res.subscription.name);
        renderSubscriptionsTab();
        updateActiveNodeUI();
        renderServersList();

        if (state.running) {
          XrayBridge.start(state.config, function() {
            checkStatus();
          });
        }
      } else {
        showToast('Ошибка активации подписки');
      }
    });
  }

  function refreshSingleSubscription(subId, btnEl) {
    var t = window.I18n ? window.I18n.t : function(k) { return k; };
    if (btnEl) btnEl.disabled = true;
    showToast(t('toast_refreshing_sub'));

    XrayBridge.updateSubscriptionById(subId, function(res) {
      if (btnEl) btnEl.disabled = false;
      if (res && res.success) {
        showToast(t('toast_sub_refreshed') + res.count);
        XrayBridge.getConfig(function(cfg) {
          state.config = cfg;
          renderSubscriptionsTab();
          renderServersList();
          updateActiveNodeUI();
        });
      } else {
        showToast('Ошибка: ' + (res.error || 'Не удалось обновить'));
      }
    });
  }

  function deleteSubscription(subId) {
    var t = window.I18n ? window.I18n.t : function(k) { return k; };
    XrayBridge.deleteSubscription(subId, function(res) {
      if (res && res.success) {
        state.config = res.config;
        showToast(t('sub_deleted_toast'));
        renderSubscriptionsTab();
        renderServersList();
        updateActiveNodeUI();

        if (state.running) {
          if (state.config.nodes.length > 0) {
            XrayBridge.start(state.config, function() { checkStatus(); });
          } else {
            XrayBridge.stop(function() { checkStatus(); });
          }
        }
      }
    });
  }

  // Add Subscription Handler
  btnAddSub.addEventListener('click', function() {
    var url = subAddUrlInput.value.trim();
    if (!url) {
      showToast('Введите URL подписки');
      return;
    }
    btnAddSub.disabled = true;
    showToast('Загрузка подписки...');

    XrayBridge.addSubscription(url, function(res) {
      btnAddSub.disabled = false;
      if (res.error) {
        showToast('Ошибка: ' + res.error);
      } else {
        var t = window.I18n ? window.I18n.t : function(k) { return k; };
        showToast(t('sub_added_toast') + (res.subscription ? res.subscription.name : ''));
        subAddUrlInput.value = '';
        state.config = res.config;
        renderSubscriptionsTab();
        renderServersList();
        updateActiveNodeUI();
      }
    });
  });

  // Refresh Active Subscription from Servers Header
  serversRefreshSubBtn.addEventListener('click', function() {
    var activeSub = getActiveSubscription();
    if (!activeSub) {
      showToast('Нет активной подписки. Добавьте её в разделе «Подписки».');
      switchTab('tab-subs', true);
      return;
    }
    refreshSingleSubscription(activeSub.id, serversRefreshSubBtn);
  });

  function renderRoutingTab() {
    var currentMode = (state.config && state.config.routeMode) || 'bypass_ru';
    var cards = document.querySelectorAll('.routing-card');
    cards.forEach(function(card) {
      var mode = card.getAttribute('data-mode');
      if (mode === currentMode) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }

      card.onclick = function() {
        cards.forEach(function(c) { c.classList.remove('active'); });
        card.classList.add('active');
        state.config.routeMode = mode;
        updateActiveNodeUI();
        XrayBridge.saveConfig(state.config);
        showToast('Режим изменен: ' + card.querySelector('.routing-title').textContent);

        if (state.running) {
          XrayBridge.start(state.config, function() {
            showToast('Правила маршрутизации обновлены');
          });
        }
      };
    });
  }

  function startUptimeCounter() {
    stopUptimeCounter();
    var startTime = parseInt(localStorage.getItem('lgray_connect_time'), 10);
    if (!startTime || isNaN(startTime)) {
      startTime = Date.now();
      localStorage.setItem('lgray_connect_time', startTime.toString());
    }
    state.connectStartTime = startTime;
    function tick() {
      var diffSec = Math.max(0, Math.floor((Date.now() - state.connectStartTime) / 1000));
      var hrs = Math.floor(diffSec / 3600);
      var mins = Math.floor((diffSec % 3600) / 60);
      var secs = diffSec % 60;
      statUptime.textContent = 
        (hrs < 10 ? '0' : '') + hrs + ':' +
        (mins < 10 ? '0' : '') + mins + ':' +
        (secs < 10 ? '0' : '') + secs;
    }
    tick();
    state.uptimeTimer = setInterval(tick, 1000);
  }

  function stopUptimeCounter() {
    if (state.uptimeTimer) {
      clearInterval(state.uptimeTimer);
      state.uptimeTimer = null;
    }
    localStorage.removeItem('lgray_connect_time');
    statUptime.textContent = '00:00:00';
  }

  function setRunningState(running) {
    state.running = running;
    localStorage.setItem('lgray_was_running', running ? 'true' : 'false');
    var t = window.I18n ? window.I18n.t : function(k) { return k; };

    if (running) {
      heroCard.classList.add('connected');
      powerBtnLabel.textContent = t('btn_disconnect');
      connStateText.textContent = t('state_connected');
      sysStatusDot.classList.add('online');
      sysStatusText.textContent = t('status_connected');
      if (!state.uptimeTimer) startUptimeCounter();
    } else {
      heroCard.classList.remove('connected');
      powerBtnLabel.textContent = t('btn_connect');
      connStateText.textContent = t('state_disconnected');
      sysStatusDot.classList.remove('online');
      sysStatusText.textContent = t('status_disconnected');
      stopUptimeCounter();
    }
  }

  function checkStatus() {
    XrayBridge.getStatus(function(res) {
      setRunningState(res && res.running);
      state.pid = res ? res.pid : null;
    });
  }

  // Toggle Power
  powerBtn.addEventListener('click', function() {
    var t = window.I18n ? window.I18n.t : function(k) { return k; };
    if (state.isPinging) {
      showToast(t('ping_in_progress') || 'Идет проверка задержки, пожалуйста подождите');
      return;
    }
    if (powerBtn._busy) return;
    powerBtn._busy = true;

    if (!state.running) {
      if (!state.config || !state.config.nodes || state.config.nodes.length === 0) {
        powerBtn._busy = false;
        showToast('Сначала добавьте подписку во вкладке «Подписки»');
        switchTab('tab-subs', true);
        return;
      }

      powerBtnLabel.textContent = t('btn_connecting');
      connStateText.textContent = t('state_starting');
      XrayBridge.start(state.config, function(res) {
        powerBtn._busy = false;
        if (res && res.running) {
          setRunningState(true);
          showToast(t('toast_tunnel_connected'));
          measureActiveNodePing();
        } else {
          setRunningState(false);
          showToast(t('toast_tunnel_error'));
        }
      });
    } else {
      powerBtnLabel.textContent = t('btn_disconnecting');
      XrayBridge.stop(function() {
        powerBtn._busy = false;
        setRunningState(false);
        showToast(t('toast_tunnel_disconnected'));
      });
    }
  });

  // Honest Ping to Active VPN Server
  function measureActiveNodePing(notify) {
    var node = getActiveNode();
    if (!node) {
      if (notify) showToast('Сервер не выбран или список пуст');
      return;
    }
    var mode = (state.config && state.config.pingMode) || 'https';
    if (notify) showToast('Измерение задержки к серверу (' + mode.toUpperCase() + ')...');

    state.isPinging = true;
    statLatency.textContent = '...';
    XrayBridge.pingNode(node, mode, function(res) {
      state.isPinging = false;
      if (res && res.success) {
        node.ping = res.latencyMs;
        statLatency.textContent = res.latencyMs + ' ms';
        dashNodePing.textContent = res.latencyMs + ' ms';
        headerNodePing.textContent = res.latencyMs + ' ms';
        if (notify) showToast('Задержка до сервера: ' + res.latencyMs + ' ms');
      } else {
        if (notify) showToast('Нет ответа от сервера ' + node.address);
      }
    });
  }

  // Test Connection Button on Dashboard (debounced without losing focus)
  dashTestConnBtn.addEventListener('click', function() {
    if (state.isPinging) return;
    measureActiveNodePing(true);
  });

  // Switch Server Quick Button
  dashSwitchServerBtn.addEventListener('click', function() {
    switchTab('tab-servers', true);
  });

  // Ping All Servers
  pingAllBtn.addEventListener('click', function() {
    if (!state.config || !state.config.nodes || state.config.nodes.length === 0) {
      showToast('Список серверов пуст');
      return;
    }
    var t = window.I18n ? window.I18n.t : function(k) { return k; };
    var mode = (state.config && state.config.pingMode) || 'https';
    showToast(t('toast_pinging_all'));
    state.isPinging = true;
    pingAllBtn.disabled = true;

    var nodes = state.config.nodes;
    var index = 0;

    function pingNext() {
      if (index >= nodes.length) {
        state.isPinging = false;
        pingAllBtn.disabled = false;
        showToast(t('toast_pinging_all_done'));
        updateActiveNodeUI();
        return;
      }
      var node = nodes[index];
      XrayBridge.pingNode(node, mode, function(res) {
        node.ping = res.latencyMs;
        var pill = document.getElementById('ping-pill-' + node.id);
        if (pill) {
          pill.textContent = res.latencyMs + ' ms';
          pill.className = 'server-ping-pill ' + (res.latencyMs < 80 ? '' : (res.latencyMs < 180 ? 'medium' : 'high'));
        }
        index++;
        pingNext();
      });
    }
    pingNext();
  });

  // Theme Management
  function applyTheme(theme) {
    if (!theme || (theme !== 'dark' && theme !== 'light' && theme !== 'oled')) {
      theme = 'dark';
    }
    document.body.className = 'theme-' + theme;

    if (themeBtnDark) themeBtnDark.classList.toggle('active', theme === 'dark');
    if (themeBtnLight) themeBtnLight.classList.toggle('active', theme === 'light');
    if (themeBtnOled) themeBtnOled.classList.toggle('active', theme === 'oled');

    if (state.config) {
      state.config.theme = theme;
      XrayBridge.saveConfig(state.config);
    }
  }

  if (themeBtnDark) {
    themeBtnDark.addEventListener('click', function() {
      applyTheme('dark');
      showToast('Тема: Темная');
    });
  }
  if (themeBtnLight) {
    themeBtnLight.addEventListener('click', function() {
      applyTheme('light');
      showToast('Тема: Светлая');
    });
  }
  if (themeBtnOled) {
    themeBtnOled.addEventListener('click', function() {
      applyTheme('oled');
      showToast('Тема: OLED (Черная)');
    });
  }

  // Language / i18n Management
  function applyLanguage(lang) {
    if (!lang || (lang !== 'ru' && lang !== 'en' && lang !== 'zh')) {
      lang = 'ru';
    }

    if (window.I18n) {
      window.I18n.setLanguage(lang);
    }

    if (langBtnRu) langBtnRu.classList.toggle('active', lang === 'ru');
    if (langBtnEn) langBtnEn.classList.toggle('active', lang === 'en');
    if (langBtnZh) langBtnZh.classList.toggle('active', lang === 'zh');

    if (state.config) {
      state.config.lang = lang;
      XrayBridge.saveConfig(state.config);
    }

    // Update active tab label on page title
    var activeNavBtn = document.querySelector('.nav-btn[data-tab="' + state.activeTab + '"]');
    if (activeNavBtn) {
      var navLabel = activeNavBtn.querySelector('.nav-label');
      if (navLabel) pageTitle.textContent = navLabel.textContent;
    }

    renderServersTabHeader();
    renderSubscriptionsTab();
    updateActiveNodeUI();
    setRunningState(state.running);
  }

  if (langBtnRu) {
    langBtnRu.addEventListener('click', function() {
      applyLanguage('ru');
      showToast('Язык: Русский');
    });
  }
  if (langBtnEn) {
    langBtnEn.addEventListener('click', function() {
      applyLanguage('en');
      showToast('Language: English');
    });
  }
  if (langBtnZh) {
    langBtnZh.addEventListener('click', function() {
      applyLanguage('zh');
      showToast(window.I18n ? window.I18n.t('toast_zh_notice') : 'Chinese language fallback active');
    });
  }

  // Settings: Autostart & Disable IPv6
  document.querySelectorAll('.setting-item-toggle').forEach(function(row) {
    row.addEventListener('click', function(e) {
      var chk = row.querySelector('input[type="checkbox"]');
      var label = row.querySelector('.toggle-switch');
      if (!chk) return;
      if (e.target !== chk && e.target !== label && !label.contains(e.target)) {
        chk.checked = !chk.checked;
        try {
          chk.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (err) {
          var evt = document.createEvent('HTMLEvents');
          evt.initEvent('change', true, true);
          chk.dispatchEvent(evt);
        }
      }
    });
  });

  settingAutostart.addEventListener('change', function() {
    state.config.autostart = settingAutostart.checked;
    XrayBridge.saveConfig(state.config);
    showToast('Автозапуск ' + (settingAutostart.checked ? 'включен' : 'отключен'));
  });

  settingDisableIpv6.addEventListener('change', function() {
    state.config.disableIpv6 = settingDisableIpv6.checked;
    XrayBridge.saveConfig(state.config);
    showToast('Блокировка IPv6 ' + (settingDisableIpv6.checked ? 'включена' : 'отключена'));
  });

  function updateDnsUI(provider) {
    if (dnsSub) dnsSub.classList.toggle('active', provider === 'sub');
    if (dnsCloudflare) dnsCloudflare.classList.toggle('active', provider === 'cloudflare');
    if (dnsGoogle) dnsGoogle.classList.toggle('active', provider === 'google');
    if (dnsCustom) dnsCustom.classList.toggle('active', provider === 'custom');
    if (customDnsRow) {
      customDnsRow.style.display = provider === 'custom' ? 'flex' : 'none';
    }
  }

  function updatePingModeUI(mode) {
    if (pingModeTcp) pingModeTcp.classList.toggle('active', mode === 'tcp');
    if (pingModeHttps) pingModeHttps.classList.toggle('active', mode === 'https');
  }

  function updateAutoUpdateUI(interval) {
    var val = String(interval || '12');
    if (subInterval1) subInterval1.classList.toggle('active', val === '1');
    if (subInterval3) subInterval3.classList.toggle('active', val === '3');
    if (subInterval6) subInterval6.classList.toggle('active', val === '6');
    if (subInterval12) subInterval12.classList.toggle('active', val === '12');
    if (subInterval24) subInterval24.classList.toggle('active', val === '24');
    if (subInterval0) subInterval0.classList.toggle('active', val === '0');
  }

  if (dnsSub) {
    dnsSub.addEventListener('click', function() {
      state.config.dnsProvider = 'sub';
      updateDnsUI('sub');
      XrayBridge.saveConfig(state.config);
      showToast('DNS: Из подписки');
    });
  }

  if (dnsCloudflare) {
    dnsCloudflare.addEventListener('click', function() {
      state.config.dnsProvider = 'cloudflare';
      updateDnsUI('cloudflare');
      XrayBridge.saveConfig(state.config);
      showToast('DNS: Cloudflare (1.1.1.1)');
    });
  }

  if (dnsGoogle) {
    dnsGoogle.addEventListener('click', function() {
      state.config.dnsProvider = 'google';
      updateDnsUI('google');
      XrayBridge.saveConfig(state.config);
      showToast('DNS: Google (8.8.8.8)');
    });
  }

  if (dnsCustom) {
    dnsCustom.addEventListener('click', function() {
      state.config.dnsProvider = 'custom';
      updateDnsUI('custom');
      if (customDnsInput) customDnsInput.focus();
      XrayBridge.saveConfig(state.config);
      showToast('Выбран свой DNS');
    });
  }

  if (customDnsInput) {
    var saveCustomDns = function() {
      var val = customDnsInput.value.trim();
      if (val) {
        state.config.customDns = val;
        XrayBridge.saveConfig(state.config);
        showToast('DNS сохранен: ' + val);
      }
    };
    customDnsInput.addEventListener('change', saveCustomDns);
    customDnsInput.addEventListener('blur', saveCustomDns);
  }

  if (pingModeTcp) {
    pingModeTcp.addEventListener('click', function() {
      state.config.pingMode = 'tcp';
      updatePingModeUI('tcp');
      XrayBridge.saveConfig(state.config);
      showToast('Режим пинга: TCP к порту сервера');
    });
  }

  if (pingModeHttps) {
    pingModeHttps.addEventListener('click', function() {
      state.config.pingMode = 'https';
      updatePingModeUI('https');
      XrayBridge.saveConfig(state.config);
      showToast('Режим пинга: HTTPS (реальный запрос)');
    });
  }

  // Auto-update Interval Controls
  function setAutoUpdateInterval(hours, label) {
    state.config.autoUpdateInterval = String(hours);
    updateAutoUpdateUI(hours);
    XrayBridge.saveConfig(state.config);
    showToast('Автообновление: ' + label);
  }

  if (subInterval1) {
    subInterval1.addEventListener('click', function() { setAutoUpdateInterval(1, 'Каждый 1 час'); });
  }
  if (subInterval3) {
    subInterval3.addEventListener('click', function() { setAutoUpdateInterval(3, 'Каждые 3 часа'); });
  }
  if (subInterval6) {
    subInterval6.addEventListener('click', function() { setAutoUpdateInterval(6, 'Каждые 6 часов'); });
  }
  if (subInterval12) {
    subInterval12.addEventListener('click', function() { setAutoUpdateInterval(12, 'Каждые 12 часов'); });
  }
  if (subInterval24) {
    subInterval24.addEventListener('click', function() { setAutoUpdateInterval(24, 'Каждые 24 часа'); });
  }
  if (subInterval0) {
    subInterval0.addEventListener('click', function() { setAutoUpdateInterval(0, 'Только вручную'); });
  }

  // Periodic subscription auto-update logic (supports 1h, 3h, 6h, 12h, 24h)
  function checkAutoUpdateSubscription() {
    if (!state.config) return;
    var intervalHours = parseInt(state.config.autoUpdateInterval, 10);
    if (!intervalHours || intervalHours <= 0) return; // manual
    var intervalMs = intervalHours * 3600 * 1000;
    var lastUpdate = state.config.lastSubUpdate || 0;
    var now = Date.now();
    if (now - lastUpdate >= intervalMs) {
      var activeSub = getActiveSubscription();
      if (activeSub && activeSub.id) {
        XrayBridge.updateSubscriptionById(activeSub.id, function(res) {
          if (res && res.success) {
            XrayBridge.getConfig(function(cfg) {
              state.config = cfg;
              renderSubscriptionsTab();
              renderServersList();
              updateActiveNodeUI();
            });
          }
        });
      }
    }
  }

  btnRestartCore.addEventListener('click', function() {
    showToast('Перезапуск службы Xray...');
    XrayBridge.start(state.config, function(res) {
      checkStatus();
      if (res && res.running) {
        showToast('Служба Xray успешно перезапущена');
      } else {
        showToast('Ошибка перезапуска службы');
      }
    });
  });

  // Logs
  function refreshLogs() {
    XrayBridge.getLogs(function(res) {
      if (res && res.logs) {
        logsTerminal.textContent = res.logs;
        logsTerminal.scrollTop = logsTerminal.scrollHeight;
      }
    });
  }

  btnRefreshLogs.addEventListener('click', refreshLogs);
  btnClearLogs.addEventListener('click', function() {
    XrayBridge.clearLogs(function() {
      logsTerminal.textContent = '';
      showToast('Журнал очищен');
    });
  });

  // Tabs Switching
  var tabButtons = document.querySelectorAll('.nav-btn');
  var tabPages = document.querySelectorAll('.tab-page');

  function switchTab(targetTabId, autoFocus) {
    tabButtons.forEach(function(btn) {
      if (btn.getAttribute('data-tab') === targetTabId) {
        btn.classList.add('active');
        pageTitle.textContent = btn.querySelector('.nav-label').textContent;
      } else {
        btn.classList.remove('active');
      }
    });

    var targetPage = null;
    tabPages.forEach(function(page) {
      if (page.id === targetTabId) {
        page.classList.add('active');
        targetPage = page;
      } else {
        page.classList.remove('active');
      }
    });

    state.activeTab = targetTabId;

    if (targetTabId === 'tab-logs') {
      refreshLogs();
      if (!logsInterval) logsInterval = setInterval(refreshLogs, 2500);
    } else {
      if (logsInterval) {
        clearInterval(logsInterval);
        logsInterval = null;
      }
    }

    if (autoFocus && window.SpatialNav && targetPage) {
      setTimeout(function() {
        window.SpatialNav.focusTabEntry(targetPage);
      }, 50);
    } else if (window.SpatialNav) {
      window.SpatialNav.scan();
    }
  }

  tabButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tabId = btn.getAttribute('data-tab');
      switchTab(tabId, false);
    });
  });

  // Initialization
  XrayBridge.getConfig(function(cfg) {
    state.config = cfg;

    // Apply saved theme and language
    applyTheme(cfg.theme || 'dark');
    applyLanguage(cfg.lang || 'ru');

    settingAutostart.checked = cfg.autostart === true;
    settingDisableIpv6.checked = cfg.disableIpv6 !== false;

    updateDnsUI(cfg.dnsProvider || 'cloudflare');
    if (customDnsInput) customDnsInput.value = cfg.customDns || '77.88.8.8';
    updatePingModeUI(cfg.pingMode || 'https');
    updateAutoUpdateUI(cfg.autoUpdateInterval || '12');

    updateActiveNodeUI();
    renderServersList();
    renderSubscriptionsTab();
    renderRoutingTab();
    checkStatus();

    // Default to Dashboard (Connection) tab
    switchTab('tab-dashboard', false);

    // Initial check and periodic auto-update of subscription
    checkAutoUpdateSubscription();
    setInterval(checkAutoUpdateSubscription, 60000);

    // Periodic status poll
    setInterval(checkStatus, 4000);
  });

  document.addEventListener('webOSRelaunch', function() {
    checkStatus();
  });
  window.addEventListener('focus', function() {
    checkStatus();
  });
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      checkStatus();
    }
  });

  if (localStorage.getItem('lgray_was_running') === 'true') {
    setRunningState(true);
  }

  // QR Code Sync Modal (api-lgray.dilim0n.ru)
  var btnQrSync = document.getElementById('btn-qr-sync');
  var qrModal = document.getElementById('qr-modal');
  var btnCloseQr = document.getElementById('btn-close-qr');
  var qrCodeImg = document.getElementById('qr-code-img');
  var qrPairingCode = document.getElementById('qr-pairing-code');
  var qrStatusMsg = document.getElementById('qr-status-msg');
  var qrPollTimer = null;
  var cachedPairingCode = null;
  var cachedQrUrl = null;
  var codeCreatedAt = 0;

  function stopQrPolling() {
    if (qrPollTimer) {
      clearInterval(qrPollTimer);
      qrPollTimer = null;
    }
  }

  function startQrPolling(code) {
    stopQrPolling();
    console.log('[QR Poll] Started polling for code:', code);
    qrPollTimer = setInterval(function() {
      var pollUrl = 'https://api-lgray.dilim0n.ru/api/session/poll?code=' + encodeURIComponent(code) + '&_t=' + Date.now();
      fetch(pollUrl, { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          console.log('[QR Poll] Tick for ' + code + ' status:', data ? data.status : 'null');
          if (data && data.status === 'ready' && data.data && data.data.url) {
            stopQrPolling();
            cachedPairingCode = null; // Reset so next time gets fresh session
            if (qrStatusMsg) qrStatusMsg.textContent = 'Подписка получена! Загрузка узлов...';
            showToast('Подписка получена со смартфона!');
            console.log('[QR Poll] Calling addSubscription for url:', data.data.url);
            XrayBridge.addSubscription(data.data.url, function(addRes) {
              console.log('[QR Poll] addSubscription finished:', JSON.stringify(addRes));
              if (addRes && addRes.success) {
                state.config = addRes.config;
                renderSubscriptionsTab();
                renderServersList();
                updateActiveNodeUI();
                showToast('Подписка успешно импортирована (' + addRes.subscription.totalNodes + ' узлов)');
                if (qrStatusMsg) qrStatusMsg.textContent = 'Готово! Добавлено узлов: ' + addRes.subscription.totalNodes;
                setTimeout(function() {
                  window.closeQrModal();
                  switchTab('tab-servers', true);
                }, 1200);
              } else {
                if (qrStatusMsg) qrStatusMsg.textContent = 'Ошибка импорта: ' + ((addRes && addRes.error) || 'неизвестно');
              }
            });
          }
        })
        .catch(function(e) {
          console.warn('[QR Poll] Fetch error:', e);
        });
    }, 1800);
  }

  window.stopQrPolling = stopQrPolling;
  window.startQrPolling = startQrPolling;

  var isModalToggling = false;

  window.closeQrModal = function() {
    stopQrPolling();
    cachedPairingCode = null;
    if (qrModal) qrModal.style.display = 'none';
    isModalToggling = true;
    setTimeout(function() {
      isModalToggling = false;
      if (btnQrSync && window.SpatialNav) {
        window.SpatialNav.focus(btnQrSync);
      }
    }, 250);
  };

  if (btnQrSync) {
    btnQrSync.addEventListener('click', function(e) {
      if (isModalToggling) return;
      if (qrModal && qrModal.style.display === 'flex') return;
      if (qrModal) qrModal.style.display = 'flex';

      if (btnCloseQr && window.SpatialNav) {
        setTimeout(function() {
          window.SpatialNav.focus(btnCloseQr);
        }, 120);
      }

      if (qrPairingCode) qrPairingCode.textContent = '-----';
      if (qrStatusMsg) qrStatusMsg.textContent = 'Генерация кода сопряжения...';

      fetch('https://api-lgray.dilim0n.ru/api/session/create')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data && data.code) {
            cachedPairingCode = data.code;
            cachedQrUrl = data.qrUrl || ('https://api-lgray.dilim0n.ru/import?code=' + data.code);
            codeCreatedAt = Date.now();

            if (qrPairingCode) qrPairingCode.textContent = data.code;
            if (qrCodeImg) qrCodeImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(cachedQrUrl);
            if (qrStatusMsg) qrStatusMsg.textContent = 'Ожидание передачи со смартфона...';
            startQrPolling(data.code);
          } else {
            if (qrStatusMsg) qrStatusMsg.textContent = 'Не удалось создать сессию';
          }
        })
        .catch(function(err) {
          if (qrStatusMsg) qrStatusMsg.textContent = 'Ошибка подключения к api-lgray.dilim0n.ru: ' + err.message;
        });
    });
  }

  if (btnCloseQr) {
    btnCloseQr.addEventListener('click', function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      window.closeQrModal();
    });
  }

  // Remote Controller Global API for Colored Buttons (1-4 Dots)
  window.AppController = {
    togglePower: function() {
      if (powerBtn) powerBtn.click();
    },
    pingCurrent: function() {
      measureActiveNodePing(true);
    },
    switchTab: function(tabId, focusEntry) {
      switchTab(tabId, focusEntry);
    }
  };

  // Alias for renderSubscriptions
  var renderSubscriptions = renderSubscriptionsTab;
  window.renderSubscriptions = renderSubscriptionsTab;

  // Initialize Spatial Navigation
  if (window.SpatialNav) {
    window.SpatialNav.init();
  }
});
