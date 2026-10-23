/**
 * One-Click TV Deploy & Install Script for X-ray Client (webOS TV)
 * Usage: node scripts/deploy-tv.js [TV_IP]
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const net = require('net');
const os = require('os');

const TV_IP = process.argv[2] || '192.168.0.15';
const TV_PORT = 23;
const HTTP_PORT = 8081;

// Read application info
const appinfoPath = path.join(__dirname, '..', 'app', 'appinfo.json');
let appId = 'org.webosbrew.xray';
let appVersion = '1.0.0';
let appTitle = 'X-ray Client';

if (fs.existsSync(appinfoPath)) {
  try {
    const appinfo = JSON.parse(fs.readFileSync(appinfoPath, 'utf8'));
    if (appinfo.id) appId = appinfo.id;
    if (appinfo.version) appVersion = appinfo.version;
    if (appinfo.title) appTitle = appinfo.title;
  } catch (e) {}
}

const ipkName = `${appId}_${appVersion}_all.ipk`;
const ipkPath = path.join(__dirname, '..', 'dist', ipkName);
if (!fs.existsSync(ipkPath)) {
  console.error(`[ERROR] IPK package not found at ${ipkPath}! Please run "python scripts/build-ipk.py" first.`);
  process.exit(1);
}

const ipkData = fs.readFileSync(ipkPath);

// Detect local IPv4 address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function extractCountryCode(name) {
  if (!name) return "VPN";
  const n = name.trim();
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

  const match = n.match(/\b([A-Za-z]{2})\b/);
  if (match) {
    const code = match[1].toUpperCase();
    const knownCodes = ['RU','DE','NL','FI','SE','US','CH','GB','JP','IT','TR','KZ','FR','ES','PL','AT','EE','LV','LT','CZ','EU','SG','HK','CA','UA'];
    if (knownCodes.indexOf(code) !== -1) return code;
  }
  return "VPN";
}

function parseNodesFromSub(body) {
  const nodes = [];
  if (!body) return nodes;

  const trimmed = body.trim();
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed);
      arr.forEach((item, idx) => {
        if (!item.outbounds) return;
        const ob = item.outbounds.find(o => o.protocol === 'vless' || o.protocol === 'vmess');
        if (!ob || !ob.settings || !ob.settings.vnext || !ob.settings.vnext[0]) return;
        const vn = ob.settings.vnext[0];
        const user = vn.users && vn.users[0];
        const reality = (ob.streamSettings && ob.streamSettings.realitySettings) || {};
        const remark = item.remarks || (`Server ${idx + 1}`);

        nodes.push({
          id: `node_sub_${idx + 1}`,
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
    } catch (e) {}
  }
  return nodes;
}

// Check local subscription file
const subLocalPath = path.join(__dirname, '..', 'subscription.local.json');
let localSubData = null;
let clientConfigBuffer = null;

async function prepareSubscription() {
  const withSub = process.argv.includes('--with-sub');
  if (!withSub || !fs.existsSync(subLocalPath)) {
    console.log('[INFO] Clean installation mode (default): TV app will start with empty subscriptions.');
    const cleanConfig = {
      activeNodeId: null,
      activeSubscriptionId: null,
      routeMode: "bypass_ru",
      autostart: false,
      disableIpv6: true,
      dnsProvider: "cloudflare",
      customDns: "77.88.8.8",
      pingMode: "https",
      theme: "dark",
      lang: "ru",
      subscriptionUrl: "",
      subTitle: "",
      subExpire: "",
      autoUpdateInterval: "12",
      lastSubUpdate: 0,
      subscriptions: [],
      nodes: []
    };
    clientConfigBuffer = Buffer.from(JSON.stringify(cleanConfig, null, 2), 'utf8');
    return;
  }

  try {
    const raw = fs.readFileSync(subLocalPath, 'utf8');
    localSubData = JSON.parse(raw);
    console.log(`[INFO] Found local subscription: ${localSubData.subscriptionUrl}`);

    let nodes = [];
    let title = localSubData.subTitle || 'VPN Подписка';
    let expireStr = localSubData.subExpire || '';

    if (localSubData.subscriptionUrl) {
      console.log('[INFO] Pre-fetching subscription nodes for instant deployment...');
      try {
        const fetchSub = (url) => new Promise((resolve, reject) => {
          const req = https.get(url, { headers: { 'User-Agent': 'X-ray/1.0.0 (webOS TV)' } }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ body: d, headers: res.headers }));
          });
          req.on('error', reject);
          req.setTimeout(8000, () => {
            req.destroy();
            reject(new Error('Subscription fetch timeout'));
          });
        });

        const res = await fetchSub(localSubData.subscriptionUrl);
        nodes = parseNodesFromSub(res.body);

        if (res.headers) {
          const userInfo = res.headers['subscription-userinfo'];
          if (userInfo) {
            const m = userInfo.match(/expire=(\d+)/i);
            if (m) {
              const exp = parseInt(m[1], 10);
              if (exp > 0) {
                const d = new Date(exp * 1000);
                expireStr = (d.getDate() < 10 ? '0' : '') + d.getDate() + '.' +
                            ((d.getMonth() + 1) < 10 ? '0' : '') + (d.getMonth() + 1) + '.' +
                            d.getFullYear();
              }
            }
          }
        }
        console.log(`[OK] Successfully parsed ${nodes.length} nodes from subscription.`);
      } catch (e) {
        console.log(`[WARN] Could not pre-fetch subscription: ${e.message}. App will fetch it on TV.`);
      }
    }

    const subId = 'sub_' + Date.now();
    const initialConfig = {
      activeNodeId: nodes.length > 0 ? nodes[0].id : null,
      activeSubscriptionId: localSubData.subscriptionUrl ? subId : null,
      routeMode: "bypass_ru",
      autostart: false,
      disableIpv6: true,
      dnsProvider: "cloudflare",
      customDns: "77.88.8.8",
      pingMode: "https",
      theme: "dark",
      lang: "ru",
      subscriptionUrl: localSubData.subscriptionUrl || "",
      subTitle: title,
      subExpire: expireStr,
      autoUpdateInterval: "12",
      lastSubUpdate: Date.now(),
      subscriptions: localSubData.subscriptionUrl ? [
        {
          id: subId,
          name: title,
          url: localSubData.subscriptionUrl,
          expire: expireStr,
          totalNodes: nodes.length,
          updatedAt: Date.now(),
          active: true,
          nodes: nodes
        }
      ] : [],
      nodes: nodes
    };

    clientConfigBuffer = Buffer.from(JSON.stringify(initialConfig, null, 2), 'utf8');
  } catch (e) {
    console.error(`[WARN] Error reading subscription.local.json: ${e.message}`);
  }
}

async function run() {
  await prepareSubscription();

  const localIp = getLocalIp();
  console.log(`Local PC IP: ${localIp}`);
  console.log(`Target TV IP: ${TV_IP}:${TV_PORT}`);

  // 1. Temporary HTTP server to serve the IPK & optional client config
  const server = http.createServer((req, res) => {
    if (req.url === '/xray.ipk' || req.url === `/${ipkName}`) {
      console.log(`[DOWNLOAD] TV is downloading ${appTitle} IPK...`);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.palm.ipkg',
        'Content-Length': ipkData.length,
      });
      res.end(ipkData);
    } else if (req.url === '/client_config.json' && clientConfigBuffer) {
      console.log(`[DOWNLOAD] TV is downloading client_config.json...`);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': clientConfigBuffer.length,
      });
      res.end(clientConfigBuffer);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Running at http://${localIp}:${HTTP_PORT}/xray.ipk`);
    console.log(`[TELNET] Connecting to TV telnet on ${TV_IP}:${TV_PORT}...`);

    const client = new net.Socket();
    let output = '';

    const timer = setTimeout(() => {
      console.error('[TIMEOUT] Connection timeout to TV. Is TV turned on and connected to Wi-Fi?');
      client.destroy();
      server.close();
      process.exit(1);
    }, 8000);

    client.connect(TV_PORT, TV_IP, () => {
      clearTimeout(timer);
      console.log(`[OK] Connected to TV! Deploying ${appTitle}...`);

      const now = new Date();
      const pad = n => (n < 10 ? '0' : '') + n;
      const dateStr = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;

      const commands = [
        `date -u -s "${dateStr}" 2>/dev/null`,
        'killall -9 xray 2>/dev/null',
        'rm -f /var/lib/webosbrew/init.d/10-xray.sh',
        'ifconfig tun0 down 2>/dev/null',
        '[ -f /tmp/resolv.conf.bak ] && cp /tmp/resolv.conf.bak /etc/resolv.conf && rm -f /tmp/resolv.conf.bak',
        `curl -f -s http://${localIp}:${HTTP_PORT}/xray.ipk -o /tmp/xray.ipk`,
        'ls -lh /tmp/xray.ipk',
        `luna-send -i -f -n 1 luna://com.webos.appInstallService/dev/install '{"id":"${appId}","ipkUrl":"/tmp/xray.ipk","subscribe":true}'`,
        'sleep 2'
      ];

      if (clientConfigBuffer) {
        commands.push(
          'mkdir -p /var/lib/webosbrew/xray',
          `curl -f -s http://${localIp}:${HTTP_PORT}/client_config.json -o /var/lib/webosbrew/xray/client_config.json`,
          'rm -f /var/lib/webosbrew/xray/happ_config.json',
          'echo "[OK] Installed local subscription config to /var/lib/webosbrew/xray/client_config.json"'
        );
      } else {
        commands.push(
          'echo "[INFO] Keeping existing config on TV (if any)"'
        );
      }

      commands.push(
        `luna-send -n 1 luna://com.webos.notification/createToast '{"message":"${appTitle} успешно установлен!","iconUrl":"/media/developer/apps/usr/palm/applications/${appId}/icon.png"}'`,
        'exit'
      );

      client.write(commands.join('\n') + '\n');
    });

    client.on('data', chunk => {
      output += chunk.toString('utf8');
    });

    client.on('close', () => {
      console.log('\n--- TV TERMINAL RESPONSE ---');
      console.log(output.trim());
      console.log('----------------------------\n');
      console.log(`[FINISH] ${appTitle} deployment completed.`);
      server.close();
    });

    client.on('error', err => {
      clearTimeout(timer);
      console.error('[ERROR] Telnet error:', err.message);
      server.close();
    });
  });
}

run();
