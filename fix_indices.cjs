const fs = require('fs');
let c = fs.readFileSync('gas/OrderService.js', 'utf8');

c = c.replace(/const rawItems = row\[\d+\];/, 'const rawItems = row[3];');
c = c.replace(/BRANCH_NAME: row\[\d+\] \? row\[\d+\]\.toString\(\) : "Chi nhánh"/, 'BRANCH_NAME: row[11] ? row[11].toString() : "Chi nhánh"');
c = c.replace(/TABLE_NO: row\[\d+\] \? row\[\d+\]\.toString\(\) : ""/, 'TABLE_NO: row[2] ? row[2].toString() : ""');
c = c.replace(/NOTES: row\[\d+\] \? row\[\d+\]\.toString\(\) : ""/, 'NOTES: row[4] ? row[4].toString() : ""');
c = c.replace(/SUBTOTAL: Number\(row\[\d+\]\) \|\| 0/, 'SUBTOTAL: Number(row[5]) || 0');
c = c.replace(/DISCOUNT: Number\(row\[\d+\]\) \|\| 0/, 'DISCOUNT: Number(row[6]) || 0');
c = c.replace(/VAT_AMOUNT: Number\(row\[\d+\]\) \|\| 0/, 'VAT_AMOUNT: Number(row[7]) || 0');
c = c.replace(/TOTAL_AMOUNT: Number\(row\[\d+\]\) \|\| 0/, 'TOTAL_AMOUNT: Number(row[8]) || 0');
c = c.replace(/STATUS: row\[\d+\] \? row\[\d+\]\.toString\(\) : "Hoàn thành"/, 'STATUS: row[9] ? row[9].toString() : "Hoàn thành"');
c = c.replace(/PAYMENT_METHOD: row\[\d+\] \? row\[\d+\]\.toString\(\) : "Tiền mặt"/, 'PAYMENT_METHOD: row[10] ? row[10].toString() : "Tiền mặt"');
c = c.replace(/PAYMENT_STATUS: row\[\d+\] \? row\[\d+\]\.toString\(\) : "Chưa thanh toán"/, 'PAYMENT_STATUS: row[12] ? row[12].toString() : "Chưa thanh toán"');
c = c.replace(/LOCKED_BY: row\[\d+\] \? row\[\d+\]\.toString\(\) : ""/, 'LOCKED_BY: row[13] ? row[13].toString() : ""');
c = c.replace(/LOCKED_AT: row\[\d+\] \? row\[\d+\]\.toString\(\) : ""/, 'LOCKED_AT: row[14] ? row[14].toString() : ""');

// Also fix createNewOrder array
c = c.replace(/orderId,\s*\/\/\s*Cột A.+?\n([.\s\S]+?)\]\);/g, (match) => {
  return `orderId,         // Cột A (0): ORDER_ID
    dateStr,         // Cột B (1): CREATED_AT
    tableNo,         // Cột C (2): TABLE_NO
    itemsStr,        // Cột D (3): ITEMS
    notes,           // Cột E (4): NOTES
    subtotal,        // Cột F (5): SUBTOTAL
    discount,        // Cột G (6): DISCOUNT
    vatAmount,       // Cột H (7): VAT_AMOUNT
    thanhTien,       // Cột I (8): TOTAL_AMOUNT
    trangThai,       // Cột J (9): ORDER_STATUS
    thanhToan,       // Cột K (10): PAYMENT_METHOD
    branchName,      // Cột L (11): BRANCH_NAME
    "Chưa thanh toán", // Cột M (12): PAYMENT_STATUS
    "",              // Cột N (13): LOCKED_BY
    "",              // Cột O (14): LOCKED_AT
  ]);`;
});

// Fix CustomFunctions.js mapping
let custom = fs.readFileSync('gas/CustomFunctions.js', 'utf8');
custom = custom.replace(/const COL_CREATED_AT\s*=\s*\d+;/, 'const COL_CREATED_AT = 1;');
custom = custom.replace(/const COL_TABLE\s*=\s*\d+;/, 'const COL_TABLE = 2;');
custom = custom.replace(/const COL_NOTES\s*=\s*\d+;/, 'const COL_NOTES = 4;');
custom = custom.replace(/const COL_TOTAL\s*=\s*\d+;/, 'const COL_TOTAL = 8;');
custom = custom.replace(/const COL_STATUS\s*=\s*\d+;/, 'const COL_STATUS = 9;');
custom = custom.replace(/const COL_BRANCH\s*=\s*\d+;/, 'const COL_BRANCH = 11;');
fs.writeFileSync('gas/CustomFunctions.js', custom);

// Fix DashboardService.js mapping
let dbg = fs.readFileSync('gas/DashboardService.js', 'utf8');
dbg = dbg.replace(/var totalVal = Number\(row\[\d+\]\)/g, 'var totalVal = Number(row[8])');
dbg = dbg.replace(/const status = row\[\d+\]/g, 'const status = row[9]');
fs.writeFileSync('gas/DashboardService.js', dbg);

fs.writeFileSync('gas/OrderService.js', c);
console.log('Fixed all mappings.');
