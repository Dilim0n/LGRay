const net = require('net');
const client = net.connect(23, '192.168.0.15', () => {
  client.write("luna-send -n 1 luna://com.webos.applicationManager/close '{\"id\":\"org.webosbrew.xray\"}' ; sleep 1 ; luna-send -n 1 luna://com.webos.applicationManager/launch '{\"id\":\"org.webosbrew.xray\"}'\nexit\n");
});
client.on('data', d => process.stdout.write(d.toString()));
