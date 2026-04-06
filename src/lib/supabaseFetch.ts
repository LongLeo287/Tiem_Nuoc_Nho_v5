import { supabase } from './supabase';

export const supabaseFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  try {
    const urlString = typeof url === 'string' ? url : (url instanceof URL ? url.toString() : url.url);
    let action = '';
    let payload: any = {};
    
    if (urlString.includes('?action=')) {
      const match = urlString.match(/\?action=([^&]+)/);
      action = match ? match[1] : '';
    } 
    
    if (init?.body) {
      try {
        payload = JSON.parse(init.body as string);
        if (!action) action = payload.action;
      } catch (e) {
        // ignore
      }
    }

    const jsonResponse = (data: any) => new Response(JSON.stringify(data), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

    switch (action) {
      case 'getMenu':
      case 'getOrders':
      case 'getSoTay':
      case 'getDashboard': {
        console.log(`[Middleware] Forwarding READ action '${action}' directly to Google Sheets Master DB.`);
        return window.fetch(url, init);
      }
      
      case 'createOrder':
      case 'editOrder': {
        // Dùng ORDER_ID làm ID
        const orderId = payload.orderId || payload.ORDER_ID || `ORD-${Date.now()}`;
        const finalPayload = { ...payload, ORDER_ID: orderId, MA_DON: orderId, TIMESTAMP: new Date().toISOString() };
        const { error } = await supabase.from('orders').upsert({ id: orderId, payload: finalPayload, updated_at: new Date().toISOString() });
        if (error) throw error;
        return jsonResponse({ status: 'success' });
      }
      
      case 'updateOrderStatus': {
        const orderId = payload.orderId;
        const { data } = await supabase.from('orders').select('payload').eq('id', orderId).single();
        if (data) {
          const updatedPayload = { ...data.payload, STATUS: payload.status, TRANG_THAI: payload.status, ORDER_STATUS: payload.status };
          // Có thể merge cả paymentStatus, paymentMethod nếu có:
          if (payload.paymentStatus) updatedPayload.PAYMENT_STATUS = payload.paymentStatus;
          if (payload.paymentMethod) updatedPayload.PAYMENT_METHOD = payload.paymentMethod;
          
          await supabase.from('orders').update({ payload: updatedPayload, updated_at: new Date().toISOString() }).eq('id', orderId);
        }
        return jsonResponse({ status: 'success' });
      }
      
      case 'deleteOrder': {
        const orderId = payload.orderId;
        await supabase.from('orders').delete().eq('id', orderId);
        return jsonResponse({ status: 'success' });
      }

      case 'processOrderInventory': {
        // Mock processing inventory in Supabase since full table migrations for inventory tracking is next phase
        return jsonResponse({ status: 'success', warnings: [] });
      }
      
      case 'addSoTay': {
        const id = payload.id_thu_chi || `ST-${Date.now()}`;
        const finalPayload = { ...payload, id_thu_chi: id };
        await supabase.from('sotay').upsert({ id, payload: finalPayload, updated_at: new Date().toISOString() });
        return jsonResponse({ status: 'success' });
      }
      
      case 'deleteSoTay': {
        await supabase.from('sotay').delete().eq('id', payload.id);
        return jsonResponse({ status: 'success' });
      }
      
      case 'lockOrder': {
        const orderId = payload.orderId;
        const { data } = await supabase.from('orders').select('payload').eq('id', orderId).single();
        if (data) {
          data.payload.LOCKED_BY = payload.staffName;
          await supabase.from('orders').update({ payload: data.payload }).eq('id', orderId);
        }
        return jsonResponse({ status: 'success' });
      }
      
      case 'unlockOrder': {
        const orderId = payload.orderId;
        const { data } = await supabase.from('orders').select('payload').eq('id', orderId).single();
        if (data) {
          data.payload.LOCKED_BY = '';
          await supabase.from('orders').update({ payload: data.payload }).eq('id', orderId);
        }
        return jsonResponse({ status: 'success' });
      }

      default:
        // Cố gắng fallback về web fetch thông thường nếu không phải API actions của GAS
        console.warn('Unknown Supabase action, falling back to native fetch:', action);
        return window.fetch(url, init);
    }
  } catch (err: any) {
    console.error('supabaseFetch Error:', err);
    return new Response(JSON.stringify({ status: 'error', message: err.message || String(err) }), { status: 500 });
  }
};
