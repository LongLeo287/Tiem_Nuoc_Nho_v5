const fs = require('fs');
let c = fs.readFileSync('gas/OrderService.js', 'utf8');

c = c.replace(/const thanhTienCu = Number\(data\[i\]\[7\]\) \|\| 0; \/\/ Cột H: TOTAL_AMOUNT/g, 'const thanhTienCu = Number(data[i][8]) || 0; // TOTAL_AMOUNT');
c = c.replace(/const subtotalCu  = Number\(data\[i\]\[4\]\) \|\| 0; \/\/ Cột E: SUBTOTAL/g, 'const subtotalCu  = Number(data[i][5]) || 0; // SUBTOTAL');

c = c.replace(/sheet\.getRange\(hang, 5\)\.setValue\(subtotalMoi\);                   \/\/ Cột E: SUBTOTAL/g, 'sheet.getRange(hang, 6).setValue(subtotalMoi); // SUBTOTAL');
c = c.replace(/sheet\.getRange\(hang, 8\)\.setValue\(thanhTienMoi\);                  \/\/ Cột H: TOTAL_AMOUNT/g, 'sheet.getRange(hang, 9).setValue(thanhTienMoi); // TOTAL_AMOUNT');

fs.writeFileSync('gas/OrderService.js', c);
console.log('Fixed more indices.');
