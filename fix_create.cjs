const fs = require('fs');
let c = fs.readFileSync('gas/OrderService.js', 'utf8');

c = c.replace(
  /"",\s*\/\/\s*Cột N \(14\):\s*LOCKED_BY\s*"",\s*\/\/\s*Cột O \(15\):\s*LOCKED_AT/s,
  `payload.lockedBy || "", // Cột N (14): LOCKED_BY
    payload.lockedBy ? new Date() : "", // Cột O (15): LOCKED_AT`
);

fs.writeFileSync('gas/OrderService.js', c);
console.log('Fixed createOrder to support lockedBy.');
