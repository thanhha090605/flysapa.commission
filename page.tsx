'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  close: () => void;
  colorScheme?: 'light' | 'dark';
  MainButton?: { setText: (text: string) => void; hide: () => void };
};

declare global {
  interface Window { Telegram?: { WebApp?: TelegramWebApp } }
}

type Agent = {
  code: string;
  name: string;
  cccd?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  dob?: string;
  hometown?: string;
  residence?: string;
  bdRepresentative?: string;
  idFolderUrl?: string;
};

type OcrCandidates = {
  fullName: string; cccd: string; dob: string; hometown: string; residence: string;
  bankName: string; accountNumber: string; accountHolder: string;
};

type OrderForm = {
  agentCode: string;
  paymentDate: string;
  guestCount: string;
  countUnconfirmed: boolean;
  amount: string;
  fullName: string;
  cccd: string;
  dob: string;
  hometown: string;
  residence: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  bdRepresentative: string;
  note: string;
};

const EMPTY_OCR: OcrCandidates = { fullName: '', cccd: '', dob: '', hometown: '', residence: '', bankName: '', accountNumber: '', accountHolder: '' };

function localDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function optimizePhoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1450;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) { bitmap.close(); return file; }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78));
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    // If this browser cannot decode the file (some HEIC files), the server will display a clear error.
    return file;
  }
}

function normalizePersonName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi-VN');
}

function money(value: string) {
  if (!value) return '';
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat('vi-VN').format(number) + ' ₫' : '';
}

