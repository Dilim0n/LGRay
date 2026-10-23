const net = require('net');

let cmd = process.argv.slice(2).join(' ');
if (!cmd) {
    console.error('Usage: node scripts/tv-cmd.js <command>');
    process.exit(1);
}

const s = net.connect(23, '192.168.0.15', () => {
    s.write(cmd + '\n');
});

let timer = null;
s.on('data', d => {
    process.stdout.write(d.toString());
    clearTimeout(timer);
    timer = setTimeout(() => {
        s.end();
    }, 2000);
});
s.on('error', err => {
    console.error('Error:', err.message);
    process.exit(1);
});

