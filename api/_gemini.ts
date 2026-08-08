/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │           LÕI PROXY GEMINI — CHẠY PHÍA SERVER               │
 * └─────────────────────────────────────────────────────────────┘
 *
 * GEMINI_API_KEY chỉ tồn tại ở đây. Client KHÔNG bao giờ thấy key.
 *
 * File có tiền tố `_` nên Vercel không coi là route; nó được import
 * bởi api/ai/generate.ts (bản serverless) và server.ts (bản local).
 */
import { GoogleGenAI } from '@google/genai';

export interface GenerateRequest {
  model?: string;
  contents?: string;
  config?: Record<string, unknown>;
}

export interface GenerateResult {
  status: number;
  body: { text: string } | { error: string };
}

const DEFAULT_MODEL = 'gemini-3-flash-preview';

/** Chỉ cho phép model app thực sự dùng, tránh biến proxy thành cổng mở cho người lạ */
const ALLOWED_MODELS = new Set([DEFAULT_MODEL]);

/** Chặn prompt quá dài để không bị đốt quota */
const MAX_PROMPT_CHARS = 20000;

export async function generateContent(body: GenerateRequest): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { status: 503, body: { error: 'Máy chủ chưa cấu hình GEMINI_API_KEY' } };
  }

  const model = body.model || DEFAULT_MODEL;
  if (!ALLOWED_MODELS.has(model)) {
    return { status: 400, body: { error: `Model không được phép: ${model}` } };
  }

  const contents = typeof body.contents === 'string' ? body.contents.trim() : '';
  if (!contents) {
    return { status: 400, body: { error: 'Thiếu nội dung prompt' } };
  }
  if (contents.length > MAX_PROMPT_CHARS) {
    return { status: 413, body: { error: 'Prompt quá dài' } };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents,
      ...(body.config ? { config: body.config } : {}),
    } as any);
    return { status: 200, body: { text: response.text || '' } };
  } catch (err: any) {
    const raw = String(err?.message || err);
    // Log đầy đủ ở server, nhưng KHÔNG trả nguyên văn về client —
    // thông báo lỗi của SDK có thể lộ chi tiết cấu hình.
    console.error('[ai-proxy] generateContent lỗi:', raw);

    // Giữ mã 429 để client nhận biết hết quota và tự lùi (client đang dò '429')
    if (/429|quota|RESOURCE_EXHAUSTED/i.test(raw)) {
      return { status: 429, body: { error: 'AI quá tải hoặc hết quota (429)' } };
    }
    return { status: 502, body: { error: 'Không gọi được AI' } };
  }
}
