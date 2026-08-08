/**
 * Serverless function cho bản deploy Vercel: POST /api/ai/generate
 *
 * Bản local tương ứng nằm trong server.ts — cả hai dùng chung lõi
 * api/_gemini.ts để không lệch hành vi.
 */
import { generateContent } from '../_gemini';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const result = await generateContent(body);
  res.status(result.status).json(result.body);
}
