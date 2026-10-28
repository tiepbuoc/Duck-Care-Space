/**
 * Duck AI Gateway client — gọi AI qua n8n (không có API key trong trình duyệt).
 * ------------------------------------------------------------------
 * Luồng:
 *  1. Lấy Firebase ID token. Học sinh không đăng nhập nên dùng Firebase Anonymous Auth
 *     (tự đăng nhập ẩn danh, không thu thập thông tin cá nhân).
 *  2. POST {id_token, page_url} → /duck-gw-token  → nhận token của n8n, sống ~5 phút.
 *  3. POST {token, mode, messages, context, page_url} → /duck-gw-chat → n8n kiểm tra, gọi LLM, trả {reply}.
 *  Token được làm mới "lười" trước khi gọi (còn < 60s) và tự thử lại 1 lần khi gặp 401.
 *
 *  Dùng: DuckGateway.ask({ mode, messages, context, signal }) → Promise<string>
 *  Cần: firebase-app-compat + firebase-auth-compat + assets/js/firebase-config.js + ai-config.js
 */
(function () {
  'use strict';
  if (window.DuckGateway) return; // chỉ nạp 1 lần (điều hướng SPA không tải lại trang)

  const CFG = window.DUCK_AI_CONFIG || {};
  const RENEW_BEFORE_MS = 60 * 1000;

  let cached = null;   // { token, expMs }
  let inflight = null; // chống xin token trùng
  let authReady = null;

  function GatewayError(code, status) {
    const e = new Error(code); e.code = code; e.status = status || 0; return e;
  }

  function baseUrl() { return String(CFG.gatewayBaseUrl || '').trim().replace(/\/$/, ''); }
  function isConfigured() { return !!baseUrl(); }

  async function postJson(path, body, signal) {
    let res;
    try {
      res = await fetch(baseUrl() + path, {
        method: 'POST',
        // text/plain = "simple request": không bị preflight (OPTIONS) → tránh lỗi CORS khi proxy hosting trả lời preflight sai.
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      throw GatewayError('network_error');
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* không phải JSON */ }
    return { status: res.status, data };
  }

  // Đợi Firebase khôi phục phiên đã lưu (nếu có) trước khi quyết định đăng nhập ẩn danh mới
  function waitAuthReady(a) {
    if (!authReady) {
      authReady = new Promise(resolve => {
        const off = a.onAuthStateChanged(() => { off(); resolve(); });
      });
    }
    return authReady;
  }

  async function getFirebaseIdToken() {
    if (typeof firebase === 'undefined' || !firebase.auth) throw GatewayError('auth_unavailable');
    const a = firebase.auth();
    await waitAuthReady(a);
    let user = a.currentUser;
    if (!user) {
      try { user = (await a.signInAnonymously()).user; }
      catch (e) {
        throw GatewayError(e && e.code === 'auth/operation-not-allowed' ? 'anon_auth_disabled' : 'auth_failed');
      }
    }
    return user.getIdToken();
  }

  async function fetchToken(signal) {
    const idToken = await getFirebaseIdToken();
    const { status, data } = await postJson('/duck-gw-token', { id_token: idToken, page_url: location.href }, signal);
    if (status !== 200 || !data || !data.token) throw GatewayError((data && data.error) || 'token_http_' + status, status);
    const ttlMs = (Number(data.expires_in) || 300) * 1000;
    cached = { token: data.token, expMs: Date.now() + ttlMs };
    return cached.token;
  }

  function ensureToken(force, signal) {
    if (!force && cached && cached.expMs - Date.now() > RENEW_BEFORE_MS) return Promise.resolve(cached.token);
    if (!inflight) inflight = fetchToken(signal).finally(() => { inflight = null; });
    return inflight;
  }

  /** Gửi yêu cầu AI. payload: { mode, messages:[{role,content}], context?, signal? } → chuỗi trả lời */
  async function ask(payload) {
    if (!isConfigured()) throw GatewayError('no_gateway');
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await ensureToken(attempt > 0, payload.signal);
      const { status, data } = await postJson('/duck-gw-chat', {
        token,
        mode: payload.mode,
        messages: payload.messages,
        context: payload.context || {},
        page_url: location.href,
      }, payload.signal);
      if (status === 200 && data && typeof data.reply === 'string' && data.reply.trim()) return data.reply.trim();
      const code = (data && data.error) || 'http_' + status;
      if (status === 401 && attempt === 0) { cached = null; continue; } // token hết hạn → xin lại 1 lần
      throw GatewayError(code, status);
    }
    throw GatewayError('token_refresh_failed');
  }

  /** Xin token sớm để câu hỏi đầu tiên không phải chờ (lỗi thì bỏ qua). */
  function prefetch() { if (isConfigured()) ensureToken(false).catch(() => {}); }

  window.DuckGateway = { ask, prefetch, isConfigured };
})();
