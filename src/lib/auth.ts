import { SignJWT, jwtVerify } from 'jose';

// Đọc JWT secret từ biến môi trường
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default_secret_key_for_development');

/**
 * Tạo JWT token (expires 8h)
 */
export async function signToken(userId: string, role: string) {
  const alg = 'HS256';
  const jwt = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
  return jwt;
}

/**
 * Decode và validate token
 */
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Middleware helper để kiểm tra role (dành cho Express/Node.js backend nếu cần)
 */
export function requireRole(role: string) {
  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    try {
      const decoded = await verifyToken(token);
      if (decoded.role !== role && decoded.role !== 'manager') {
        return res.status(403).json({ error: 'Không có quyền truy cập' });
      }
      // Gắn thông tin user vào request
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Token không hợp lệ' });
    }
  };
}
