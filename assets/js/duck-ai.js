/**
 * Duck Care AI — lõi chatbot dùng chung
 * ============================================================
 *  DuckAI.mount(container, 'screening' | 'learning', opts)  → nhúng chatbot vào 1 phần tử
 *  Widget nổi (góc phải dưới) tự khởi tạo ở mọi trang công khai.
 *
 *  Nguyên tắc an toàn:
 *   - Điểm số & mức nguy cơ do CODE tính (cố định, giống Duck Radar) — AI chỉ giải thích & gợi ý.
 *   - Phát hiện từ khoá nguy hiểm (tự làm hại bản thân) ngay trên trình duyệt → hiện thông tin hỗ trợ khẩn cấp.
 *   - Nội dung trò chuyện KHÔNG được lưu. Chỉ lưu ẩn danh điểm số / mức nguy cơ (phục vụ thống kê).
 *   - Chưa kết nối AI (endpoint trống) hoặc lỗi mạng → tự chuyển "chế độ cơ bản", không vỡ giao diện.
 */
(function () {
  'use strict';
  if (window.DuckAI) return; // chỉ nạp 1 lần (điều hướng không tải lại trang)

  const CFG = window.DUCK_AI_CONFIG || {};
  const C = window.DUCK_AI_CONTENT;
  if (!C) { console.warn('Duck AI: thiếu duck-ai-content.js'); return; }

  // ------------------------------------------------------------------
  // Tiện ích
  // ------------------------------------------------------------------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Markdown rất nhỏ & an toàn: **đậm**, danh sách "- ", "1. ", xuống dòng
  function md(text) {
    const lines = esc(text).split('\n');
    let out = '', list = null;
    const inline = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const close = () => { if (list) { out += '</' + list + '>'; list = null; } };
    lines.forEach(raw => {
      const line = raw.trim();
      let m;
      if ((m = line.match(/^[-•*]\s+(.*)/))) {
        if (list !== 'ul') { close(); out += '<ul>'; list = 'ul'; }
        out += '<li>' + inline(m[1]) + '</li>';
      } else if ((m = line.match(/^\d+[.)]\s+(.*)/))) {
        if (list !== 'ol') { close(); out += '<ol>'; list = 'ol'; }
        out += '<li>' + inline(m[1]) + '</li>';
      } else if (!line) {
        close();
      } else {
        close();
        out += '<p>' + inline(line) + '</p>';
      }
    });
    close();
    return out;
  }

  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

  // Từ khoá nguy cơ cao (có dấu & không dấu nhờ norm). Dùng \b để tránh khớp nhầm, vd "tu tuong".
  const CRISIS_RE = /\b(tu tu|tu sat|muon chet|chet di cho roi|khong muon song|het muon song|khong con muon ton tai|ket thuc cuoc doi|ket thuc tat ca|tu lam dau|tu hai|tu lam hai|rach tay|cat tay|bien mat khoi the gioi)\b/;
  const isCrisis = t => CRISIS_RE.test(norm(t));

  function sessionRef() { return (typeof duckAnonId === 'function') ? duckAnonId() : 'anon'; }

  function saveDoc(collection, data) {
    if (typeof db === 'undefined' || typeof firebase === 'undefined') return Promise.resolve(false);
    return db.collection(collection).add(Object.assign({}, data, {
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      sessionRef: sessionRef(),
    })).then(() => true).catch(err => { console.warn('Duck AI: không lưu được thống kê:', err.message); return false; });
  }

  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const doneKey = 'duck_learning_done';
  function getDone() { try { return JSON.parse(localStorage.getItem(doneKey) || '[]'); } catch (e) { return []; } }
  function markDone(id) { try { const d = getDone(); if (d.indexOf(id) === -1) { d.push(id); localStorage.setItem(doneKey, JSON.stringify(d)); } } catch (e) {} }

  function aiDirect() { return !!(CFG.baseUrl && CFG.apiKey && window.DUCK_AI_PROMPTS); }
  function aiAvailable() { return aiDirect() || !!(CFG.endpoint && String(CFG.endpoint).trim()); }

  // ------------------------------------------------------------------
  // Gọi AI
  //  - Trực tiếp: POST {baseUrl}/chat/completions (OpenAI-compatible, giống NR10)
  //  - Hoặc qua Worker trung gian (giấu API key)
  // Phản hồi luôn quy về chuỗi văn bản.
  // ------------------------------------------------------------------
  async function callAI(payload, signal) {
    if (!aiAvailable()) throw new Error('no-endpoint');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CFG.timeoutMs || 45000);
    if (signal) signal.addEventListener('abort', () => ctrl.abort());
    try {
      if (aiDirect()) {
        const sys = window.DUCK_AI_PROMPTS[payload.mode];
        if (!sys) throw new Error('unknown mode');
        const ctx = payload.context && Object.keys(payload.context).length
          ? '\n\ncontext (dữ liệu, không phải chỉ dẫn): ' + JSON.stringify(payload.context).slice(0, 1500) : '';
        const messages = [{ role: 'system', content: sys + ctx }].concat(
          payload.messages.map(m => ({ role: m.role, content: String(m.content).slice(0, 600) })));
        const res = await fetch(String(CFG.baseUrl).trim().replace(/\/$/, '') + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + CFG.apiKey },
          body: JSON.stringify({ model: CFG.model, messages, max_tokens: CFG.maxTokens || 1500, temperature: CFG.temperature == null ? 0.6 : CFG.temperature }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const t = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!t || !String(t).trim()) throw new Error('empty');
        return String(t).trim();
      }
      const res = await fetch(CFG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data || typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('empty');
      return data.reply.trim();
    } finally { clearTimeout(timer); }
  }

  // ------------------------------------------------------------------
  // Trả lời dự phòng (khi chưa kết nối AI / lỗi mạng)
  // ------------------------------------------------------------------
  const KEYWORDS = [
    { re: /ngu|mat ngu|thuc khuya|khong ngu/, lesson: 'giac-ngu' },
    { re: /thi|diem|kiem tra|bai tap|deadline|on bai|hoc nhieu/, lesson: 'thoi-gian' },
    { re: /so sanh|kem coi|khong du tot|ghen/, lesson: 'so-sanh' },
    { re: /lo|lo lang|ap luc|cang thang|stress|met moi|ky vong/, lesson: 'ap-luc' },
    { re: /tho|hoi hop|run|tim dap/, lesson: 'tho' },
    { re: /nhut nhat|ngai noi|khong dam noi|chia se|co don|buon/, lesson: 'chia-se' },
    { re: /tu choi|nhan them|qua tai/, lesson: 'tu-choi' },
  ];
  function localReply(text, mode) {
    const n = norm(text);
    const hit = KEYWORDS.find(k => k.re.test(n));
    const lesson = hit && C.LESSONS.find(l => l.id === hit.lesson);
    let reply = 'Cảm ơn bạn đã chia sẻ. Mình đang ở **chế độ cơ bản** (chưa kết nối AI) nên chưa thể trả lời chi tiết như một cuộc trò chuyện thật, nhưng mình vẫn ở đây để cùng bạn.';
    if (lesson) reply += '\n\nCó vẻ điều bạn nói liên quan đến bài **"' + lesson.title + '"** — bạn có thể đọc nhanh trong ' + lesson.minutes + ' phút.';
    else reply += '\n\nBạn có thể thử bài thở ở **Hồ tĩnh lặng** hoặc đọc một bài học ngắn ở **Duck Care AI Learning**.';
    reply += '\n\nNếu điều này đang làm bạn nặng lòng, hãy nói với một người lớn bạn tin tưởng nhé.';
    return { reply, lesson: lesson ? lesson.id : null };
  }

  // Báo cáo dự phòng sau sàng lọc (khi không có AI)
  function localReport(ctx) {
    const lvl = ctx.level;
    let intro = {
      xanh: 'Kết quả cho thấy bạn đang giữ được sự cân bằng khá tốt. Hãy tiếp tục lắng nghe bản thân mỗi ngày.',
      vang: 'Có vẻ bạn đang "chèo" khá nhiều dưới mặt nước. Đây là lúc tốt để chậm lại một chút trước khi áp lực tích tụ thêm.',
      do: 'Kết quả cho thấy bạn đang gồng mình khá nhiều. Đây không phải là yếu đuối — đó là tín hiệu bạn cần được lắng nghe và hỗ trợ.',
    }[lvl];
    const top = ctx.topItems.slice(0, 3);
    let txt = intro;
    if (top.length) {
      txt += '\n\n**Những điểm nổi bật trong câu trả lời của bạn:**\n';
      top.forEach(i => { txt += '- **' + C.SCREENING[i].topic + '** — ' + C.SCREENING[i].tip + '\n'; });
    }
    txt += '\n**Gợi ý cho bạn:**\n- Thử bài thở 4–7–8 ở Hồ tĩnh lặng (2 phút).\n- Chọn một bài học ngắn phù hợp ở Duck Care AI Learning.';
    if (lvl !== 'xanh') txt += '\n- Chia sẻ với một người bạn tin tưởng, hoặc gửi tâm sự ẩn danh ở Duck Whispers.';
    if (lvl === 'do') txt += '\n- **Hãy gặp giáo viên chủ nhiệm hoặc cán bộ tâm lý học đường trong hôm nay.**';
    return txt;
  }

  // ------------------------------------------------------------------
  // Chat: giao diện + trạng thái
  // ------------------------------------------------------------------
  function createChat(root, mode, opts) {
    opts = opts || {};
    const state = { destroyed: false, busy: false, history: [], context: {}, abort: new AbortController() };

    root.classList.add('dai');
    if (opts.full) root.classList.add('dai--full');
    root.innerHTML =
      '<div class="dai-log" role="log" aria-live="polite" aria-label="Cuộc trò chuyện với Duck AI"></div>' +
      '<div class="dai-chips" role="group" aria-label="Lựa chọn nhanh"></div>' +
      '<form class="dai-form" autocomplete="off">' +
            '<textarea rows="1" maxlength="500" placeholder="' + (mode === 'screening' ? 'Nhắn cho Duck AI…' : 'Hỏi Duck AI về áp lực, học tập…') + '" aria-label="Nhập tin nhắn"></textarea>' +
      '<button type="submit" class="dai-send" aria-label="Gửi">➤</button>' +
      '</form>' +
      '<p class="dai-note">Duck AI là công cụ hỗ trợ, <strong>không phải chẩn đoán y khoa</strong> và không thay thế thầy cô, cán bộ tâm lý hay chuyên gia. Nội dung trò chuyện không được lưu lại.</p>';

    const log = root.querySelector('.dai-log');
    const chipsEl = root.querySelector('.dai-chips');
    const form = root.querySelector('.dai-form');
    const input = form.querySelector('textarea');
    const sendBtn = form.querySelector('.dai-send');

    const scrollDown = () => { log.scrollTop = log.scrollHeight; };

    function bubble(who, html, extraCls) {
      const el = document.createElement('div');
      el.className = 'dai-msg dai-msg--' + who + (extraCls ? ' ' + extraCls : '');
      if (who === 'bot') {
        const av = document.createElement('span'); av.className = 'dai-avatar'; av.setAttribute('aria-hidden', 'true'); av.textContent = '🦆';
        el.appendChild(av);
      }
      const body = document.createElement('div'); body.className = 'dai-bubble'; body.innerHTML = html;
      el.appendChild(body);
      log.appendChild(el); scrollDown();
      return el;
    }
    const bot = (text, cls) => bubble('bot', md(text), cls);
    const botHtml = (html, cls) => bubble('bot', html, cls);
    const user = text => bubble('user', '<p>' + esc(text) + '</p>');

    function typing() {
      const el = bubble('bot', '<span class="dai-typing" aria-label="Duck AI đang trả lời"><i></i><i></i><i></i></span>');
      return () => el.remove();
    }

    function chips(list) {
      chipsEl.innerHTML = '';
      (list || []).forEach(c => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dai-chip' + (c.cls ? ' ' + c.cls : '');
        b.textContent = c.label;
        b.addEventListener('click', () => { if (!state.busy && !state.destroyed) c.fn(); });
        chipsEl.appendChild(b);
      });
    }

    function setBusy(v) {
      state.busy = v;
      input.disabled = v; sendBtn.disabled = v;
      chipsEl.classList.toggle('is-disabled', v);
    }

    // Gọi AI có hiệu ứng "đang gõ" + dự phòng
    async function ask(reqMode, extraMessages, fallbackFn) {
      setBusy(true);
      const stop = typing();
      let reply = null, usedFallback = false;
      try {
        const msgs = state.history.slice(-(CFG.maxHistory || 10)).concat(extraMessages || []);
        reply = await callAI({ mode: reqMode, messages: msgs, context: state.context }, state.abort.signal);
      } catch (e) {
        if (state.destroyed) return null;
        usedFallback = true;
        reply = fallbackFn ? fallbackFn() : null;
      }
      stop();
      setBusy(false);
      return { reply, usedFallback };
    }

    // ---- Xử lý tin nhắn tự do ----
    let onFreeText = null; // mỗi chế độ gắn hàm riêng
    form.addEventListener('submit', e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || state.busy) return;
      input.value = ''; autosize();
      user(text);
      if (isCrisis(text)) { botHtml(C.CRISIS_HTML, 'dai-crisis'); return; }
      if (onFreeText) onFreeText(text);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
    });
    function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 110) + 'px'; }
    input.addEventListener('input', autosize);

    const api = {
      el: root, input, mode,
      destroy() { state.destroyed = true; state.abort.abort(); },
      focus() { input.focus(); },
    };

    // ================================================================
    //  MODE 1 — DUCK CARE AI SCREENING
    // ================================================================
    if (mode === 'screening') {
      const answers = new Array(C.SCREENING.length).fill(null);
      let finished = false;

      onFreeText = async (text) => {
        state.history.push({ role: 'user', content: text });
        const r = await ask('screening_chat', [], () => localReply(text, 'screening').reply);
        if (!r || state.destroyed) return;
        bot(r.reply);
        state.history.push({ role: 'assistant', content: r.reply });
        if (!finished && answers.some(a => a === null)) {
          const next = answers.findIndex(a => a === null);
          bot('Khi nào sẵn sàng, mình tiếp tục khảo sát nhé (câu ' + (next + 1) + '/' + answers.length + ').');
        }
      };

      function welcome() {
        bot('Chào bạn, mình là **Duck AI** 🦆\n\nMình sẽ hỏi bạn **8 câu ngắn (khoảng 2 phút)** về cảm giác của bạn gần đây, sau đó cùng xem mức áp lực hiện tại và gợi ý phù hợp cho riêng bạn.\n\n- Không có câu đúng hay sai\n- Kết quả là **ẩn danh**\n- Đây là công cụ tham khảo, không phải chẩn đoán');
        chips([
          { label: 'Bắt đầu khảo sát', cls: 'dai-chip--primary', fn: () => { user('Bắt đầu khảo sát'); ask1(0); } },
          { label: 'Mình muốn hỏi trước', fn: () => { user('Mình muốn hỏi trước'); bot('Bạn cứ nhắn điều bạn thắc mắc ở ô bên dưới nhé. Khi sẵn sàng, bấm "Bắt đầu khảo sát".'); } },
        ]);
      }

      function ask1(i) {
        const total = C.SCREENING.length;
        bot('**Câu ' + (i + 1) + '/' + total + '**\n' + C.SCREENING[i].q + '\n\nBạn thấy điều này xảy ra với mình mức nào?');
        const list = C.SCALE_LABELS.map((lab, k) => ({
          label: (k + 1) + ' · ' + lab,
          fn: () => { user((k + 1) + ' · ' + lab); answers[i] = k + 1; (i + 1 < total) ? ask1(i + 1) : finish(); },
        }));
        if (i > 0) list.push({ label: '← Câu trước', cls: 'dai-chip--ghost', fn: () => { user('← Câu trước'); ask1(i - 1); } });
        chips(list);
      }

      async function finish() {
        finished = true;
        chips([]);
        const score = answers.reduce((s, v) => s + (v || 0), 0);
        const level = C.classify(score);
        const meta = C.LEVELS[level];
        const topItems = answers.map((v, i) => ({ v, i })).filter(o => o.v >= 4).sort((a, b) => b.v - a.v).map(o => o.i);
        state.context = { score, max: C.SCREENING.length * 5, level, answers: answers.slice(), topItems: topItems.map(i => ({ topic: C.SCREENING[i].topic, score: answers[i] })) };

        let card = '<div class="dai-result"><p class="muted" style="margin:0 0 6px">Kết quả của bạn</p>' +
          '<span class="result-badge ' + meta.cls + '">' + esc(meta.label) + '</span>' +
          '<p class="muted" style="margin:10px 0 0">Điểm: <strong>' + score + ' / ' + (C.SCREENING.length * 5) + '</strong></p>';
        if (topItems.length) {
          card += '<p style="margin:12px 0 4px"><strong>Điều cần chú ý nhất:</strong></p><ul>' +
            topItems.slice(0, 3).map(i => '<li>' + esc(C.SCREENING[i].topic) + '</li>').join('') + '</ul>';
        }
        card += '</div>';
        botHtml(card);

        // Lưu ẩn danh phục vụ thống kê (không lưu nội dung chat)
        saveDoc('ai_screening_results', { score, level, items: answers.slice() });

        if (level === 'do') {
          botHtml('<p><strong>Mình muốn bạn biết:</strong> bạn không cần tự mình vượt qua điều này. Hãy tìm giáo viên chủ nhiệm, phòng tâm lý học đường hoặc một người lớn bạn tin tưởng <strong>trong hôm nay</strong>.</p><p style="margin:0">Cần hỗ trợ khẩn cấp: gọi <strong>111</strong> (bảo vệ trẻ em, 24/7) hoặc <strong>115/112</strong>.</p>', 'dai-crisis');
        }

        const r = await ask('screening_report',
          [{ role: 'user', content: 'Hãy phân tích kết quả sàng lọc của mình và đưa khuyến nghị cá nhân hoá.' }],
          () => localReport({ level, topItems }));
        if (!r || state.destroyed) return;
        bot(r.reply);
        state.history.push({ role: 'assistant', content: r.reply });
        if (r.usedFallback && !aiAvailable()) { /* chế độ cơ bản: không cần báo thêm */ }

        const firstLesson = topItems.length ? C.SCREENING[topItems[0]].lesson : 'ap-luc';
        chips([
          { label: '📚 Học bài phù hợp với mình', cls: 'dai-chip--primary', fn: () => { user('Học bài phù hợp với mình'); (opts.goLearning || goLearningPage)(firstLesson); } },
          { label: '💬 Hỏi thêm về kết quả', fn: () => { user('Mình muốn hỏi thêm về kết quả'); bot('Bạn cứ nhắn điều muốn hỏi ở ô bên dưới nhé.'); input.focus(); } },
          { label: '🔄 Làm lại khảo sát', cls: 'dai-chip--ghost', fn: () => { answers.fill(null); finished = false; state.history = []; state.context = {}; user('Làm lại khảo sát'); ask1(0); } },
        ]);
      }

      api.start = welcome;
    }

    // ================================================================
    //  MODE 2 — DUCK CARE AI LEARNING
    // ================================================================
    if (mode === 'learning') {
      let scenarioSeen = [];
      let score = { ok: 0, total: 0 };

      onFreeText = async (text) => {
        state.history.push({ role: 'user', content: text });
        const r = await ask('learning_chat', [], () => localReply(text, 'learning'));
        if (!r || state.destroyed) return;
        const rep = r.usedFallback ? r.reply.reply : r.reply;
        bot(rep);
        state.history.push({ role: 'assistant', content: rep });
        if (r.usedFallback && r.reply.lesson) {
          const lid = r.reply.lesson;
          chips([{ label: '📖 Đọc bài đề xuất', cls: 'dai-chip--primary', fn: () => { user('Đọc bài đề xuất'); playLesson(lid, 0); } }, { label: '☰ Menu', cls: 'dai-chip--ghost', fn: menu }]);
        }
      };

      function menu(first) {
        if (first === true) {
          bot('Chào bạn, mình là **Duck AI Learning** 🦆\n\nỞ đây bạn có thể tự học **bất cứ lúc nào** về cách hiểu và quản lý áp lực: bài học ngắn 2–3 phút, câu hỏi tình huống và hỏi đáp tự do.\n\nBạn muốn bắt đầu từ đâu?');
        } else {
          bot('Bạn muốn học gì tiếp theo?');
        }
        chips([
          { label: '📚 Bài học ngắn', cls: 'dai-chip--primary', fn: () => { user('Bài học ngắn'); lessonList(); } },
          { label: '🎭 Câu hỏi tình huống', fn: () => { user('Câu hỏi tình huống'); playScenario(pickLocalScenario()); } },
          { label: '✨ AI tạo tình huống mới', fn: () => { user('AI tạo tình huống mới'); aiScenario(); } },
          { label: '💬 Hỏi AI về áp lực', fn: () => { user('Hỏi AI về áp lực'); bot('Bạn cứ nhắn câu hỏi ở ô bên dưới, ví dụ: "Làm sao để bớt lo trước kỳ thi?"'); input.focus(); } },
        ]);
      }

      function lessonList() {
        const done = getDone();
        const n = C.LESSONS.filter(l => done.indexOf(l.id) !== -1).length;
        bot('Bạn đã học **' + n + '/' + C.LESSONS.length + '** bài. Chọn một bài nhé:');
        chips(C.LESSONS.map(l => ({
          label: (done.indexOf(l.id) !== -1 ? '✓ ' : '') + l.icon + ' ' + l.title,
          fn: () => { user(l.title); playLesson(l.id, 0); },
        })).concat([{ label: '☰ Menu', cls: 'dai-chip--ghost', fn: () => menu() }]));
      }

      function playLesson(id, step) {
        const l = C.LESSONS.find(x => x.id === id);
        if (!l) return lessonList();
        state.context = { lesson: l.title };
        if (step === 0) bot(l.icon + ' **' + l.title + '** · ~' + l.minutes + ' phút');
        const total = l.cards.length;
        if (step < total) {
          bot('**' + (step + 1) + '/' + total + '** · ' + l.cards[step]);
          chips([
            { label: step + 1 < total ? 'Tiếp tục →' : 'Xong, xem tóm tắt →', cls: 'dai-chip--primary', fn: () => { user('Tiếp tục'); playLesson(id, step + 1); } },
            { label: '☰ Dừng bài', cls: 'dai-chip--ghost', fn: () => menu() },
          ]);
        } else {
          markDone(id);
          saveDoc('ai_learning_events', { type: 'lesson', ref: id });
          bot('✅ **Ghi nhớ:** ' + l.remember + '\n\n🎯 **Thử thách nhỏ:** ' + l.challenge);
          const related = C.SCENARIOS.filter(s => s.lesson === id);
          const list = [];
          if (related.length) list.push({ label: '🎭 Làm tình huống liên quan', cls: 'dai-chip--primary', fn: () => { user('Làm tình huống liên quan'); playScenario(related[Math.floor(Math.random() * related.length)]); } });
          list.push({ label: '📚 Bài khác', fn: () => { user('Bài khác'); lessonList(); } });
          list.push({ label: '☰ Menu', cls: 'dai-chip--ghost', fn: () => menu() });
          chips(list);
        }
      }

      function pickLocalScenario() {
        let pool = C.SCENARIOS.filter(s => scenarioSeen.indexOf(s.id) === -1);
        if (!pool.length) { scenarioSeen = []; pool = C.SCENARIOS; }
        const s = pool[Math.floor(Math.random() * pool.length)];
        scenarioSeen.push(s.id);
        return s;
      }

      // sc: { title, situation, options: [{t, ok, fb}] }
      function playScenario(sc) {
        const opts2 = shuffle(sc.options);
        botHtml('<p><strong>🎭 Tình huống' + (sc.title ? ': ' + esc(sc.title) : '') + '</strong></p><p>' + esc(sc.situation) + '</p><p style="margin:0"><strong>Bạn sẽ làm gì?</strong></p>');
        chips(opts2.map((o, k) => ({
          label: String.fromCharCode(65 + k) + '. ' + o.t,
          cls: 'dai-chip--option',
          fn: () => {
            user(String.fromCharCode(65 + k) + '. ' + o.t);
            const icon = o.ok === 'tốt' ? '🌟 Lựa chọn tốt' : o.ok === 'tạm' ? '👌 Cũng được, nhưng còn cách tốt hơn' : '💭 Chưa phải cách hiệu quả';
            score.total++; if (o.ok === 'tốt') score.ok++;
            botHtml('<p><strong>' + icon + '</strong></p><p>' + esc(o.fb) + '</p>');
            if (o.ok !== 'tốt') {
              const best = sc.options.find(x => x.ok === 'tốt');
              if (best) botHtml('<p style="margin:0"><strong>Gợi ý tốt hơn:</strong> ' + esc(best.t) + '</p><p style="margin:6px 0 0">' + esc(best.fb) + '</p>');
            }
            saveDoc('ai_learning_events', { type: 'scenario', ref: sc.id || 'ai' });
            bot('Bạn đã chọn hướng tốt **' + score.ok + '/' + score.total + '** tình huống trong buổi này.');
            const list = [{ label: '🎭 Tình huống tiếp theo', cls: 'dai-chip--primary', fn: () => { user('Tình huống tiếp theo'); playScenario(pickLocalScenario()); } }];
            if (sc.lesson) list.push({ label: '📖 Học bài liên quan', fn: () => { user('Học bài liên quan'); playLesson(sc.lesson, 0); } });
            list.push({ label: '☰ Menu', cls: 'dai-chip--ghost', fn: () => menu() });
            chips(list);
          },
        })));
      }

      async function aiScenario() {
        if (!aiAvailable()) {
          bot('Tính năng AI tạo tình huống mới cần kết nối AI. Trong lúc này, mình dùng một tình huống có sẵn nhé.');
          return playScenario(pickLocalScenario());
        }
        chips([]);
        const r = await ask('learning_scenario', [{ role: 'user', content: 'Tạo 1 tình huống mới về áp lực học đường cho học sinh THCS/THPT.' }], () => null);
        if (!r || state.destroyed) return;
        let sc = null;
        if (r.reply) {
          try {
            const j = JSON.parse(r.reply.replace(/```json|```/g, '').trim());
            if (j && j.situation && Array.isArray(j.options) && j.options.length >= 2 && j.options.every(o => o && o.t && o.fb)) {
              sc = { title: j.title || '', situation: String(j.situation), options: j.options.slice(0, 4).map(o => ({ t: String(o.t), fb: String(o.fb), ok: ['tốt', 'tạm', 'chưa'].indexOf(o.ok) !== -1 ? o.ok : 'chưa' })) };
              if (!sc.options.some(o => o.ok === 'tốt')) sc = null;
            }
          } catch (e) { sc = null; }
        }
        if (!sc) { bot('Mình chưa tạo được tình huống mới, thử một tình huống có sẵn nhé.'); sc = pickLocalScenario(); }
        playScenario(sc);
      }

      api.start = () => menu(true);
      api.openLesson = id => playLesson(id, 0);
    }

    return api;
  }

  // Điều hướng sang trang AI Learning (dùng cơ chế SPA của spa.js khi có)
  function goLearningPage(lessonId) {
    const a = document.createElement('a');
    a.href = 'ai-learning.html' + (lessonId ? '#bai-' + lessonId : '');
    a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ------------------------------------------------------------------
  // Widget nổi (góc phải dưới) — tồn tại xuyên suốt khi chuyển trang
  // ------------------------------------------------------------------
  function initWidget() {
    if (document.getElementById('dai-widget')) return;
    const wrap = document.createElement('div');
    wrap.id = 'dai-widget';
    wrap.innerHTML =
      '<button type="button" class="dai-launcher" aria-haspopup="dialog" aria-expanded="false" aria-controls="dai-panel">' +
      '<span class="dai-launcher__icon" aria-hidden="true">🦆</span><span class="dai-launcher__text">Hỏi Duck AI</span></button>' +
      '<section id="dai-panel" class="dai-panel" role="dialog" aria-label="Trợ lý Duck Care AI" hidden>' +
      '<header class="dai-panel__head"><div><strong>Duck Care AI</strong><span>Trợ lý ảo cho học sinh</span></div>' +
      '<button type="button" class="dai-close" aria-label="Đóng">✕</button></header>' +
      '<div class="dai-tabs" role="tablist">' +
      '<button type="button" role="tab" class="dai-tab is-active" data-mode="screening" aria-selected="true">🩺 Screening</button>' +
      '<button type="button" role="tab" class="dai-tab" data-mode="learning" aria-selected="false">📚 Learning</button></div>' +
      '<div class="dai-panes"><div class="dai-pane" data-pane="screening"></div><div class="dai-pane" data-pane="learning" hidden></div></div>' +
      '</section>';
    document.body.appendChild(wrap);

    const launcher = wrap.querySelector('.dai-launcher');
    const panel = wrap.querySelector('.dai-panel');
    const tabs = wrap.querySelectorAll('.dai-tab');
    const chats = {};
    let active = 'screening';

    function ensure(mode) {
      if (chats[mode]) return chats[mode];
      const pane = wrap.querySelector('[data-pane="' + mode + '"]');
      const c = createChat(pane, mode, { goLearning: id => { switchTo('learning'); chats.learning.openLesson(id); } });
      chats[mode] = c; c.start();
      return c;
    }
    function switchTo(mode) {
      active = mode;
      tabs.forEach(t => { const on = t.dataset.mode === mode; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
      wrap.querySelectorAll('.dai-pane').forEach(p => { p.hidden = p.dataset.pane !== mode; });
      ensure(mode);
    }
    function open() {
      panel.hidden = false; launcher.setAttribute('aria-expanded', 'true'); wrap.classList.add('is-open');
      switchTo(active);
      setTimeout(() => { const c = chats[active]; if (c) c.focus(); }, 50);
    }
    function close() { panel.hidden = true; launcher.setAttribute('aria-expanded', 'false'); wrap.classList.remove('is-open'); launcher.focus(); }

    launcher.addEventListener('click', () => (panel.hidden ? open() : close()));
    wrap.querySelector('.dai-close').addEventListener('click', close);
    tabs.forEach(t => t.addEventListener('click', () => switchTo(t.dataset.mode)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });

    // Ẩn widget ở 2 trang AI (đã có khung chat đầy đủ) — cập nhật sau mỗi lần chuyển trang
    function syncVisibility() {
      const p = (typeof duckPageName === 'function') ? duckPageName() : '';
      const onAiPage = p === 'ai-screening.html' || p === 'ai-learning.html';
      wrap.hidden = onAiPage;
      if (onAiPage && !panel.hidden) close();
    }
    document.addEventListener('duck:pagechange', syncVisibility);
    syncVisibility();
  }

  // ------------------------------------------------------------------
  // API công khai
  // ------------------------------------------------------------------
  window.DuckAI = {
    mount(container, mode, opts) {
      const chat = createChat(container, mode, opts);
      chat.start();
      return chat;
    },
    aiAvailable,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWidget);
  else initWidget();
})();
