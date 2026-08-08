/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │           CLIENT GỌI AI QUA PROXY                           │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Trước đây mỗi component tự `new GoogleGenAI({ apiKey: ... })`, khiến
 * vite nhúng GEMINI_API_KEY thẳng vào bundle gửi xuống trình duyệt.
 *
 * Giờ client chỉ gọi POST /api/ai/generate; key nằm phía server
 * (api/_gemini.ts). Schema JSON truyền dạng chuỗi thuần ('OBJECT',
 * 'STRING'…) đúng như giá trị enum Type của SDK, nên client không cần
 * phụ thuộc @google/genai nữa.
 */

export interface AiGenerateRequest {
  model: string;
  contents: string;
  config?: Record<string, unknown>;
}

export interface AiGenerateResponse {
  text: string;
}

/**
 * Gọi AI qua proxy.
 * Ném Error khi thất bại; message có kèm mã lỗi (vd '429') để chỗ gọi
 * vẫn dò được quota như trước.
 */
export async function generateContent(req: AiGenerateRequest): Promise<AiGenerateResponse> {
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({} as any));
    throw new Error(body?.error || `Lỗi gọi AI (${res.status})`);
  }

  const body = await res.json().catch(() => ({} as any));
  return { text: typeof body?.text === 'string' ? body.text : '' };
}
