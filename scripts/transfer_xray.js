const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const xrayPath = path.join(__dirname, 'xray');
const configPath = path.join(__dirname, 'xray_config.json');

const xrayData = fs.readFileSync(xrayPath);
const configData = fs.readFileSync(configPath);

const server = http.createServer((req, res) => {
  if (req.url === '/xray') {
    console.log('Serving xray binary (' + xrayData.length + ' bytes)...');
    res.writeHead(200, { 'Content-Length': xrayData.length });
    res.end(xrayData);
  } else if (req.url === '/config.json') {
    console.log('Serving config.json...');
    res.writeHead(200, { 'Content-Length': configData.length });
    res.end(configData);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(8082, '0.0.0.0', () => {
  console.log('HTTP Server ready on 8082');

  const client = new net.Socket();
  let output = '';

  client.connect(23, '192.168.0.15', () => {
    console.log('Connected to TV telnet. Uploading Xray...');
    const cmd = [
      'mkdir -p /var/lib/webosbrew/xray',
      'curl -f -s http://192.168.0.11:8082/xray -o /var/lib/webosbrew/xray/xray',
      'chmod +x /var/lib/webosbrew/xray/xray',
      'curl -f -s http://192.168.0.11:8082/config.json -o /var/lib/webosbrew/xray/config.json',
      'ls -lh /var/lib/webosbrew/xray',
      '/var/lib/webosbrew/xray/xray version',
      'exit'
    ].join('\n') + '\n';

    client.write(cmd);
  });

  client.on('data', d => {
    output += d.toString('utf8');
  });

  client.on('close', () => {
    console.log('TV telnet closed. Output:');
    console.log(output);
    server.close();
  });

  client.on('error', err => {
    console.error('Telnet error:', err.message);
    server.close();
  });
});
