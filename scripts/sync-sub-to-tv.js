const fs = require('fs');
const net = require('net');
const path = require('path');
const https = require('https');

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

let subUrl = process.argv[2];
let defaultSubTitle = 'VPN Подписка';

const localCfgPath = path.join(__dirname, '..', 'subscription.local.json');
if (!subUrl && fs.existsSync(localCfgPath)) {
  try {
    const localCfg = JSON.parse(fs.readFileSync(localCfgPath, 'utf8'));
    subUrl = localCfg.subscriptionUrl;
    if (localCfg.subTitle) defaultSubTitle = localCfg.subTitle;
  } catch (e) {}
}

if (!subUrl) {
  console.error('[ERROR] No subscription URL provided. Provide as CLI arg or define in subscription.local.json');
  process.exit(1);
}

https.get(subUrl, { headers: { 'User-Agent': 'X-ray/1.0.0 (webOS TV)' } }, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const arr = JSON.parse(d);
    const nodes = [];
    arr.forEach((item, idx) => {
      if (!item.outbounds) return;
      const ob = item.outbounds.find(o => o.protocol === 'vless' || o.protocol === 'vmess');
      if (!ob || !ob.settings || !ob.settings.vnext || !ob.settings.vnext[0]) return;
      const vn = ob.settings.vnext[0];
      const user = vn.users && vn.users[0];
      const reality = (ob.streamSettings && ob.streamSettings.realitySettings) || {};
      const remark = item.remarks || ('Server ' + (idx + 1));

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

    const cfg = {
      activeNodeId: nodes.length > 0 ? nodes[0].id : null,
      routeMode: "bypass_ru",
      autostart: true,
      disableIpv6: true,
      dnsProvider: "cloudflare",
      customDns: "77.88.8.8",
      pingMode: "https",
      subscriptionUrl: subUrl,
      subTitle: defaultSubTitle,
      subExpire: "",
      autoUpdateInterval: "12",
      lastSubUpdate: Date.now(),
      nodes: nodes
    };

    console.log('[OK] Parsed ' + nodes.length + ' nodes. Writing to TV...');

    const s = net.connect(23, '192.168.0.15', () => {
      s.write("mkdir -p /var/lib/webosbrew/xray\n");
      s.write("cat << 'EOF' > /var/lib/webosbrew/xray/client_config.json\n" + JSON.stringify(cfg, null, 2) + "\nEOF\n");
      s.write("rm -f /var/lib/webosbrew/xray/happ_config.json\n");
      setTimeout(() => {
        s.write("luna-send -n 1 luna://com.webos.applicationManager/close '{\"id\":\"com.github.dilim0n.lgray\"}'\n");
        setTimeout(() => {
          s.write("luna-send -n 1 luna://com.webos.applicationManager/launch '{\"id\":\"com.github.dilim0n.lgray\"}'\n");
          setTimeout(() => s.end(), 1500);
        }, 800);
      }, 1000);
    });

    s.on('data', chunk => process.stdout.write(chunk.toString()));
  });
});
