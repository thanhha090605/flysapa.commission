:root {
  --navy: #123f6a;
  --navy-2: #1c5a8d;
  --text: #182b3e;
  --muted: #6a7b8b;
  --line: #dce5ed;
  --paper: #ffffff;
  --canvas: #f3f6f9;
  --blue-light: #eef5fc;
  --green: #21734c;
  --red: #a12c37;
  --amber: #8b5b12;
}
* { box-sizing: border-box; }
html { background: var(--canvas); }
body { margin: 0; color: var(--text); background: var(--canvas); font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
button:disabled { opacity: .55; cursor: not-allowed; }
.app-shell { width: min(100%, 720px); margin: 0 auto; padding: calc(14px + env(safe-area-inset-top)) 16px calc(30px + env(safe-area-inset-bottom)); }
.topbar { display: flex; align-items: center; gap: 11px; padding: 4px 3px 18px; }
.brand-mark { display: grid; place-items: center; width: 44px; height: 44px; flex: 0 0 44px; border-radius: 14px; background: linear-gradient(145deg, #164f7e, #0b3153); color: white; letter-spacing: -.05em; font-weight: 900; font-size: 15px; box-shadow: 0 5px 16px #0b315326; }
.brand-copy { flex: 1; min-width: 0; }
.eyebrow { font-size: 10px; font-weight: 800; letter-spacing: .12em; color: var(--navy-2); }
h1 { margin: 3px 0 0; font-size: clamp(18px, 4.5vw, 23px); line-height: 1.15; letter-spacing: -.035em; }
.secure-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; background: #eaf5ef; color: #236544; border-radius: 999px; font-weight: 700; font-size: 11px; white-space: nowrap; }
.secure-dot { display: block; width: 6px; height: 6px; background: #329465; border-radius: 50%; }
.intro-card { display: flex; align-items: flex-start; gap: 13px; border-radius: 18px; padding: 19px 17px; background: linear-gradient(120deg, #164d79, #0e365a); color: white; box-shadow: 0 9px 22px #123f6a1b; margin-bottom: 15px; }
.intro-icon { flex: 0 0 43px; width: 43px; height: 43px; border-radius: 13px; display: grid; place-items: center; background: #ffffff1e; color: #fff; font-size: 25px; font-weight: 700; }
.intro-card h2 { margin: 1px 0 6px; font-size: 18px; letter-spacing: -.025em; }
.intro-card p { margin: 0; max-width: 450px; color: #dbe9f5; font-size: 13px; line-height: 1.45; }
.form-card { border: 1px solid #e6edf3; border-radius: 19px; background: var(--paper); overflow: hidden; box-shadow: 0 4px 24px #233d560b; }
.form-section { padding: 22px 19px 23px; border-bottom: 1px solid #e9eff4; }
.section-heading { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 18px; }
.step-number { display: grid; place-items: center; flex: 0 0 38px; width: 38px; height: 38px; border-radius: 12px; background: var(--blue-light); color: var(--navy); font-size: 12px; font-weight: 900; letter-spacing: .03em; }
.section-heading h3 { margin: 1px 0 4px; font-size: 16px; letter-spacing: -.02em; }
.section-heading p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.4; }
.mode-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; padding: 4px; border-radius: 13px; background: #f0f4f7; margin-bottom: 17px; }
.mode-option { border: 1px solid transparent; border-radius: 10px; background: transparent; min-height: 41px; color: #53697b; font-weight: 700; font-size: 13px; }
.mode-option.active { color: var(--navy); background: white; border-color: #e0eaf2; box-shadow: 0 1px 4px #102c4410; }
.field-label { display: block; margin-bottom: 7px; font-size: 12px; font-weight: 800; color: #2a4053; }
.required { color: #bd3843; }
.control { width: 100%; min-width: 0; border: 1px solid #ccd9e4; background: #fff; border-radius: 11px; padding: 12px 12px; outline: none; color: #172e42; font-size: 14px; transition: border-color .15s, box-shadow .15s; }
.control:focus { border-color: #3b79aa; box-shadow: 0 0 0 3px #2f78ad18; }
.control:disabled { background: #f3f6f8; color: #92a0ac; }
select.control { appearance: auto; }
.field-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 12px; row-gap: 15px; }
.field-group { min-width: 0; }
.span-full { grid-column: 1 / -1; }
.field-hint { display: block; margin-top: 5px; font-size: 11px; color: #718292; }
.agent-summary { margin-top: 12px; border: 1px solid #dce8f2; background: #f7fbff; border-radius: 13px; padding: 13px 13px 11px; }
.summary-line { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid #e8f0f7; font-size: 12px; }
.summary-line:last-of-type { border-bottom: 0; }
.summary-line span { color: #6c7d8d; flex-shrink: 0; }
.summary-line strong { text-align: right; overflow-wrap: anywhere; font-weight: 750; color: #203b52; }
.inline-warning { margin: 9px 0 0; border-left: 3px solid #dfaa4d; padding-left: 8px; color: #855719; font-size: 11px; line-height: 1.45; }
.notice { display: flex; flex-direction: column; gap: 4px; border-radius: 12px; padding: 12px 13px; margin: 0 0 15px; font-size: 12px; line-height: 1.45; }
.notice strong { font-size: 12px; }
.notice-info { background: #eef6fd; border: 1px solid #d6e8f8; color: #285678; }
.notice-error { background: #fff0f0; border: 1px solid #f1d4d5; color: #962f37; }
.notice-success { background: #edf8f0; border: 1px solid #cee8d5; color: #27633f; }
.text-button { align-self: flex-start; border: 0; background: none; color: var(--navy-2); font-weight: 800; font-size: 12px; padding: 4px 0 0; }
.upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
.upload-card { min-width: 0; padding: 12px; border: 1px dashed #b9cbd9; border-radius: 13px; background: #fafcfe; }
.upload-card-heading { display: flex; align-items: flex-start; gap: 9px; margin-bottom: 10px; }
.upload-icon { display: grid; place-items: center; flex: 0 0 31px; height: 31px; width: 31px; border-radius: 9px; background: #e4eff9; color: var(--navy); font-weight: 900; }
.upload-card-heading strong { display: block; font-size: 12px; line-height: 1.35; }
.upload-card-heading small { display: block; font-size: 10px; color: #788997; line-height: 1.35; margin-top: 3px; }
.file-control { display: block; width: 100%; min-width: 0; font-size: 11px; color: #5f7384; }
.file-control::file-selector-button { border: 1px solid #cedce7; border-radius: 8px; padding: 7px 8px; margin: 0 5px 6px 0; background: #fff; color: #27465f; font-weight: 700; font-size: 11px; cursor: pointer; }
.file-name { font-size: 10px; color: #4c6e89; overflow-wrap: anywhere; padding: 2px 0 6px; }
.secondary-button { display: block; width: 100%; margin-top: 8px; border: 1px solid #c2d9eb; border-radius: 9px; background: #eef6fd; color: #1d5883; padding: 9px 6px; font-size: 11px; font-weight: 800; line-height: 1.3; }
.bank-fields { margin-top: 17px; }
.bank-proof-card { margin-top: 15px; }
.checkbox-line { display: flex; align-items: flex-start; gap: 8px; margin-top: 10px; color: #5c6f7f; font-size: 11px; line-height: 1.45; }
.checkbox-line input { width: 16px; height: 16px; flex: 0 0 16px; margin: 1px 0 0; accent-color: #1c669a; }
.textarea { resize: vertical; min-height: 72px; }
.payout-summary { margin-top: 18px; border-radius: 13px; padding: 13px; background: #f0f6fb; border: 1px solid #dfeaf3; }
.payout-summary div { display: flex; flex-direction: column; gap: 4px; margin-bottom: 9px; }
.payout-summary div:last-child { margin-bottom: 0; padding-top: 9px; border-top: 1px solid #d6e5f0; }
.payout-summary span { color: #6b7e8d; font-size: 11px; }
.payout-summary strong { color: #1b3c57; font-size: 13px; overflow-wrap: anywhere; }
.amount-preview { font-size: 18px !important; color: #155c42 !important; }
.ocr-details { margin: 16px 19px 0; padding: 11px; border: 1px solid #e2e9ef; border-radius: 11px; color: #3d596e; font-size: 12px; }
.ocr-details summary { font-weight: 800; cursor: pointer; }
.ocr-details pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 220px; overflow: auto; background: #f5f8fa; padding: 9px; border-radius: 8px; font-size: 10px; }
.privacy-note { display: flex; align-items: flex-start; gap: 8px; padding: 16px 19px 0; }
.privacy-note span { font-size: 15px; }
.privacy-note p { margin: 0; color: #758695; font-size: 10px; line-height: 1.5; }
.submit-button { display: flex; justify-content: space-between; align-items: center; width: calc(100% - 38px); min-height: 52px; margin: 17px 19px 0; border: 0; border-radius: 13px; padding: 0 16px; background: linear-gradient(100deg, #174e7a, #0f3c63); color: white; font-size: 14px; font-weight: 850; box-shadow: 0 5px 14px #174e7a24; }
.submit-arrow { font-size: 22px; font-weight: 500; line-height: 1; }
.spinner { display: inline-block; width: 14px; height: 14px; margin-right: 7px; vertical-align: -2px; border: 2px solid #ffffff7a; border-top-color: white; border-radius: 50%; animation: spin .75s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.bottom-hint { margin: 10px 19px 19px; text-align: center; font-size: 10px; line-height: 1.45; color: #84929e; }
.app-footer { text-align: center; padding: 18px 6px 0; color: #97a4af; font-size: 10px; letter-spacing: .02em; }
@media (max-width: 440px) {
  .app-shell { padding-left: 10px; padding-right: 10px; }
  .form-section { padding: 19px 14px 20px; }
  .intro-card { padding: 16px 14px; }
  .secure-pill { padding: 6px 8px; font-size: 10px; }
  .upload-grid { grid-template-columns: 1fr; }
  .field-grid { column-gap: 9px; }
  .control { padding: 11px 10px; font-size: 13px; }
  .submit-button { width: calc(100% - 28px); margin-left: 14px; margin-right: 14px; }
  .privacy-note { padding-left: 14px; padding-right: 14px; }
  .bottom-hint { margin-left: 14px; margin-right: 14px; }
}
