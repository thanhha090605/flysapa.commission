import { NextRequest } from 'next/server';
import { isAllowedTelegramUser, verifyTelegramInitData } from '@/lib/telegram-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const initData = request.headers.get('x-telegram-init-data') ?? '';
  const verified = verifyTelegramInitData(initData);
  if (!verified) return Response.json({ error: 'Phiên Telegram không hợp lệ hoặc đã hết hạn. Hãy đóng Mini App và mở lại từ bot.' }, { status: 401 });
  if (!isAllowedTelegramUser(verified.user.id)) return Response.json({ error: 'Tài khoản Telegram này chưa được cấp quyền tạo lệnh.' }, { status: 403 });

  const webhook = process.env.N8N_AGENT_LIST_WEBHOOK;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhook || !secret) return Response.json({ error: 'Máy chủ chưa cấu hình webhook n8n.' }, { status: 503 });

  try {
    const response = await fetch(webhook, {
      method: 'GET',
      headers: { 'x-commission-secret': secret, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return Response.json({ error: 'Không lấy được danh sách đại lý từ Google Sheets.', detail: payload?.message ?? payload?.error }, { status: 502 });
    const agents = Array.isArray(payload?.agents) ? payload.agents : Array.isArray(payload) ? payload : [];
    return Response.json({ agents });
  } catch {
    return Response.json({ error: 'Không kết nối được n8n. Kiểm tra workflow lấy danh sách đại lý.' }, { status: 502 });
  }
}
