import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import net from "net";
import cors from "cors";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  const PORT = 3000;

  // Store connected clients
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log("New client connected via WebSocket");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Broadcast new order to all other clients
        if (data.type === "NEW_ORDER") {
          console.log("New order received, broadcasting...");
          clients.forEach((client) => {
            // We broadcast to everyone including the sender for simplicity, 
            // or we could exclude the sender. Let's send to all.
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ 
                type: "NEW_ORDER_NOTIFICATION", 
                order: data.order,
                timestamp: new Date().toISOString()
              }));
            }
          });
        }
      } catch (e) {
        console.error("Error parsing message", e);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log("Client disconnected from WebSocket");
    });
  });

  // API routes
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ─── THERMAL PRINTER via ESC/POS over TCP ───────────────────────────────────
  function buildEscPos(order: any): Buffer {
    const ESC = '\x1B';
    const GS  = '\x1D';
    const LF  = '\x0A';
    const W   = 42; // chars per line on 80mm paper

    // Strip Vietnamese diacritics so latin1 printers can render
    function norm(str: string = ''): string {
      return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'));
    }

    function sep()    { return '-'.repeat(W) + LF; }
    function center(t: string) {
      const pad = Math.max(0, Math.floor((W - t.length) / 2));
      return ' '.repeat(pad) + t + LF;
    }
    function row(name: string, qty: number, price: number) {
      const pr = price.toLocaleString('vi-VN') + 'd';
      const qt = 'x' + qty;
      const avail = W - qt.length - pr.length - 2;
      const nm = name.substring(0, avail).padEnd(avail);
      return `${nm} ${qt} ${pr}` + LF;
    }

    let r = '';
    r += ESC + '@';            // init
    r += ESC + 'a' + '\x01'; // center
    r += GS  + '!' + '\x11'; // 2x size
    r += norm('TIEM NUOC NHO') + LF;
    r += GS  + '!' + '\x00';
    r += norm('Hoa don thanh toan') + LF + LF;

    r += ESC + 'a' + '\x00'; // left
    r += sep();
    r += `Ma don: #${String(order.orderId || '').slice(-8)}` + LF;
    r += `Thoi gian: ${new Date(order.timestamp).toLocaleString('vi-VN')}` + LF;
    if (order.tableNumber) r += `So ban: ${order.tableNumber}` + LF;
    r += sep();
    r += 'Mon'.padEnd(W - 12) + '  SL    Tien' + LF;
    r += sep();

    for (const item of (order.items || [])) {
      r += row(
        norm(item.name),
        item.quantity,
        (item.unitPrice || 0) * item.quantity
      );
      const opts = [item.temperature, item.iceLevel && item.iceLevel + ' da', item.sugarLevel && item.sugarLevel + ' duong']
        .filter(Boolean).join(', ');
      if (opts) r += '  > ' + norm(opts) + LF;
    }

    r += sep();
    r += ESC + 'a' + '\x01';  // center
    r += ESC + 'E' + '\x01';  // bold
    r += GS  + '!' + '\x01';  // 2x wide
    r += 'TONG: ' + (order.total || 0).toLocaleString('vi-VN') + 'd' + LF;
    r += GS  + '!' + '\x00';
    r += ESC + 'E' + '\x00';
    if (order.paymentMethod) r += norm('TT: ' + order.paymentMethod) + LF;
    r += LF;
    r += sep();
    r += center('CAM ON QUY KHACH!');
    r += center('Hen gap lai lan sau :)');
    r += LF + LF + LF;
    r += GS + 'V' + '\x41' + '\x00'; // full cut

    return Buffer.from(r, 'latin1');
  }

  // Track orders currently being printed to avoid double-printing spam
  const printingOrders = new Set<string>();

  app.post('/api/print', (req, res) => {
    const { printerIp, printerPort, order } = req.body || {};
    if (!printerIp || !order || !order.orderId) {
      res.status(400).json({ success: false, error: 'Thiếu thông tin máy in hoặc đơn hàng' });
      return;
    }

    const orderId = order.orderId;
    if (printingOrders.has(orderId)) {
      // Prevent mashing the print button
      res.status(429).json({ success: false, error: 'Đơn hàng này đang được in, vui lòng đợi.' });
      return;
    }

    // Add to lock
    printingOrders.add(orderId);

    // Process socket
    const port = Number(printerPort) || 9100;
    const socket = new net.Socket();
    let isResponseSent = false;

    const cleanup = () => {
      socket.destroy();
      setTimeout(() => printingOrders.delete(orderId), 3000); // cooldown 3s for retry
    };

    socket.setTimeout(2500); // 2.5s network connection timeout 

    socket.connect(port, printerIp, () => {
      try {
        socket.write(buildEscPos(order));
        if (!isResponseSent) {
          isResponseSent = true;
          res.json({ success: true, message: 'Đã in thành công' });
        }
        // Give the socket some time to flush the buffer before closing
        setTimeout(cleanup, 1000);
      } catch (e: any) {
        console.error('Lỗi khi gửi dữ liệu in:', e.message);
        if (!isResponseSent) {
          isResponseSent = true;
          res.status(500).json({ success: false, error: 'Lỗi in: ' + e.message });
        }
        cleanup();
      }
    });

    socket.on('error', (e: any) => {
      console.error('Socket error trên máy in:', e.message);
      if (!isResponseSent) {
        isResponseSent = true;
        res.status(500).json({ success: false, error: 'Không thể kết nối máy in: ' + e.message });
      }
      cleanup();
    });
    
    socket.on('timeout', () => {
      console.error('Timeout máy in:', printerIp);
      if (!isResponseSent) {
        isResponseSent = true;
        res.status(500).json({ success: false, error: 'Phản hồi lệnh in quá chậm (Timeout): ' + printerIp });
      }
      cleanup();
    });
  });
  // ────────────────────────────────────────────────────────────────────────────

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
