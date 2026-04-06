const fs = require('fs');
let c = fs.readFileSync('gas/OrderService.js', 'utf8');

c = c.replace(/Cập nhật tổng tiền \(cột E = SUBTOTAL, cột H = TOTAL_AMOUNT\)/g, 'Cập nhật tổng tiền (cột F = SUBTOTAL, cột I = TOTAL_AMOUNT)');
c = c.replace(/sheet\.getRange\(hang, 5\)\.setValue\(subtotal\);/g, 'sheet.getRange(hang, 6).setValue(subtotal);');
c = c.replace(/sheet\.getRange\(hang, 8\)\.setValue\(total\);/g, 'sheet.getRange(hang, 9).setValue(total);');

c = c.replace(/if \(payload\.customerName  !== undefined\) sheet\.getRange\(hang, 11\)\.setValue\(payload\.customerName\);/g, ''); // delete old customerName line, we use branchName now.
c = c.replace(/if \(payload\.branchName    !== undefined\) sheet\.getRange\(hang, 12\)\.setValue\(payload\.branchName\);/g, ''); // in case I added it
c = c.replace(/if \(payload\.tableNumber   !== undefined\) sheet\.getRange\(hang, 3\)\.setValue\(payload\.tableNumber\);/,
  '$&\n    if (payload.branchName !== undefined) sheet.getRange(hang, 12).setValue(payload.branchName);'); // BRANCH_NAME is 12 (L)

c = c.replace(/if \(payload\.notes         !== undefined\) sheet\.getRange\(hang, 13\)\.setValue\(payload\.notes\);/g, 'if (payload.notes         !== undefined) sheet.getRange(hang, 5).setValue(payload.notes);'); // NOTES is E (5)
c = c.replace(/if \(payload\.status        !== undefined\) sheet\.getRange\(hang, 9\)\.setValue\(payload\.status\);/g, 'if (payload.status        !== undefined) sheet.getRange(hang, 10).setValue(payload.status);'); // ORDER_STATUS is J (10)

c = c.replace(/sheet\.getRange\(hang, 15\)\.setValue\(""\);/g, 'sheet.getRange(hang, 14).setValue("");\n    sheet.getRange(hang, 15).setValue("");'); // Unlock both LOCKED_BY (14) and LOCKED_AT (15)

// Also in Cart.tsx, change Nháp to Chờ xử lý and set lockedBy
let cart = fs.readFileSync('src/components/Cart.tsx', 'utf8');
cart = cart.replace(/orderStatus:\s*'Nháp',/g, "orderStatus:   'Chờ xử lý',\n      lockedBy:     currentUser?.name || 'Vô danh',");
cart = cart.replace(/\.filter\(o => o\.orderStatus === 'Nháp'\)/g, ".filter(o => o.lockedBy && o.lockedBy !== '')");
cart = cart.replace(/orderStatus = 'Nháp'/g, "lockedBy != ''");
fs.writeFileSync('src/components/Cart.tsx', cart);

fs.writeFileSync('gas/OrderService.js', c);
console.log('Fixed editOrder and Cart.tsx drafts mechanism.');
