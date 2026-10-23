const net = require('net');
const client = net.connect(23, '192.168.0.15', () => {
  client.write("luna-send -n 1 luna://com.webos.applicationManager/close '{\"id\":\"com.github.dilim0n.lgray\"}' ; sleep 1 ; luna-send -n 1 luna://com.webos.applicationManager/launch '{\"id\":\"com.github.dilim0n.lgray\"}'\nexit\n");
});
client.on('data', d => process.stdout.write(d.toString()));
