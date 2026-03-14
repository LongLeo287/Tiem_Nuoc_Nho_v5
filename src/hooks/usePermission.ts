import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

// Helper để decode JWT payload (client-side)
function decodeJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function usePermission() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Đọc role từ JWT được lưu trong httpOnly cookie
    // Lưu ý: JS không thể đọc trực tiếp httpOnly cookie.
    // Trong thực tế, server sẽ cung cấp endpoint /api/auth/me hoặc set một cookie không httpOnly (ví dụ: 'user_role')
    // Ở đây chúng ta cố gắng đọc 'token' (nếu không httpOnly) hoặc 'user_role' từ cookie.
    const token = Cookies.get('token');
    const userRoleCookie = Cookies.get('user_role');
    
    if (userRoleCookie) {
      setRole(userRoleCookie);
    } else if (token) {
      const payload = decodeJwtPayload(token);
      if (payload && payload.role) {
        setRole(payload.role);
      }
    } else {
      // Fallback mặc định cho demo (nếu không có token)
      setRole('manager'); // Đặt là manager để có thể test UI
    }
  }, []);

  const can = (action: string) => {
    if (role === 'manager') return true;
    if (role === 'cashier') {
      const allowedActions = ['POST /api/orders', 'GET /api/menu', 'GET /api/orders/my'];
      return allowedActions.includes(action);
    }
    return false;
  };

  return {
    role,
    can,
    isManager: role === 'manager',
    isCashier: role === 'cashier'
  };
}
