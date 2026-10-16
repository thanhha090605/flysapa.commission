import { NextRequest } from 'next/server';
import { isAllowedTelegramUser, verifyTelegramInitData } from '@/lib/telegram-auth';
import { parseOcrCandidates } from '@/lib/ocr-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_FILE_BYTES = Number(process.env.MAX_SINGLE_FILE_BYTES ?? 1_700_000);

export async function POST(request: NextRequest) {
  const verified = verifyTelegramInitData(request.headers.get('x-telegram-init-data') ?? '');
  if (!verified) return Response.json({ error: 'Phiên Telegram không hợp lệ. Hãy mở lại Mini App từ bot.' }, { status: 401 });
  if (!isAllowedTelegramUser(verified.user.id)) return Response.json({ error: 'Tài khoản Telegram này chưa được cấp quyền.' }, { status: 403 });

  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) return Response.json({ error: 'Thiếu OCR_SPACE_API_KEY trên Vercel.' }, { status: 503 });

  let form: FormData;
  try { form = await request.formData(); }
  catch { return Response.json({ error: 'Không đọc được tệp tải lên.' }, { status: 400 }); }

  const file = form.get('file');
  const documentType = form.get('documentType') === 'bank' ? 'bank' : 'identity';
  if (!(file instanceof File)) return Response.json({ error: 'Bạn chưa chọn ảnh.' }, { status: 400 });
  if (!file.type.startsWith('image/')) return Response.json({ error: 'OCR chỉ nhận ảnh JPG/PNG/WEBP. Hãy chuyển HEIC/PDF thành ảnh trước khi đọc.' }, { status: 415 });
  if (file.size > MAX_FILE_BYTES) return Response.json({ error: `Ảnh quá lớn. Hãy chọn ảnh dưới ${(MAX_FILE_BYTES / 1_000_000).toFixed(1)} MB.` }, { status: 413 });

  try {
    const ocrForm = new FormData();
    ocrForm.append('file', file, file.name || 'upload.jpg');
    ocrForm.append('language', 'vnm');
    ocrForm.append('isOverlayRequired', 'false');
    ocrForm.append('OCREngine', '2');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: apiKey },
      body: ocrForm,
      signal: AbortSignal.timeout(25_000),
    });
    const result = await response.json() as {
      IsErroredOnProcessing?: boolean;
      ErrorMessage?: string | string[];
      ParsedResults?: Array<{ ParsedText?: string; ErrorMessage?: string }>;
    };
    const text = result.ParsedResults?.map((item) => item.ParsedText ?? '').join('\n').trim() ?? '';
    if (!response.ok || result.IsErroredOnProcessing || !text) {
      const apiError = Array.isArray(result.ErrorMessage) ? result.ErrorMessage.join('; ') : result.ErrorMessage;
      return Response.json({ error: apiError || result.ParsedResults?.[0]?.ErrorMessage || 'OCR không đọc rõ nội dung. Hãy chụp thẳng, đủ sáng và kiểm tra lại thủ công.' }, { status: 422 });
    }

    return Response.json({ text, candidates: parseOcrCandidates(text, documentType) });
  } catch {
    return Response.json({ error: 'Không gọi được OCR.space. Thử lại sau hoặc nhập thông tin thủ công.' }, { status: 502 });
  }
}
