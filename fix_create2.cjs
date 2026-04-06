const fs = require('fs');
let c = fs.readFileSync('gas/OrderService.js', 'utf8');

c = c.replace(
  /\"\",\s*\/\/\s*Cột N \(13\):\s*LOCKED_BY/,
  'payload.lockedBy || "",              // Cột N (13): LOCKED_BY'
);

c = c.replace(
  /\"\",\s*\/\/\s*Cột O \(14\):\s*LOCKED_AT/,
  'payload.lockedBy ? new Date() : "",              // Cột O (14): LOCKED_AT'
);

fs.writeFileSync('gas/OrderService.js', c);
console.log('Fixed createOrder correctly.');
