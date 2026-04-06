const fs = require('fs');
let c = fs.readFileSync('gas/OrderService.js', 'utf8');

// fix updateOrderStatus target
// Cột I = cột số 9 -> Cột J = cột số 10
c = c.replace(/sheet\.getRange\(hangCanSua, 9\)\.setValue\(trangThaiMoi\);/g, 'sheet.getRange(hangCanSua, 10).setValue(trangThaiMoi);');

// Cập nhật PAYMENT_STATUS → Cột N = cột số 14 -> Cột M = cột số 13
c = c.replace(/sheet\.getRange\(hangCanSua, 14\)\.setValue\(payload\.paymentStatus\);/g, 'sheet.getRange(hangCanSua, 13).setValue(payload.paymentStatus);');

// addItemsToOrder:
// items in Column E -> D (4)
c = c.replace(/sheet\.getRange\(hangCanSua,\s*5\)\.setValue/g, 'sheet.getRange(hangCanSua, 4).setValue');
// subtotal in Column G -> F (6)
c = c.replace(/sheet\.getRange\(hangCanSua,\s*7\)\.setValue/g, 'sheet.getRange(hangCanSua, 6).setValue');
// total in Column J -> I (9) // wait, TOTAL is I(9). It used to be J(10)?
// In addItemsToOrder, the total column:
c = c.replace(/sheet\.getRange\(hangCanSua,\s*10\)\.setValue\(thanhTienMoi\)/g, 'sheet.getRange(hangCanSua, 9).setValue(thanhTienMoi)');


// In `lockOrder`, locked_by is N (14) and locked_at is O (15).
// In original, it was `sheet.getRange(hangCanSua, 15).setValue(username);`
// and `sheet.getRange(hangCanSua, 16).setValue(timeStr);`
c = c.replace(/sheet\.getRange\(hangCanSua,\s*15\)\.setValue\(username\);/g, 'sheet.getRange(hangCanSua, 14).setValue(username);');
c = c.replace(/sheet\.getRange\(hangCanSua,\s*16\)\.setValue\(timeStr\);/g, 'sheet.getRange(hangCanSua, 15).setValue(timeStr);');

// In `unlockOrder`, locked_by = "", locked_at = ""
c = c.replace(/sheet\.getRange\(hangCanSua,\s*15\)\.setValue\(""\);/g, 'sheet.getRange(hangCanSua, 14).setValue("");');
c = c.replace(/sheet\.getRange\(hangCanSua,\s*16\)\.setValue\(""\);/g, 'sheet.getRange(hangCanSua, 15).setValue("");');

fs.writeFileSync('gas/OrderService.js', c);
console.log('Fixed ranges.');
