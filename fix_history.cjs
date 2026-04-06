const fs = require('fs');
let content = fs.readFileSync('src/components/OrderHistory.tsx', 'utf8');

// Replace STATUS_CONFIG keys and values
content = content.replace(/'Đang xử lý':/g, "'Đã nhận':");
content = content.replace(/text: 'Đang xử lý',/g, "text: 'Đã nhận',");

content = content.replace(/'Đang pha chế':/g, "'Đang làm':");
content = content.replace(/text: 'Đang pha',/g, "text: 'Đang làm',");

// Replace in buttons and conditionals
content = content.replace(/orderStatus !== 'Đang pha chế'/g, "orderStatus !== 'Đang làm'");
content = content.replace(/orderStatus !== 'Đang xử lý'/g, "orderStatus !== 'Đã nhận'");
content = content.replace(/updateOrderStatus\(order\.orderId, 'Đang xử lý'\)/g, "updateOrderStatus(order.orderId, 'Đã nhận')");
content = content.replace(/order\.orderStatus === 'Đang xử lý'/g, "order.orderStatus === 'Đã nhận'");
content = content.replace(/updateOrderStatus\(order\.orderId, 'Đang pha chế'\)/g, "updateOrderStatus(order.orderId, 'Đang làm')");
content = content.replace(/order\.orderStatus === 'Đang pha chế'/g, "order.orderStatus === 'Đang làm'");

fs.writeFileSync('src/components/OrderHistory.tsx', content);
console.log('Fixed OrderHistory.tsx');
