import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { isAllowedTelegramUser, verifyTelegramInitData } from '@/lib/telegram-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_TOTAL_BYTES = Number(process.env.MAX_UPLOAD_TOTAL_BYTES ?? 3_800_000);
const MAX_FILE_BYTES = Number(process.env.MAX_SINGLE_FILE_BYTES ?? 1_700_000);
const FILE_FIELDS = ['idFront', 'idBack', 'bankProof'] as const;

function normalizePersonName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi-VN');
}

function stringField(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  const verified = verifyTelegramInitData(request.headers.get('x-telegram-init-data') ?? '');
  if (!verified) return Response.json({ error: 'Phiên Telegram không hợp lệ hoặc đã hết hạn. Hãy mở lại Mini App.' }, { status: 401 });
  if (!isAllowedTelegramUser(verified.user.id)) return Response.json({ error: 'Tài khoản Telegram này chưa được cấp quyền tạo lệnh.' }, { status: 403 });

  const webhook = process.env.N8N_COMMISSION_CREATE_WEBHOOK;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhook || !secret) return Response.json({ error: 'Máy chủ chưa cấu hình webhook tạo lệnh.' }, { status: 503 });

  let form: FormData;
  try { form = await request.formData(); }
  catch { return Response.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 }); }

  const mode = stringField(form, 'mode');
  const date = stringField(form, 'paymentDate');
  const amount = Number(stringField(form, 'amount'));
  const countUnconfirmed = stringField(form, 'countUnconfirmed') === 'true';
  const guestCountRaw = stringField(form, 'guestCount');
  const guestCount = guestCountRaw ? Number(guestCountRaw) : null;
  const fullName = stringField(form, 'fullName');
  const cccd = stringField(form, 'cccd').replace(/\s+/g, '');
  const accountNumber = stringField(form, 'accountNumber').replace(/[\s-]/g, '');
  const accountHolder = stringField(form, 'accountHolder');
  const agentCode = stringField(form, 'agentCode');

  if (!['existing', 'new'].includes(mode)) return Response.json({ error: 'Loại đại lý không hợp lệ.' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return Response.json({ error: 'Ngày thanh toán không hợp lệ.' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000_000) return Response.json({ error: 'Số tiền hoa hồng phải lớn hơn 0.' }, { status: 400 });
  if (!countUnconfirmed && (!Number.isInteger(guestCount) || (guestCount as number) < 0 || (guestCount as number) > 100_000)) return Response.json({ error: 'Nhập số khách hợp lệ hoặc chọn “Chưa xác nhận số khách”.' }, { status: 400 });
  if (mode === 'existing' && !agentCode) return Response.json({ error: 'Hãy chọn đại lý.' }, { status: 400 });

  const getFile = (key: string) => {
    const value = form.get(key);
    return value instanceof File && value.size > 0 ? value : null;
  };
  const idFront = getFile('idFront');
  const idBack = getFile('idBack');
  const bankProof = getFile('bankProof');

  if (mode === 'new') {
    if (!fullName || !/^\d{12}$/.test(cccd)) return Response.json({ error: 'Đại lý mới cần họ tên và CCCD gồm 12 chữ số.' }, { status: 400 });
    if (!stringField(form, 'dob') || !stringField(form, 'hometown') || !stringField(form, 'residence') || !stringField(form, 'bdRepresentative')) {
      return Response.json({ error: 'Vui lòng bổ sung ngày sinh, quê quán, nơi thường trú và BD đại diện theo hướng dẫn sheet.' }, { status: 400 });
    }
    if (!idFront || !idBack) return Response.json({ error: 'Đại lý mới cần ảnh CCCD mặt trước và mặt sau.' }, { status: 400 });
    if (!stringField(form, 'bankName') || !/^\d{6,20}$/.test(accountNumber) || !accountHolder) {
      return Response.json({ error: 'Vui lòng kiểm tra tên ngân hàng, STK và chủ tài khoản.' }, { status: 400 });
    }
    if (normalizePersonName(accountHolder) !== normalizePersonName(fullName)) {
      return Response.json({ error: 'Tên chủ tài khoản phải trùng với họ tên trên CCCD theo quy tắc sheet. Hãy kiểm tra lại.' }, { status: 400 });
    }
  }

  let totalFileBytes = 0;
  for (const key of FILE_FIELDS) {
    const value = getFile(key);
    if (!value) continue;
    totalFileBytes += value.size;
    if (value.size > MAX_FILE_BYTES) return Response.json({ error: `Tệp ${value.name} quá lớn. Hãy chụp lại hoặc giảm kích thước ảnh.` }, { status: 413 });
    if (!value.type.startsWith('image/')) return Response.json({ error: 'Tệp CCCD và ảnh ngân hàng phải là ảnh JPG/PNG/WEBP.' }, { status: 415 });
  }
  if (totalFileBytes > MAX_TOTAL_BYTES) return Response.json({ error: 'Tổng dung lượng ảnh quá lớn. Hãy giảm dung lượng ảnh và gửi lại.' }, { status: 413 });

  const commissionId = `HH-${date.replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const submittedAt = new Date().toISOString();
  const forward = new FormData();
  const allowedTextFields = [
    'mode', 'agentCode', 'paymentDate', 'guestCount', 'countUnconfirmed', 'amount',
    'fullName', 'cccd', 'dob', 'hometown', 'residence', 'bankName', 'accountNumber',
    'accountHolder', 'bdRepresentative', 'note',
  ];
  for (const key of allowedTextFields) forward.append(key, stringField(form, key));
  forward.set('guestCount', countUnconfirmed ? '' : String(guestCount));
  forward.set('countUnconfirmed', String(countUnconfirmed));
  forward.set('status', 'Chờ chi');
  forward.set('commissionId', commissionId);
  forward.set('submittedAt', submittedAt);
  forward.set('telegramUserId', String(verified.user.id));
  forward.set('telegramName', [verified.user.first_name, verified.user.last_name].filter(Boolean).join(' '));
  forward.set('telegramUsername', verified.user.username ?? '');
  forward.set('source', 'telegram-miniapp');
  for (const key of FILE_FIELDS) {
    const file = getFile(key);
    if (file) forward.append(key, file, file.name || `${key}.jpg`);
  }

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'x-commission-secret': secret, accept: 'application/json' },
      body: forward,
      signal: AbortSignal.timeout(25_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      const message = typeof payload?.error === 'string' ? payload.error : 'n8n chưa xác nhận lưu lệnh. Kiểm tra execution trong n8n trước khi gửi lại để tránh tạo trùng.';
      return Response.json({ error: message, commissionId }, { status: 502 });
    }
    return Response.json({ ok: true, commissionId, status: payload?.status ?? 'Chờ chi', message: payload?.message ?? 'Lệnh đã được n8n tiếp nhận.' });
  } catch {
    return Response.json({ error: 'Không nhận được phản hồi từ n8n. Hãy kiểm tra Executions trước khi gửi lại để tránh tạo lệnh trùng.', commissionId }, { status: 502 });
  }
}
