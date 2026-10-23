/**
 * X-ray Client for LG webOS - Core Bridge & Subscription Parser
 * Manages Xray-core, TUN routing, subscriptions, and settings via webOS elevated service.
 */

var XrayBridge = (function() {
  var isWebOS = typeof window.webOS !== 'undefined' || typeof window.PalmServiceBridge !== 'undefined';

  var XRAY_BIN = '/var/lib/webosbrew/xray/xray';
  var XRAY_CONFIG = '/var/lib/webosbrew/xray/config.json';
  var CLIENT_CONFIG = '/var/lib/webosbrew/xray/client_config.json';
  var LEGACY_CONFIG = '/var/lib/webosbrew/xray/happ_config.json';
  var START_SCRIPT = '/var/lib/webosbrew/xray/start.sh';
  var STOP_SCRIPT = '/var/lib/webosbrew/xray/stop.sh';
  var INIT_SCRIPT = '/var/lib/webosbrew/init.d/10-xray.sh';
  var LOG_FILE = '/tmp/xray.log';

  var DEFAULT_CONFIG = {
    activeNodeId: null,
    activeSubscriptionId: null,
    routeMode: "bypass_ru", // "bypass_ru" | "youtube_only" | "global"
    autostart: false,
    disableIpv6: true,
    dnsProvider: "cloudflare", // "cloudflare" | "google" | "custom"
    customDns: "77.88.8.8",
    pingMode: "https", // "tcp" | "https"
    theme: "dark", // "dark" | "light" | "oled"
    lang: "ru", // "ru" | "en" | "zh"
    subscriptionUrl: "",
    subTitle: "",
    subExpire: "",
    autoUpdateInterval: "12", // "1" | "3" | "6" | "12" | "24" | "0" (hours)
    lastSubUpdate: 0,
    subscriptions: [],
    nodes: []
  };

  var activeBridges = [];

  function lunaExec(cmd, callback) {
    var uri = 'luna://org.webosbrew.hbchannel.service';
    var params = { command: cmd };

    if (window.webOS && window.webOS.service) {
      window.webOS.service.request(uri, {
        method: 'exec',
        parameters: params,
        onSuccess: function(res) {
          if (callback) callback(res.stdoutString || '', null);
        },
        onFailure: function(err) {
          if (callback) callback('', err);
        }
      });
      return;
    }

    if (window.PalmServiceBridge) {
      try {
        var bridge = new window.PalmServiceBridge();
        // Retain bridge reference so V8 GC does not collect it during async network/system calls
        activeBridges.push(bridge);

        bridge.onservicecallback = function(msg) {
          var idx = activeBridges.indexOf(bridge);
          if (idx !== -1) activeBridges.splice(idx, 1);

          try {
            var res = JSON.parse(msg);
            if (res.returnValue !== false) {
              if (callback) callback(res.stdoutString || '', null);
            } else {
              if (callback) callback('', res);
            }
          } catch (e) {
            if (callback) callback('', e);
          }
        };
        bridge.call(uri + '/exec', JSON.stringify(params));
        return;
      } catch (e) {
        if (callback) callback('', e);
        return;
      }
    }

    if (callback) callback('', 'No bridge');
  }

  function generateXrayConfig(node, routeMode, dnsProvider, customDns, subDns) {
    var dnsServers = ["1.1.1.1", "8.8.8.8"];
    if (dnsProvider === "sub" && subDns && subDns.length > 0) {
      dnsServers = [].concat(subDns);
      if (dnsServers.indexOf("1.1.1.1") === -1) dnsServers.push("1.1.1.1");
    } else if (dnsProvider === "google") {
      dnsServers = ["8.8.8.8", "8.8.4.4"];
    } else if (dnsProvider === "custom" && customDns) {
      dnsServers = [customDns, "1.1.1.1"];
    }

    if (!node) {
      node = {
        address: "127.0.0.1",
        port: 443,
        uuid: "00000000-0000-0000-0000-000000000000",
        flow: "xtls-rprx-vision",
        sni: "",
        publicKey: "",
        shortId: ""
      };
    }

    var rules = [
      {
        type: "field",
        port: 53,
        outboundTag: "dns-out"
      },
      {
        type: "field",
        outboundTag: "proxy",
        ip: ["1.1.1.1", "8.8.8.8", "1.0.0.1", "8.8.4.4"]
      }
    ];

    if (routeMode === "bypass_ru") {
      rules.push({
        type: "field",
        outboundTag: "direct",
        domain: ["regexp:.*\\.ru$", "regexp:.*\\.su$", "domain:kinopoisk.ru", "domain:ivi.ru", "domain:okko.tv", "domain:wink.ru", "domain:gosuslugi.ru", "domain:sberbank.ru", "domain:tinkoff.ru", "domain:vk.com", "domain:yandex.ru", "domain:mail.ru"]
      });
      rules.push({
        type: "field",
        outboundTag: "proxy",
        domain: [
          "domain:youtube.com", "domain:googlevideo.com", "domain:ytimg.com", "domain:ggpht.com",
          "domain:youtu.be", "domain:googleapis.com", "domain:gvt1.com", "domain:googleusercontent.com",
          "domain:ytkids.app.goo.gl", "domain:youtube-nocookie.com", "domain:youtubeeducation.com", "domain:youtubekids.com",
          "domain:instagram.com", "domain:twitter.com", "domain:x.com", "domain:facebook.com", "domain:rutracker.org"
        ]
      });
      rules.push({
        type: "field",
        outboundTag: "proxy",
        network: "tcp,udp"
      });
    } else if (routeMode === "youtube_only") {
      rules.push({
        type: "field",
        outboundTag: "proxy",
        domain: [
          "domain:youtube.com", "domain:googlevideo.com", "domain:ytimg.com", "domain:ggpht.com",
          "domain:youtu.be", "domain:googleapis.com", "domain:gvt1.com", "domain:googleusercontent.com",
          "domain:ytkids.app.goo.gl", "domain:youtube-nocookie.com", "domain:youtubeeducation.com", "domain:youtubekids.com"
        ]
      });
      rules.push({
        type: "field",
        outboundTag: "proxy",
        ip: [
          "142.250.0.0/15", "142.251.0.0/16", "172.217.0.0/16", "172.253.0.0/16",
          "216.58.192.0/19", "173.194.0.0/16", "74.125.0.0/16", "64.233.160.0/19",
          "66.102.0.0/20", "66.249.64.0/20", "108.177.0.0/17", "209.85.128.0/17",
          "216.239.32.0/19"
        ]
      });
      rules.push({
        type: "field",
        outboundTag: "direct",
        network: "tcp,udp"
      });
    } else {
      // Global
      rules.push({
        type: "field",
        outboundTag: "proxy",
        network: "tcp,udp"
      });
    }

    var config = {
      log: { loglevel: "warning" },
      dns: { servers: dnsServers },
      inbounds: [
        {
          tag: "tun-in",
          protocol: "tun",
          settings: {
            name: "tun0",
            mtu: 1500
          },
          sniffing: {
            enabled: true,
            destOverride: ["http", "tls"]
          }
        },
        {
          tag: "socks-in",
          port: 1080,
          listen: "127.0.0.1",
          protocol: "socks"
        },
        {
          tag: "http-in",
          port: 10809,
          listen: "127.0.0.1",
          protocol: "http"
        }
      ],
      outbounds: [
        {
          tag: "proxy",
          protocol: "vless",
          settings: {
            vnext: [
              {
                address: node.address,
                port: node.port || 443,
                users: [
                  {
                    id: node.uuid,
                    encryption: "none",
                    flow: node.flow || "xtls-rprx-vision"
                  }
                ]
              }
            ]
          },
          streamSettings: {
            network: "tcp",
            security: "reality",
            realitySettings: {
              serverName: node.sni || "",
              publicKey: node.publicKey || "",
              shortId: node.shortId || "",
              fingerprint: "firefox"
            }
          }
        },
        {
          tag: "direct",
          protocol: "freedom"
        },
        {
          tag: "dns-out",
          protocol: "dns"
        },
        {
          tag: "block",
          protocol: "blackhole"
        }
      ],
      routing: {
        domainStrategy: "IPIfNonMatch",
        rules: rules
      }
    };

    return config;
  }

  function extractCountryCode(name) {
    if (!name) return "VPN";
    var n = name.trim();
    if (/россия|russia|\bru\b/i.test(n)) return "RU";
    if (/швейцария|swiss|\bch\b/i.test(n)) return "CH";
    if (/германия|germany|\bde\b/i.test(n)) return "DE";
    if (/нидерланды|holland|netherlands|\bnl\b/i.test(n)) return "NL";
    if (/швеция|sweden|\bse\b/i.test(n)) return "SE";
    if (/испания|spain|\bes\b/i.test(n)) return "ES";
    if (/франция|france|\bfr\b/i.test(n)) return "FR";
    if (/финляндия|finland|\bfi\b/i.test(n)) return "FI";
    if (/великобритания|англия|london|\bgb\b|\buk\b/i.test(n)) return "GB";
    if (/сша|usa|\bus\b/i.test(n)) return "US";
    if (/турция|turkey|\btr\b/i.test(n)) return "TR";
    if (/казахстан|\bkz\b/i.test(n)) return "KZ";
    if (/япония|japan|\bjp\b/i.test(n)) return "JP";
    if (/италия|italy|\bit\b/i.test(n)) return "IT";
    if (/польша|poland|\bpl\b/i.test(n)) return "PL";
    if (/австрия|austria|\bat\b/i.test(n)) return "AT";
    if (/эстония|estonia|\bee\b/i.test(n)) return "EE";
    if (/латвия|latvia|\blv\b/i.test(n)) return "LV";
    if (/литва|lithuania|\blt\b/i.test(n)) return "LT";
    if (/чехия|czech|\bcz\b/i.test(n)) return "CZ";
    if (/авто|auto|best|европ|\beu\b/i.test(n)) return "EU";
    if (/сингапур|singapore|\bsg\b/i.test(n)) return "SG";
    if (/гонконг|hong\s*kong|\bhk\b/i.test(n)) return "HK";
    if (/канада|canada|\bca\b/i.test(n)) return "CA";
    if (/украина|ukraine|\bua\b/i.test(n)) return "UA";

    var match = n.match(/\b([A-Za-z]{2})\b/);
    if (match) {
      var code = match[1].toUpperCase();
      var knownCodes = ['RU','DE','NL','FI','SE','US','CH','GB','JP','IT','TR','KZ','FR','ES','PL','AT','EE','LV','LT','CZ','EU','SG','HK','CA','UA','NO','DK','BE','BG','RO'];
      if (knownCodes.indexOf(code) !== -1) return code;
    }

    return "VPN";
  }

  function parseVlessUrl(url) {
    try {
      if (!url.startsWith('vless://')) return null;
      var clean = url.substring(8);
      var parts = clean.split('#');
      var remark = parts[1] ? decodeURIComponent(parts[1]) : 'VLESS Node';
      var mainPart = parts[0];
      
      var atParts = mainPart.split('@');
      var uuid = atParts[0];
      var hostParts = atParts[1].split('?');
      var hostPort = hostParts[0].split(':');
      var address = hostPort[0];
      var port = parseInt(hostPort[1], 10) || 443;
      
      var params = {};
      if (hostParts[1]) {
        var query = hostParts[1].split('&');
        for (var i = 0; i < query.length; i++) {
          var kv = query[i].split('=');
          params[kv[0]] = decodeURIComponent(kv[1] || '');
        }
      }

      return {
        id: 'node_' + Math.random().toString(36).substr(2, 9),
        name: remark,
        country: extractCountryCode(remark),
        address: address,
        port: port,
        protocol: 'vless',
        uuid: uuid,
        flow: params.flow || 'xtls-rprx-vision',
        sni: params.sni || params.serverName || '',
        publicKey: params.pbk || params.publicKey || '',
        shortId: params.sid || params.shortId || '',
        ping: null
      };
    } catch (e) {
      return null;
    }
  }

  function parseSubscriptionBody(content) {
    var nodes = [];
    if (!content) return nodes;

    var trimmed = content.trim();

    // 1. Check if JSON Array format
    if (trimmed.startsWith('[')) {
      try {
        var arr = JSON.parse(trimmed);
        arr.forEach(function(item, idx) {
          if (!item.outbounds) return;
          var ob = item.outbounds.find(function(o) { return o.protocol === 'vless' || o.protocol === 'vmess'; });
          if (!ob || !ob.settings || !ob.settings.vnext || !ob.settings.vnext[0]) return;
          
          var vn = ob.settings.vnext[0];
          var user = vn.users && vn.users[0];
          var reality = (ob.streamSettings && ob.streamSettings.realitySettings) || {};
          var remark = item.remarks || ('Server ' + (idx + 1));

          nodes.push({
            id: 'node_sub_' + (idx + 1),
            name: remark,
            country: extractCountryCode(remark),
            address: vn.address,
            port: vn.port || 443,
            protocol: ob.protocol,
            uuid: user ? user.id : '',
            flow: user ? user.flow : 'xtls-rprx-vision',
            sni: reality.serverName || '',
            publicKey: reality.publicKey || '',
            shortId: reality.shortId || '',
            ping: null
          });
        });

        if (nodes.length > 0) return nodes;
      } catch (e) {
        console.error('JSON parse failed in subscription:', e);
      }
    }

    // 2. Base64 decoded or raw text with URI schemes
    var decoded = trimmed;
    try {
      if (!decoded.startsWith('vless://') && !decoded.startsWith('vmess://') && !decoded.startsWith('{')) {
        decoded = atob(decoded);
      }
    } catch (e) {}

    var lines = decoded.split(/[\r\n]+/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.startsWith('vless://')) {
        var parsed = parseVlessUrl(line);
        if (parsed) nodes.push(parsed);
      }
    }

    return nodes;
  }

  function normalizeConfig(cfg) {
    if (!cfg) cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    if (!cfg.theme) cfg.theme = 'dark';
    if (!cfg.lang) cfg.lang = 'ru';
    if (!Array.isArray(cfg.subscriptions)) {
      cfg.subscriptions = [];
    }

    // If subscriptions is empty but we have legacy subscriptionUrl & nodes
    if (cfg.subscriptions.length === 0 && cfg.subscriptionUrl) {
      var legacySub = {
        id: 'sub_legacy_' + Date.now(),
        name: cfg.subTitle || 'Основная подписка',
        url: cfg.subscriptionUrl,
        expire: cfg.subExpire || '',
        totalNodes: (cfg.nodes && cfg.nodes.length) || 0,
        updatedAt: cfg.lastSubUpdate || Date.now(),
        active: true,
        nodes: cfg.nodes || []
      };
      cfg.subscriptions.push(legacySub);
      cfg.activeSubscriptionId = legacySub.id;
    }

    // Ensure one subscription is marked active if any exist
    if (cfg.subscriptions.length > 0) {
      var hasActive = cfg.subscriptions.some(function(s) { return s.active; });
      if (!hasActive) {
        if (cfg.activeSubscriptionId) {
          var found = cfg.subscriptions.find(function(s) { return s.id === cfg.activeSubscriptionId; });
          if (found) found.active = true;
        }
        if (!cfg.subscriptions.some(function(s) { return s.active; })) {
          cfg.subscriptions[0].active = true;
          cfg.activeSubscriptionId = cfg.subscriptions[0].id;
        }
      }

      var activeSub = cfg.subscriptions.find(function(s) { return s.active; }) || cfg.subscriptions[0];
      cfg.activeSubscriptionId = activeSub.id;
      cfg.subscriptionUrl = activeSub.url;
      cfg.subTitle = activeSub.name;
      cfg.subExpire = activeSub.expire || '';
      cfg.nodes = activeSub.nodes || [];
    } else {
      cfg.activeSubscriptionId = null;
      cfg.nodes = [];
    }

    return cfg;
  }

  return {
    isWebOS: function() {
      return isWebOS;
    },

    getConfig: function(callback) {
      if (!isWebOS) {
        var stored = localStorage.getItem('xray_config') || localStorage.getItem('client_config') || localStorage.getItem('happ_config');
        var parsed = stored ? JSON.parse(stored) : DEFAULT_CONFIG;
        callback(normalizeConfig(parsed));
        return;
      }

      var cmd = '[ -f ' + CLIENT_CONFIG + ' ] && cat ' + CLIENT_CONFIG + ' || cat ' + LEGACY_CONFIG + ' 2>/dev/null';
      lunaExec(cmd, function(stdout, err) {
        var cfg = null;
        try {
          if (stdout && stdout.trim()) cfg = JSON.parse(stdout);
        } catch (e) {}
        callback(normalizeConfig(cfg || DEFAULT_CONFIG));
      });
    },

    saveConfig: function(cfg, callback) {
      cfg = normalizeConfig(cfg);
      if (!isWebOS) {
        localStorage.setItem('xray_config', JSON.stringify(cfg));
        localStorage.setItem('client_config', JSON.stringify(cfg));
        if (callback) callback({ returnValue: true });
        return;
      }

      var jsonStr = JSON.stringify(cfg).replace(/'/g, "");
      lunaExec("mkdir -p /var/lib/webosbrew/xray ; echo '" + jsonStr + "' > " + CLIENT_CONFIG, function(stdout, err) {
        if (callback) callback({ returnValue: !err });
      });
    },

    getStatus: function(callback) {
      if (!isWebOS) {
        var isRunning = localStorage.getItem('xray_running') === 'true';
        callback({ returnValue: true, running: isRunning, pid: isRunning ? 1234 : null });
        return;
      }

      lunaExec('pidof xray', function(stdout, err) {
        var pids = stdout.trim().split(/\s+/).filter(Boolean);
        var isRunning = pids.length > 0;
        callback({
          returnValue: true,
          running: isRunning,
          pid: isRunning ? pids[0] : null
        });
      });
    },

    start: function(cfg, callback) {
      var self = this;
      cfg = normalizeConfig(cfg);
      var activeNode = null;
      var nodes = cfg.nodes || [];
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].id === cfg.activeNodeId) {
          activeNode = nodes[i];
          break;
        }
      }
      if (!activeNode && nodes.length > 0) activeNode = nodes[0];
      if (!activeNode) {
        if (callback) callback({ returnValue: false, running: false, error: 'Нет активного сервера' });
        return;
      }

      var subDns = null;
      if (cfg.subscriptions) {
        var activeSub = cfg.subscriptions.find(function(s) { return s.active || s.id === cfg.activeSubscriptionId; });
        if (activeSub && activeSub.subDns) subDns = activeSub.subDns;
      }

      var xrayConfig = generateXrayConfig(activeNode, cfg.routeMode || 'bypass_ru', cfg.dnsProvider || 'cloudflare', cfg.customDns || '77.88.8.8', subDns);

      if (!isWebOS) {
        localStorage.setItem('xray_running', 'true');
        self.saveConfig(cfg);
        if (callback) callback({ returnValue: true, running: true });
        return;
      }

      var xrayJson = JSON.stringify(xrayConfig).replace(/'/g, "");

      var primaryDnsIp = "1.1.1.1";
      if (cfg.dnsProvider === "google") {
        primaryDnsIp = "8.8.8.8";
      } else if (cfg.dnsProvider === "custom" && cfg.customDns) {
        primaryDnsIp = cfg.customDns;
      } else if (cfg.dnsProvider === "sub" && subDns && subDns[0]) {
        var cleanIp = subDns[0].replace(/^https?:\/\//, '').split('/')[0];
        if (/^\d+\.\d+\.\d+\.\d+$/.test(cleanIp)) primaryDnsIp = cleanIp;
      }

      var YT_SUBNETS = "142.250.0.0/15 142.251.0.0/16 172.217.0.0/16 172.253.0.0/16 216.58.192.0/19 173.194.0.0/16 74.125.0.0/16 64.233.160.0/19 66.102.0.0/20 66.249.64.0/20 108.177.0.0/17 209.85.128.0/17 216.239.32.0/19 199.223.232.0/21 199.36.154.0/23 199.36.156.0/23 192.178.0.0/15";

      var startScriptContent = [
        "#!/bin/sh",
        "export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt",
        "sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null 2>&1",
        "killall -9 xray 2>/dev/null",
        "/var/lib/webosbrew/xray/xray run -c /var/lib/webosbrew/xray/config.json > /tmp/xray.log 2>&1 &",
        "for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do",
        "  if ip link show tun0 >/dev/null 2>&1; then break; fi",
        "  usleep 100000 2>/dev/null || sleep 1",
        "done",
        "ifconfig tun0 198.18.0.1 netmask 255.255.0.0 up",
        "for sub in " + YT_SUBNETS + "; do",
        "  ip route replace $sub dev tun0 2>/dev/null",
        "done",
        "ip route replace 1.1.1.1 dev tun0 2>/dev/null",
        "ip route replace 8.8.8.8 dev tun0 2>/dev/null"
      ].join('\\n');

      var stopScriptContent = [
        "#!/bin/sh",
        "for sub in " + YT_SUBNETS + "; do",
        "  ip route del $sub dev tun0 2>/dev/null",
        "done",
        "ip route del 1.1.1.1 dev tun0 2>/dev/null",
        "ip route del 8.8.8.8 dev tun0 2>/dev/null",
        "killall -9 xray 2>/dev/null",
        "ifconfig tun0 down 2>/dev/null"
      ].join('\\n');

      var script = [
        "mkdir -p /var/lib/webosbrew/xray",
        "echo '" + xrayJson + "' > " + XRAY_CONFIG,
        "printf '%b\\n' '" + startScriptContent + "' > " + START_SCRIPT + " && chmod +x " + START_SCRIPT,
        "printf '%b\\n' '" + stopScriptContent + "' > " + STOP_SCRIPT + " && chmod +x " + STOP_SCRIPT,
        START_SCRIPT,
        "[ ! -f /tmp/resolv.conf.bak ] && cp /etc/resolv.conf /tmp/resolv.conf.bak",
        "echo 'nameserver " + primaryDnsIp + "' > /etc/resolv.conf",
        "echo 'nameserver 8.8.8.8' >> /etc/resolv.conf",
        "ip route replace " + primaryDnsIp + " dev tun0 2>/dev/null",
        "ip route replace 1.1.1.1 dev tun0 2>/dev/null",
        "ip route replace 8.8.8.8 dev tun0 2>/dev/null"
      ];

      if (cfg.autostart) {
        script.push('echo "#!/bin/sh" > ' + INIT_SCRIPT + ' ; echo "' + START_SCRIPT + ' &" >> ' + INIT_SCRIPT + ' ; chmod +x ' + INIT_SCRIPT);
      } else {
        script.push('rm -f ' + INIT_SCRIPT);
      }

      self.saveConfig(cfg, function() {
        lunaExec(script.join(' ; '), function(stdout, err) {
          if (callback) callback({ returnValue: !err, running: true });
        });
      });
    },

    stop: function(callback) {
      if (!isWebOS) {
        localStorage.setItem('xray_running', 'false');
        if (callback) callback({ returnValue: true, running: false });
        return;
      }

      var script = [
        STOP_SCRIPT,
        "[ -f /tmp/resolv.conf.bak ] && cp /tmp/resolv.conf.bak /etc/resolv.conf && rm -f /tmp/resolv.conf.bak",
        "ip route del 1.1.1.1 dev tun0 2>/dev/null",
        "ip route del 8.8.8.8 dev tun0 2>/dev/null",
        'rm -f ' + INIT_SCRIPT
      ].join(' ; ');

      lunaExec(script, function(stdout, err) {
        if (callback) callback({ returnValue: true, running: false });
      });
    },

    pingNode: function(node, mode, callback) {
      if (typeof mode === 'function') {
        callback = mode;
        mode = 'https';
      }
      mode = mode || 'https';

      if (!node || !node.address) {
        if (callback) callback({ success: false, latencyMs: 999, mode: mode });
        return;
      }

      if (!isWebOS) {
        setTimeout(function() {
          var simMs = mode === 'tcp' ? Math.floor(25 + Math.random() * 25) : Math.floor(45 + Math.random() * 35);
          callback({ success: true, latencyMs: simMs, mode: mode });
        }, 150);
        return;
      }

      var cmd;
      if (mode === 'tcp') {
        cmd = 'curl -s -k -m 3 --connect-timeout 2 -o /dev/null -w "%{time_connect}" http://' + node.address + ':' + (node.port || 443) + ' 2>/dev/null || curl -s -k -m 3 --connect-timeout 2 -o /dev/null -w "%{time_connect}" https://' + node.address + ':' + (node.port || 443) + ' 2>/dev/null || echo "0"';
        lunaExec(cmd, function(stdout, err) {
          var time = parseFloat(stdout.trim()) || 0;
          var ms = Math.round(time * 1000);
          var ok = ms > 0 && ms < 4000;
          callback({ success: ok, latencyMs: ok ? ms : 999, mode: 'tcp' });
        });
      } else {
        cmd = 'curl -s -k -4 -m 4 -o /dev/null -w "%{time_total}" https://' + node.address + ':' + (node.port || 443) + ' 2>/dev/null || echo "0"';
        lunaExec(cmd, function(stdout, err) {
          var time = parseFloat(stdout.trim()) || 0;
          var ms = Math.round(time * 1000);
          var ok = ms > 0 && ms < 4000;
          callback({ success: ok, latencyMs: ok ? ms : 999, mode: 'https' });
        });
      }
    },

    fetchSubscription: function(url, callback) {
      if (!url) {
        if (callback) callback({ error: 'URL подписки не указан' });
        return;
      }

      if (!isWebOS) {
        // Mock fallback for browser / development testing
        setTimeout(function() {
          var mockNodes = [
            { id: 'node_dev_1', name: 'Amsterdam Fast (NL)', country: 'NL', address: '194.87.1.1', port: 443, protocol: 'vless', uuid: '11111111-2222-3333-4444-555555555555', flow: 'xtls-rprx-vision', sni: 'cloudflare.com', publicKey: '', shortId: '', ping: 42 },
            { id: 'node_dev_2', name: 'Frankfurt Direct (DE)', country: 'DE', address: '185.12.3.4', port: 443, protocol: 'vless', uuid: '22222222-3333-4444-5555-666666666666', flow: 'xtls-rprx-vision', sni: 'google.com', publicKey: '', shortId: '', ping: 55 },
            { id: 'node_dev_3', name: 'Helsinki Turbo (FI)', country: 'FI', address: '95.216.5.6', port: 443, protocol: 'vless', uuid: '33333333-4444-5555-6666-777777777777', flow: 'xtls-rprx-vision', sni: 'fast.com', publicKey: '', shortId: '', ping: 38 }
          ];
          callback({
            success: true,
            title: 'VPN Subscription',
            expire: '31.12.2026',
            recommendedInterval: 12,
            nodes: mockNodes,
            count: mockNodes.length
          });
        }, 300);
        return;
      }

      var cmd = 'curl -s -D /tmp/sub_headers.txt -L -m 20 -A "X-ray/1.0.0 (webOS TV)" "' + url + '" -o /tmp/sub_body.txt && cat /tmp/sub_body.txt';
      lunaExec(cmd, function(body, err) {
        if (!body || body.length < 20) {
          if (callback) callback({ error: 'Не удалось загрузить подписку. Проверьте адрес или сеть.' });
          return;
        }

        var newNodes = parseSubscriptionBody(body);
        if (newNodes.length === 0) {
          if (callback) callback({ error: 'В подписке не обнаружены поддерживаемые серверы (VLESS).' });
          return;
        }

        lunaExec('cat /tmp/sub_headers.txt 2>/dev/null', function(headers) {
          var title = "Подписка";
          var expireStr = "";
          var recommendedInterval = null;

          if (headers) {
            var matchTitle = headers.match(/profile-title:\s*base64:([A-Za-z0-9+/=]+)/i);
            if (matchTitle) {
              try { title = atob(matchTitle[1]); } catch (e) {}
            } else {
              var matchPlainTitle = headers.match(/profile-title:\s*([^\r\n]+)/i);
              if (matchPlainTitle) title = matchPlainTitle[1].trim();
            }

            var matchInterval = headers.match(/profile-update-interval:\s*(\d+)/i);
            if (matchInterval) {
              var val = parseInt(matchInterval[1], 10);
              if (val >= 3600) {
                recommendedInterval = Math.round(val / 3600);
              } else if (val > 0) {
                recommendedInterval = val;
              }
            }

            var matchUserinfo = headers.match(/subscription-userinfo:\s*([^;\r\n]+(?:;[^;\r\n]+)*)/i);
            if (matchUserinfo) {
              var matchExpire = matchUserinfo[1].match(/expire=(\d+)/i);
              if (matchExpire) {
                var expSec = parseInt(matchExpire[1], 10);
                if (expSec > 0) {
                  var d = new Date(expSec * 1000);
                  expireStr = (d.getDate() < 10 ? '0' : '') + d.getDate() + '.' +
                              ((d.getMonth() + 1) < 10 ? '0' : '') + (d.getMonth() + 1) + '.' +
                              d.getFullYear();
                }
              }
            }
          }

          callback({
            success: true,
            title: title,
            expire: expireStr,
            recommendedInterval: recommendedInterval,
            nodes: newNodes,
            count: newNodes.length
          });
        });
      });
    },

    addSubscription: function(url, callback) {
      var self = this;
      var trimmed = (url || '').trim();

      // If user passed direct VLESS/VMess/Trojan/JSON config instead of an HTTP URL
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        var directNodes = parseSubscriptionBody(trimmed);
        if (directNodes && directNodes.length > 0) {
          self.getConfig(function(cfg) {
            var isFirst = !cfg.subscriptions || cfg.subscriptions.length === 0;
            var newSub = {
              id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              name: directNodes[0].name || ('Подписка ' + ((cfg.subscriptions ? cfg.subscriptions.length : 0) + 1)),
              url: trimmed.length > 80 ? (trimmed.substring(0, 77) + '...') : trimmed,
              expire: '',
              totalNodes: directNodes.length,
              updatedAt: Date.now(),
              active: isFirst,
              nodes: directNodes
            };

            if (!cfg.subscriptions) cfg.subscriptions = [];
            cfg.subscriptions.push(newSub);

            if (isFirst) {
              cfg.activeSubscriptionId = newSub.id;
              cfg.subscriptionUrl = newSub.url;
              cfg.subTitle = newSub.name;
              cfg.nodes = newSub.nodes;
              cfg.activeNodeId = newSub.nodes[0] ? newSub.nodes[0].id : null;
            }

            self.saveConfig(cfg, function() {
              if (callback) callback({ success: true, subscription: newSub, config: cfg });
            });
          });
          return;
        }
      }

      self.fetchSubscription(trimmed, function(res) {
        if (res.error) {
          if (callback) callback(res);
          return;
        }

        self.getConfig(function(cfg) {
          var isFirst = !cfg.subscriptions || cfg.subscriptions.length === 0;
          var newSub = {
            id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: res.title || ('Подписка ' + ((cfg.subscriptions ? cfg.subscriptions.length : 0) + 1)),
            url: trimmed,
            expire: res.expire || '',
            totalNodes: res.count,
            updatedAt: Date.now(),
            active: isFirst,
            nodes: res.nodes
          };

          if (!cfg.subscriptions) cfg.subscriptions = [];
          cfg.subscriptions.push(newSub);

          if (isFirst) {
            cfg.activeSubscriptionId = newSub.id;
            cfg.subscriptionUrl = newSub.url;
            cfg.subTitle = newSub.name;
            cfg.subExpire = newSub.expire;
            cfg.nodes = newSub.nodes;
            cfg.activeNodeId = newSub.nodes[0] ? newSub.nodes[0].id : null;
          }

          self.saveConfig(cfg, function() {
            if (callback) callback({ success: true, subscription: newSub, config: cfg });
          });
        });
      });
    },

    updateSubscriptionById: function(subId, callback) {
      var self = this;
      self.getConfig(function(cfg) {
        var sub = (cfg.subscriptions || []).find(function(s) { return s.id === subId; });
        if (!sub) {
          if (callback) callback({ error: 'Подписка не найдена' });
          return;
        }

        self.fetchSubscription(sub.url, function(res) {
          if (res.error) {
            if (callback) callback(res);
            return;
          }

          sub.name = res.title || sub.name;
          if (res.expire) sub.expire = res.expire;
          sub.totalNodes = res.count;
          sub.updatedAt = Date.now();
          sub.nodes = res.nodes;

          if (sub.active) {
            cfg.subTitle = sub.name;
            cfg.subExpire = sub.expire;
            cfg.nodes = sub.nodes;
            cfg.lastSubUpdate = Date.now();
            if (!sub.nodes.some(function(n) { return n.id === cfg.activeNodeId; })) {
              cfg.activeNodeId = sub.nodes[0] ? sub.nodes[0].id : null;
            }
          }

          self.saveConfig(cfg, function() {
            if (callback) callback({ success: true, count: res.count, subscription: sub });
          });
        });
      });
    },

    activateSubscription: function(subId, callback) {
      var self = this;
      self.getConfig(function(cfg) {
        var found = false;
        var activatedSub = null;
        (cfg.subscriptions || []).forEach(function(s) {
          if (s.id === subId) {
            s.active = true;
            activatedSub = s;
            found = true;
          } else {
            s.active = false;
          }
        });

        if (!found || !activatedSub) {
          if (callback) callback({ error: 'Подписка не найдена' });
          return;
        }

        cfg.activeSubscriptionId = activatedSub.id;
        cfg.subscriptionUrl = activatedSub.url;
        cfg.subTitle = activatedSub.name;
        cfg.subExpire = activatedSub.expire || '';
        cfg.nodes = activatedSub.nodes || [];
        if (!cfg.nodes.some(function(n) { return n.id === cfg.activeNodeId; })) {
          cfg.activeNodeId = cfg.nodes[0] ? cfg.nodes[0].id : null;
        }

        self.saveConfig(cfg, function() {
          if (callback) callback({ success: true, subscription: activatedSub, config: cfg });
        });
      });
    },

    deleteSubscription: function(subId, callback) {
      var self = this;
      self.getConfig(function(cfg) {
        var idx = (cfg.subscriptions || []).findIndex(function(s) { return s.id === subId; });
        if (idx === -1) {
          if (callback) callback({ error: 'Подписка не найдена' });
          return;
        }

        var wasActive = cfg.subscriptions[idx].active;
        cfg.subscriptions.splice(idx, 1);

        if (wasActive && cfg.subscriptions.length > 0) {
          cfg.subscriptions[0].active = true;
          var newActive = cfg.subscriptions[0];
          cfg.activeSubscriptionId = newActive.id;
          cfg.subscriptionUrl = newActive.url;
          cfg.subTitle = newActive.name;
          cfg.subExpire = newActive.expire || '';
          cfg.nodes = newActive.nodes || [];
          cfg.activeNodeId = cfg.nodes[0] ? cfg.nodes[0].id : null;
        } else if (cfg.subscriptions.length === 0) {
          cfg.activeSubscriptionId = null;
          cfg.subscriptionUrl = "";
          cfg.subTitle = "Подписка не добавлена";
          cfg.subExpire = "";
          cfg.nodes = [];
          cfg.activeNodeId = null;
        }

        self.saveConfig(cfg, function() {
          if (callback) callback({ success: true, config: cfg });
        });
      });
    },

    updateSubscription: function(url, callback) {
      var self = this;
      self.fetchSubscription(url, function(res) {
        if (res.error) {
          if (callback) callback(res);
          return;
        }

        self.getConfig(function(cfg) {
          cfg.subscriptionUrl = url;
          cfg.subTitle = res.title;
          if (res.expire) cfg.subExpire = res.expire;
          cfg.lastSubUpdate = Date.now();
          if (res.recommendedInterval) cfg.recommendedInterval = res.recommendedInterval;
          cfg.nodes = res.nodes;

          // Also update or add to subscriptions array
          var existing = (cfg.subscriptions || []).find(function(s) { return s.url === url || s.active; });
          if (existing) {
            existing.name = res.title;
            if (res.expire) existing.expire = res.expire;
            existing.totalNodes = res.count;
            existing.updatedAt = Date.now();
            existing.nodes = res.nodes;
          } else {
            if (!cfg.subscriptions) cfg.subscriptions = [];
            cfg.subscriptions.push({
              id: 'sub_' + Date.now(),
              name: res.title,
              url: url,
              expire: res.expire || '',
              totalNodes: res.count,
              updatedAt: Date.now(),
              active: true,
              nodes: res.nodes
            });
          }

          if (!res.nodes.some(function(n) { return n.id === cfg.activeNodeId; })) {
            cfg.activeNodeId = res.nodes[0] ? res.nodes[0].id : null;
          }

          self.saveConfig(cfg, function() {
            if (callback) callback(res);
          });
        });
      });
    },

    getLogs: function(callback) {
      if (!isWebOS) {
        callback({ logs: '[Info] X-ray Client Core: Xray v26.10.21 active\n[Info] tun0 interface initialized\n[Info] Ready for connections' });
        return;
      }

      lunaExec('cat ' + LOG_FILE + ' 2>/dev/null | tail -n 80', function(stdout, err) {
        callback({ logs: stdout || '(Журнал пока пуст)' });
      });
    },

    clearLogs: function(callback) {
      if (!isWebOS) {
        if (callback) callback();
        return;
      }
      lunaExec('> ' + LOG_FILE, function() {
        if (callback) callback();
      });
    }
  };
})();

// Compatibility alias
window.XrayBridge = XrayBridge;
window.HappBridge = XrayBridge;
