const net = require('net');
const fs = require('fs');

const SUBNET = '192.168.68.';
const port = 9100;
const results = [];

console.log('Scanning subnet ' + SUBNET + '* on port ' + port + '...');

let activeScans = 0;
for (let i = 1; i <= 254; i++) {
  const ip = SUBNET + i;
  activeScans++;
  const socket = new net.Socket();
  socket.setTimeout(2000); 

  socket.on('connect', () => {
    console.log('Found Printer (Port 9100 open) at: ' + ip);
    results.push(ip);
    socket.destroy();
  });

  socket.on('error', () => {
    socket.destroy();
  });

  socket.on('timeout', () => {
    socket.destroy();
  });

  socket.on('close', () => {
    activeScans--;
    if (activeScans === 0) {
      fs.writeFileSync('scan_result.txt', JSON.stringify(results));
      console.log('Scan complete. Results saved');
    }
  });
}
