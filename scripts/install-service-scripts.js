const net = require('net');

const startScript = `#!/bin/sh
sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null 2>&1
killall -9 xray 2>/dev/null
/var/lib/webosbrew/xray/xray run -c /var/lib/webosbrew/xray/config.json > /tmp/xray.log 2>&1 &

for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    if ip link show tun0 >/dev/null 2>&1; then
        break
    fi
    usleep 100000 2>/dev/null || sleep 1
done

ifconfig tun0 198.18.0.1 netmask 255.255.0.0 up

SUBNETS="142.250.0.0/15 172.217.0.0/16 216.58.192.0/19 173.194.0.0/16 74.125.0.0/16 64.233.160.0/19 66.102.0.0/20 66.249.64.0/20 108.177.0.0/17 209.85.128.0/17 216.239.32.0/19"
for sub in $SUBNETS; do
    ip route replace $sub dev tun0 2>/dev/null
done
`;

const stopScript = `#!/bin/sh
SUBNETS="142.250.0.0/15 172.217.0.0/16 216.58.192.0/19 173.194.0.0/16 74.125.0.0/16 64.233.160.0/19 66.102.0.0/20 66.249.64.0/20 108.177.0.0/17 209.85.128.0/17 216.239.32.0/19"
for sub in $SUBNETS; do
    ip route del $sub dev tun0 2>/dev/null
done
killall -9 xray 2>/dev/null
ifconfig tun0 down 2>/dev/null
`;

const initScript = `#!/bin/sh
/var/lib/webosbrew/xray/start.sh &
`;

const s = net.connect(23, '192.168.0.15', () => {
    s.write("cat << 'EOF' > /var/lib/webosbrew/xray/start.sh\n" + startScript + "EOF\nchmod +x /var/lib/webosbrew/xray/start.sh\n");
    s.write("cat << 'EOF' > /var/lib/webosbrew/xray/stop.sh\n" + stopScript + "EOF\nchmod +x /var/lib/webosbrew/xray/stop.sh\n");
    s.write("cat << 'EOF' > /var/lib/webosbrew/init.d/10-xray.sh\n" + initScript + "EOF\nchmod +x /var/lib/webosbrew/init.d/10-xray.sh\n");
    setTimeout(() => s.end(), 2000);
});

s.on('data', d => process.stdout.write(d.toString()));