export default function HomePage() {
  const [initData, setInitData] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [agentError, setAgentError] = useState('');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [submitting, setSubmitting] = useState(false);
  const [ocrBusy, setOcrBusy] = useState<'front' | 'back' | 'bank' | null>(null);
  const [pageMessage, setPageMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [bankProof, setBankProof] = useState<File | null>(null);
  const [form, setForm] = useState<OrderForm>({
    agentCode: '', paymentDate: localDateString(), guestCount: '', countUnconfirmed: false,
    amount: '', fullName: '', cccd: '', dob: '', hometown: '', residence: '',
    bankName: '', accountNumber: '', accountHolder: '', bdRepresentative: '', note: '',
  });

  const selectedAgent = useMemo(() => agents.find((agent) => agent.code === form.agentCode), [agents, form.agentCode]);
  const hasTelegramSession = Boolean(initData);

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    if (app) {
      app.ready();
      app.expand();
      setInitData(app.initData || '');
    }
  }, []);

  const loadAgents = useCallback(async (rawInitData: string) => {
    setLoadingAgents(true);
    setAgentError('');
    try {
      const response = await fetch('/api/agents', { headers: { 'x-telegram-init-data': rawInitData }, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không tải được danh sách đại lý.');
      const cleaned: Agent[] = (payload.agents ?? []).map((agent: Record<string, unknown>) => ({
        code: String(agent.code ?? agent.maDL ?? agent['Mã ĐL'] ?? ''),
        name: String(agent.name ?? agent.fullName ?? agent['Họ tên'] ?? agent['Tên đại lý'] ?? ''),
        cccd: String(agent.cccd ?? agent.identityNumber ?? agent['CCCD'] ?? ''),
        bankName: String(agent.bankName ?? agent.bank ?? agent['Ngân hàng'] ?? ''),
        accountNumber: String(agent.accountNumber ?? agent.accountNumberBank ?? agent['STK'] ?? ''),
        accountHolder: String(agent.accountHolder ?? agent['Chủ TK'] ?? agent['Tên chủ tài khoản'] ?? ''),
        dob: String(agent.dob ?? agent['Ngày sinh'] ?? ''),
        hometown: String(agent.hometown ?? agent['Quê quán'] ?? ''),
        residence: String(agent.residence ?? agent['Nơi thường trú'] ?? ''),
        bdRepresentative: String(agent.bdRepresentative ?? agent['BD đại diện'] ?? ''),
        idFolderUrl: String(agent.idFolderUrl ?? agent['Folder CCCD'] ?? ''),
      })).filter((agent: Agent) => agent.code && agent.name);
      setAgents(cleaned);
      setForm((previous) => ({ ...previous, agentCode: previous.agentCode || cleaned[0]?.code || '' }));
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Lỗi không xác định khi tải đại lý.');
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    if (initData) void loadAgents(initData);
    else {
      const timeout = window.setTimeout(() => {
        if (!window.Telegram?.WebApp?.initData) {
          setLoadingAgents(false);
          setAgentError('Hãy mở Mini App từ bot Telegram đã cấu hình. Không mở trực tiếp bằng đường dẫn trình duyệt.');
        }
      }, 1200);
      return () => window.clearTimeout(timeout);
    }
  }, [initData, loadAgents]);

  useEffect(() => {
    if (mode === 'existing' && selectedAgent) {
      setForm((previous) => ({
        ...previous,
        fullName: selectedAgent.name,
        cccd: selectedAgent.cccd ?? '',
        bankName: selectedAgent.bankName ?? '',
        accountNumber: selectedAgent.accountNumber ?? '',
        accountHolder: selectedAgent.accountHolder ?? '',
      }));
    }
  }, [mode, selectedAgent]);

  function updateField<K extends keyof OrderForm>(key: K, value: OrderForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>, key: 'front' | 'back' | 'bank') {
    const file = event.target.files?.[0] ?? null;
    if (key === 'front') setIdFront(file);
    else if (key === 'back') setIdBack(file);
    else setBankProof(file);
    if (!file) return;
    setPageMessage(null);
    if (!file.type.startsWith('image/')) setPageMessage({ type: 'error', text: 'Hãy chọn ảnh JPG, PNG hoặc WEBP. Tệp HEIC có thể không được OCR.space hỗ trợ.' });
  }

  async function runOcr(source: 'front' | 'back' | 'bank') {
    const selectedFile = source === 'front' ? idFront : source === 'back' ? idBack : bankProof;
    if (!selectedFile) {
      setPageMessage({ type: 'error', text: source === 'front' ? 'Hãy chọn ảnh CCCD mặt trước trước.' : source === 'back' ? 'Hãy chọn ảnh CCCD mặt sau trước.' : 'Hãy chọn ảnh thông tin tài khoản ngân hàng trước.' });
      return;
    }
    if (!initData) {
      setPageMessage({ type: 'error', text: 'Phiên Telegram chưa sẵn sàng. Hãy đóng và mở lại Mini App từ bot.' });
      return;
    }
    setOcrBusy(source);
    setPageMessage({ type: 'info', text: 'Đang đọc ảnh bằng OCR.space… Hãy đợi trong giây lát.' });
    try {
      const optimized = await optimizePhoto(selectedFile);
      const body = new FormData();
      body.append('file', optimized, optimized.name);
      body.append('documentType', source === 'bank' ? 'bank' : 'identity');
      const response = await fetch('/api/ocr', { method: 'POST', headers: { 'x-telegram-init-data': initData }, body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'OCR không thành công.');
      const candidate = (payload.candidates ?? EMPTY_OCR) as OcrCandidates;
      setOcrText((old) => `${old}${old ? '\n\n' : ''}[${source === 'bank' ? 'ẢNH TÀI KHOẢN' : source === 'front' ? 'CCCD MẶT TRƯỚC' : 'CCCD MẶT SAU'}]\n${payload.text ?? ''}`);
      setForm((previous) => ({
        ...previous,
        fullName: previous.fullName || candidate.fullName,
        cccd: previous.cccd || candidate.cccd,
        dob: previous.dob || candidate.dob,
        hometown: previous.hometown || candidate.hometown,
        residence: previous.residence || candidate.residence,
        bankName: previous.bankName || candidate.bankName,
        accountNumber: previous.accountNumber || candidate.accountNumber,
        accountHolder: previous.accountHolder || candidate.accountHolder || (source === 'bank' ? '' : previous.accountHolder),
      }));
      setPageMessage({ type: 'success', text: 'Đã đọc ảnh. Kiểm tra và sửa từng trường thông tin trước khi gửi lệnh; OCR có thể nhận dạng sai.' });
    } catch (error) {
      setPageMessage({ type: 'error', text: error instanceof Error ? error.message : 'Không đọc được ảnh.' });
    } finally {
      setOcrBusy(null);
    }
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageMessage(null);
    if (!initData) return setPageMessage({ type: 'error', text: 'Hãy mở Mini App từ bot Telegram.' });
    if (mode === 'existing' && !selectedAgent) return setPageMessage({ type: 'error', text: 'Hãy chọn đại lý từ danh sách.' });
    if (mode === 'new' && !idFront) return setPageMessage({ type: 'error', text: 'Thiếu ảnh CCCD mặt trước.' });
    if (mode === 'new' && !idBack) return setPageMessage({ type: 'error', text: 'Thiếu ảnh CCCD mặt sau.' });
    if (mode === 'new' && normalizePersonName(form.accountHolder) !== normalizePersonName(form.fullName)) {
      return setPageMessage({ type: 'error', text: 'Chủ tài khoản phải trùng họ tên CCCD. Hãy kiểm tra lại cả hai trường.' });
    }

    setSubmitting(true);
    setPageMessage({ type: 'info', text: 'Đang gửi lệnh sang n8n. Không bấm gửi lần nữa khi chưa có kết quả.' });
    try {
      const body = new FormData();
      const fields: Record<string, string> = {
        mode,
        agentCode: mode === 'existing' ? form.agentCode : '',
        paymentDate: form.paymentDate,
        guestCount: form.guestCount,
        countUnconfirmed: String(form.countUnconfirmed),
        amount: form.amount,
        fullName: mode === 'new' ? form.fullName : (selectedAgent?.name ?? form.fullName),
        cccd: mode === 'new' ? form.cccd : (selectedAgent?.cccd ?? form.cccd),
        dob: form.dob,
        hometown: form.hometown,
        residence: form.residence,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountHolder: form.accountHolder,
        bdRepresentative: form.bdRepresentative,
        note: form.note,
      };
      Object.entries(fields).forEach(([key, value]) => body.append(key, value));
      const files = [
        ['idFront', idFront], ['idBack', idBack], ['bankProof', bankProof],
      ] as const;
      for (const [key, file] of files) {
        if (file) {
          const optimized = await optimizePhoto(file);
          body.append(key, optimized, optimized.name);
        }
      }

      const response = await fetch('/api/submit', { method: 'POST', headers: { 'x-telegram-init-data': initData }, body });
      const result = await response.json();
      if (!response.ok) throw new Error(`${result.error || 'Không tạo được lệnh.'}${result.commissionId ? ` Mã tham chiếu: ${result.commissionId}` : ''}`);
      setPageMessage({ type: 'success', text: `Đã tiếp nhận lệnh ${result.commissionId}. Trạng thái: ${result.status ?? 'Chờ chi'}. Hãy kiểm tra thông báo trong group kế toán.` });
      setForm((previous) => ({
        ...previous,
        guestCount: '', amount: '', note: '', countUnconfirmed: false,
      }));
      setIdFront(null); setIdBack(null); setBankProof(null); setOcrText('');
      const frontInput = document.getElementById('idFront') as HTMLInputElement | null;
      const backInput = document.getElementById('idBack') as HTMLInputElement | null;
      const bankInput = document.getElementById('bankProof') as HTMLInputElement | null;
      if (frontInput) frontInput.value = '';
      if (backInput) backInput.value = '';
      if (bankInput) bankInput.value = '';
      if (mode === 'new') {
        setMode('existing');
        void loadAgents(initData);
      }
    } catch (error) {
      setPageMessage({ type: 'error', text: error instanceof Error ? error.message : 'Có lỗi khi tạo lệnh.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="topbar">
        <div className="brand-mark">FS</div>
        <div className="brand-copy"><span className="eyebrow">FLY SAPA · NỘI BỘ</span><h1>Lệnh hoa hồng đại lý</h1></div>
        <span className="secure-pill"><span className="secure-dot"/>Bảo mật</span>
      </div>

      <section className="intro-card">
        <div className="intro-icon"><span>₫</span></div>
        <div><h2>Tạo lệnh chi hoa hồng</h2><p>Nhập thông tin một lần. Hệ thống sẽ lưu lịch sử và thông báo cho kế toán duyệt.</p></div>
      </section>

      {!hasTelegramSession && <div className="notice notice-error"><strong>Chưa xác thực Telegram</strong><span>Mở Mini App từ nút trong bot Telegram đã cấu hình. Không truy cập trực tiếp từ trình duyệt.</span></div>}
      {agentError && <div className="notice notice-error"><strong>Chưa tải được danh sách đại lý</strong><span>{agentError}</span><button className="text-button" type="button" onClick={() => initData && void loadAgents(initData)}>Thử tải lại</button></div>}

      <form onSubmit={submitOrder} className="form-card">
        <section className="form-section">
          <div className="section-heading"><span className="step-number">01</span><div><h3>Thông tin đại lý</h3><p>Chọn đại lý hiện có hoặc tạo hồ sơ mới.</p></div></div>
          <div className="mode-switch" role="group" aria-label="Loại đại lý">
            <button type="button" className={mode === 'existing' ? 'mode-option active' : 'mode-option'} onClick={() => { setMode('existing'); setPageMessage(null); }}>Đại lý đã có</button>
            <button type="button" className={mode === 'new' ? 'mode-option active' : 'mode-option'} onClick={() => { setMode('new'); setPageMessage(null); }}>＋ Đại lý mới</button>
          </div>

          {mode === 'existing' ? <>
            <label className="field-label" htmlFor="agentCode">Tên / mã đại lý <span className="required">*</span></label>
            <select id="agentCode" className="control" required value={form.agentCode} onChange={(event) => updateField('agentCode', event.target.value)} disabled={loadingAgents || agents.length === 0}>
              {loadingAgents && <option value="">Đang tải danh sách…</option>}
              {!loadingAgents && agents.length === 0 && <option value="">Chưa có đại lý để chọn</option>}
              {agents.map((agent) => <option key={agent.code} value={agent.code}>{agent.code} — {agent.name}</option>)}
            </select>
            {selectedAgent && <div className="agent-summary">
              <div className="summary-line"><span>Mã đại lý</span><strong>{selectedAgent.code}</strong></div>
              <div className="summary-line"><span>CCCD</span><strong>{selectedAgent.cccd || 'Chưa có dữ liệu'}</strong></div>
              <div className="summary-line"><span>Ngân hàng</span><strong>{selectedAgent.bankName || 'Chưa có dữ liệu'}</strong></div>
              <div className="summary-line"><span>Số tài khoản</span><strong>{selectedAgent.accountNumber || 'Chưa có dữ liệu'}</strong></div>
              <div className="summary-line"><span>Chủ tài khoản</span><strong>{selectedAgent.accountHolder || 'Chưa có dữ liệu'}</strong></div>
              {(!selectedAgent.cccd || !selectedAgent.bankName || !selectedAgent.accountNumber || !selectedAgent.accountHolder) && <p className="inline-warning">Hồ sơ còn thiếu thông tin. Hãy cập nhật tab “Đại lý Phát sinh” trước khi duyệt chi.</p>}
            </div>}
          </> : <>
            <div className="notice notice-info"><strong>Hồ sơ đại lý mới</strong><span>Hệ thống phải đối chiếu CCCD và mã đại lý trước khi thêm vào sheet. Mã đại lý sẽ do n8n lấy theo ô X2, không nhập tay tại đây.</span></div>
            <div className="field-grid">
              <div className="field-group"><label className="field-label" htmlFor="fullName">Họ và tên trên CCCD <span className="required">*</span></label><input id="fullName" className="control" value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} autoComplete="name" required/></div>
              <div className="field-group"><label className="field-label" htmlFor="cccd">Số CCCD <span className="required">*</span></label><input id="cccd" className="control" value={form.cccd} onChange={(e) => updateField('cccd', e.target.value.replace(/\D/g, '').slice(0, 12))} inputMode="numeric" maxLength={12} pattern="[0-9]{12}" required placeholder="12 chữ số"/></div>
              <div className="field-group"><label className="field-label" htmlFor="dob">Ngày sinh <span className="required">*</span></label><input id="dob" className="control" value={form.dob} onChange={(e) => updateField('dob', e.target.value)} placeholder="DD/MM/YYYY" required/></div>
              <div className="field-group"><label className="field-label" htmlFor="hometown">Quê quán <span className="required">*</span></label><input id="hometown" className="control" value={form.hometown} onChange={(e) => updateField('hometown', e.target.value)} required/></div>
              <div className="field-group span-full"><label className="field-label" htmlFor="residence">Nơi thường trú <span className="required">*</span></label><input id="residence" className="control" value={form.residence} onChange={(e) => updateField('residence', e.target.value)} required/></div>
              <div className="field-group span-full"><label className="field-label" htmlFor="bdRepresentative">BD đại diện <span className="required">*</span></label><input id="bdRepresentative" className="control" value={form.bdRepresentative} onChange={(e) => updateField('bdRepresentative', e.target.value)} required placeholder="Tên nhân sự BD phụ trách"/></div>
            </div>

            <div className="upload-grid">
              <div className="upload-card">
                <div className="upload-card-heading"><span className="upload-icon">▣</span><div><strong>CCCD mặt trước</strong><small>Ảnh rõ, đủ bốn góc</small></div></div>
                <input id="idFront" type="file" accept="image/*" capture="environment" onChange={(e) => void handleFileChange(e, 'front')} required className="file-control"/>
                {idFront && <div className="file-name">{idFront.name}</div>}
                <button type="button" className="secondary-button" onClick={() => void runOcr('front')} disabled={!idFront || ocrBusy !== null}>{ocrBusy === 'front' ? 'Đang đọc ảnh…' : '✧ Đọc CCCD bằng OCR'}</button>
              </div>
              <div className="upload-card">
                <div className="upload-card-heading"><span className="upload-icon">▣</span><div><strong>CCCD mặt sau</strong><small>Thấy rõ quê quán, thường trú</small></div></div>
                <input id="idBack" type="file" accept="image/*" capture="environment" onChange={(e) => void handleFileChange(e, 'back')} required className="file-control"/>
                {idBack && <div className="file-name">{idBack.name}</div>}
                <button type="button" className="secondary-button" onClick={() => void runOcr('back')} disabled={!idBack || ocrBusy !== null}>{ocrBusy === 'back' ? 'Đang đọc ảnh…' : '✧ Đọc CCCD bằng OCR'}</button>
              </div>
            </div>

            <div className="field-grid bank-fields">
              <div className="field-group"><label className="field-label" htmlFor="bankName">Ngân hàng <span className="required">*</span></label><input id="bankName" className="control" value={form.bankName} onChange={(e) => updateField('bankName', e.target.value)} required/></div>
              <div className="field-group"><label className="field-label" htmlFor="accountNumber">Số tài khoản <span className="required">*</span></label><input id="accountNumber" className="control" value={form.accountNumber} onChange={(e) => updateField('accountNumber', e.target.value.replace(/[^0-9]/g, '').slice(0, 20))} inputMode="numeric" pattern="[0-9]{6,20}" required/></div>
              <div className="field-group span-full"><label className="field-label" htmlFor="accountHolder">Chủ tài khoản <span className="required">*</span></label><input id="accountHolder" className="control" value={form.accountHolder} onChange={(e) => updateField('accountHolder', e.target.value)} required/><small className="field-hint">Theo hướng dẫn sheet, tên chủ tài khoản phải trùng với tên CCCD.</small></div>
            </div>
            <div className="upload-card bank-proof-card">
              <div className="upload-card-heading"><span className="upload-icon">▤</span><div><strong>Ảnh thông tin tài khoản (không bắt buộc)</strong><small>OCR gợi ý ngân hàng/STK; cần xác nhận bằng mắt</small></div></div>
              <input id="bankProof" type="file" accept="image/*" capture="environment" onChange={(e) => void handleFileChange(e, 'bank')} className="file-control"/>
              {bankProof && <div className="file-name">{bankProof.name}</div>}
              <button type="button" className="secondary-button" onClick={() => void runOcr('bank')} disabled={!bankProof || ocrBusy !== null}>{ocrBusy === 'bank' ? 'Đang đọc ảnh…' : '✧ Đọc ảnh tài khoản bằng OCR'}</button>
            </div>
          </>}
        </section>

        <section className="form-section">
          <div className="section-heading"><span className="step-number">02</span><div><h3>Thông tin hoa hồng</h3><p>Mỗi lần tạo lệnh sẽ thêm một dòng mới trong lịch sử chứng từ.</p></div></div>
          <div className="field-grid">
            <div className="field-group"><label className="field-label" htmlFor="paymentDate">Ngày thanh toán <span className="required">*</span></label><input id="paymentDate" type="date" className="control" value={form.paymentDate} onChange={(e) => updateField('paymentDate', e.target.value)} required/></div>
            <div className="field-group"><label className="field-label" htmlFor="amount">Tiền hoa hồng (VND) <span className="required">*</span></label><input id="amount" type="number" min="1" step="1000" className="control" value={form.amount} onChange={(e) => updateField('amount', e.target.value)} inputMode="numeric" required placeholder="Ví dụ: 250000"/><small className="field-hint">{money(form.amount)}</small></div>
            <div className="field-group span-full"><label className="field-label" htmlFor="guestCount">Số khách <span className="required">*</span></label><input id="guestCount" type="number" min="0" step="1" className="control" value={form.guestCount} onChange={(e) => updateField('guestCount', e.target.value)} disabled={form.countUnconfirmed} required={!form.countUnconfirmed} placeholder="Nhập số khách đã xác nhận"/><label className="checkbox-line"><input type="checkbox" checked={form.countUnconfirmed} onChange={(e) => { updateField('countUnconfirmed', e.target.checked); if (e.target.checked) updateField('guestCount', ''); }}/><span>Chưa xác nhận số khách — ghi chú “Cần bổ sung” để BD/thu ngân xác nhận trước khi khai thuế.</span></label></div>
            <div className="field-group span-full"><label className="field-label" htmlFor="note">Ghi chú (nếu có)</label><textarea id="note" className="control textarea" value={form.note} onChange={(e) => updateField('note', e.target.value)} rows={3} placeholder="Thông tin bổ sung cho kế toán…"/></div>
          </div>

          {mode === 'existing' && selectedAgent && <div className="payout-summary"><div><span>Đại lý nhận tiền</span><strong>{selectedAgent.name}</strong></div><div><span>Tài khoản</span><strong>{selectedAgent.bankName || 'Chưa có ngân hàng'} · {selectedAgent.accountNumber || 'Chưa có STK'}</strong></div><div><span>Số tiền</span><strong className="amount-preview">{money(form.amount) || '—'}</strong></div></div>}
        </section>

        {ocrText && <details className="ocr-details"><summary>Xem văn bản OCR đã đọc (để đối chiếu)</summary><pre>{ocrText}</pre><button className="text-button" type="button" onClick={() => setOcrText('')}>Ẩn và xóa khỏi màn hình</button></details>}

        {pageMessage && <div className={`notice ${pageMessage.type === 'error' ? 'notice-error' : pageMessage.type === 'success' ? 'notice-success' : 'notice-info'}`} role="status"><strong>{pageMessage.type === 'error' ? 'Chưa hoàn tất' : pageMessage.type === 'success' ? 'Thành công' : 'Đang xử lý'}</strong><span>{pageMessage.text}</span></div>}

        <div className="privacy-note"><span>🔒</span><p>Ảnh CCCD và tài khoản được gửi qua máy chủ để OCR/lưu trữ. Chỉ tải giấy tờ cần thiết, được phép xử lý; luôn xác nhận lại thông tin trước khi gửi.</p></div>
        <button className="submit-button" type="submit" disabled={submitting || loadingAgents || !hasTelegramSession}>
          {submitting ? <><span className="spinner"/> Đang gửi lệnh…</> : <><span>Gửi lệnh cho kế toán</span><span className="submit-arrow">→</span></>}
        </button>
        <p className="bottom-hint">Lệnh chỉ được ghi nhận là “Chờ chi”. Bot không tự chuyển tiền.</p>
      </form>
      <footer className="app-footer">Fly Sapa · Quản lý hoa hồng đại lý</footer>
    </main>
  );
}
