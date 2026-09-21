/**
 * Duck Care Space — điều hướng "thông suốt" (không tải lại trang)
 * ============================================================
 * Cách hoạt động (chạy được trên GitHub Pages, không cần cấu hình máy chủ):
 *   - Mỗi trang vẫn là 1 file .html thật => mở link trực tiếp, F5, chia sẻ link,
 *     công cụ tìm kiếm... đều hoạt động bình thường, kể cả khi JS bị tắt.
 *   - Khi người dùng bấm link tới trang khác của web, file này tải ngầm trang đó
 *     (fetch), rồi CHỈ thay phần nội dung trong #page-root + CSS/JS riêng của trang.
 *     Header, font, kết nối Firebase... được giữ nguyên nên chuyển trang gần như tức thì.
 *   - Cập nhật URL bằng History API => nút Back/Forward của trình duyệt vẫn đúng.
 *   - Lỗi bất kỳ (mất mạng, trang lỗi...) => tự chuyển về cách tải trang thông thường.
 *
 * Quy ước cho mỗi trang (xem README → "Thêm trang mới"):
 *   1. Nội dung riêng của trang nằm trong <div id="page-root"> ... </div>.
 *   2. Script riêng của trang đặt cuối <body>, bọc trong (function () { ... })();
 *      để biến const/let không xung đột khi chạy lại nhiều lần.
 *   3. Timer / listener trên document, window / âm thanh cần dừng khi rời trang:
 *      đăng ký bằng Duck.onLeave(function () { ... }).
 *   4. Tên file trang phải có trong danh sách PAGES bên dưới.
 */
(function () {
  'use strict';

  // Trình duyệt quá cũ => giữ nguyên cách điều hướng thông thường
  if (!window.fetch || !window.DOMParser || !window.history || !history.pushState) return;

  const PAGES = ['index.html', 'radar.html', 'calm.html', 'journal.html', 'whispers.html'];
  const ROOT_ID = 'page-root';

  // "radar.html" | "/radar" | "/" ... => tên file trang; null nếu không phải trang của web này
  function pageOf(url) {
    let seg = url.pathname.split('/').pop();
    if (!seg) return 'index.html';
    if (seg.indexOf('.') === -1) seg += '.html';
    return PAGES.indexOf(seg) !== -1 ? seg : null;
  }

  let currentPage = pageOf(new URL(location.href));
  if (!currentPage || !document.getElementById(ROOT_ID)) return; // trang không thuộc cơ chế này

  // CSS riêng của trang đầu tiên (các khối <style> trong <head>) cũng phải gỡ được khi chuyển trang
  document.head.querySelectorAll('style').forEach(el => el.setAttribute('data-spa-page', ''));

  // ---------------------------------------------------------------
  // Tải & phân tích trang (có cache theo phiên để lần sau tức thì)
  // ---------------------------------------------------------------
  const cache = new Map(); // tên trang -> Promise<dữ liệu đã phân tích>

  function parsePage(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const root = doc.getElementById(ROOT_ID);
    if (!root) throw new Error('Trang đích không có #' + ROOT_ID);
    const desc = doc.querySelector('meta[name="description"]');
    return {
      title: doc.title,
      description: desc ? desc.getAttribute('content') : null,
      styles: Array.from(doc.head.querySelectorAll('style')).map(el => el.textContent),
      stylesheets: Array.from(doc.head.querySelectorAll('link[rel="stylesheet"]')).map(el => el.getAttribute('href')),
      html: root.innerHTML,
      // Script riêng của trang: các <script> nội tuyến ở mức <body> (script có src là thư viện dùng chung, đã nạp sẵn)
      scripts: Array.from(doc.body.querySelectorAll('script:not([src])')).map(el => el.textContent),
    };
  }

  function loadPage(page) {
    if (!cache.has(page)) {
      const fileUrl = new URL(page, location.href).href;
      const p = fetch(fileUrl, { credentials: 'same-origin' })
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(parsePage);
      p.catch(() => cache.delete(page)); // lỗi => lần sau thử lại
      cache.set(page, p);
    }
    return cache.get(page);
  }

  // Nạp trước các trang khác khi trình duyệt rảnh, và khi người dùng rê chuột / chạm / focus vào link
  function prefetchAll() {
    PAGES.forEach(p => { if (p !== currentPage) loadPage(p).catch(() => {}); });
  }
  function onIdle(fn) {
    if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 4000 });
    else setTimeout(fn, 1500);
  }
  if (document.readyState === 'complete') onIdle(prefetchAll);
  else window.addEventListener('load', () => onIdle(prefetchAll));

  ['mouseover', 'touchstart', 'focusin'].forEach(evt => {
    document.addEventListener(evt, (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      const page = pageOf(new URL(a.href, location.href));
      if (page && page !== currentPage) loadPage(page).catch(() => {});
    }, { passive: true });
  });

  // ---------------------------------------------------------------
  // Các bước phụ trợ khi thay trang
  // ---------------------------------------------------------------

  // Nạp thêm file CSS mà trang đích cần (ví dụ Font Awesome của Duck Whispers) và đợi nạp xong
  // để tránh giật hình; tối đa đợi 2,5 giây rồi vẫn tiếp tục.
  function ensureStylesheets(hrefs) {
    const have = new Set(Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href));
    const waits = [];
    hrefs.forEach(h => {
      const abs = new URL(h, document.baseURI).href;
      if (have.has(abs)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = abs;
      waits.push(new Promise(resolve => {
        link.onload = link.onerror = resolve;
        setTimeout(resolve, 2500);
      }));
      document.head.appendChild(link);
    });
    return Promise.all(waits);
  }

  // Chạy script riêng của trang. Tạo thẻ <script> mới để chạy trong phạm vi toàn cục
  // (mỗi script đã tự bọc IIFE nên không xung đột biến).
  function runScript(code, page) {
    const el = document.createElement('script');
    el.textContent = code + '\n//# sourceURL=duck-page-' + page + '.js';
    document.body.appendChild(el);
    el.remove();
  }

  // Thông báo cho trình đọc màn hình biết đã sang trang mới
  let announcer = null;
  function announce(text) {
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.className = 'sr-only';
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      document.body.appendChild(announcer);
    }
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = text; }, 50);
  }

  function saveScroll() {
    try { history.replaceState(Object.assign({}, history.state, { scrollY: window.scrollY }), ''); } catch (e) {}
  }

  function scrollAfterSwap(url, mode, savedY) {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto'; // CSS đang bật smooth-scroll; ở đây cần nhảy tức thì
    let target = null;
    if (url.hash.length > 1 && !(mode === 'pop' && typeof savedY === 'number')) {
      try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch (e) {}
    }
    if (target) target.scrollIntoView();
    else window.scrollTo(0, mode === 'pop' && typeof savedY === 'number' ? savedY : 0);
    html.style.scrollBehavior = prev;
  }

  // ---------------------------------------------------------------
  // Thay trang
  // ---------------------------------------------------------------
  function applyPage(data, url, mode, page) {
    // 1. Dọn dẹp trang cũ (timer, âm thanh, listener toàn cục...)
    const hooks = (window.Duck && Duck._leaveHooks) ? Duck._leaveHooks.splice(0) : [];
    hooks.forEach(fn => { try { fn(); } catch (e) { console.warn('Lỗi khi dọn dẹp trang cũ:', e); } });

    // 2. CSS riêng của trang: bỏ của trang cũ, thêm của trang mới (cùng một nhịp => không bị giật)
    document.querySelectorAll('style[data-spa-page]').forEach(el => el.remove());
    data.styles.forEach(css => {
      const st = document.createElement('style');
      st.setAttribute('data-spa-page', '');
      st.textContent = css;
      document.head.appendChild(st);
    });

    // 3. Lịch sử trình duyệt
    if (mode === 'push') {
      saveScroll();
      history.pushState({ scrollY: 0 }, '', url.href);
    }

    // 4. Nội dung + tiêu đề
    const root = document.getElementById(ROOT_ID);
    root.innerHTML = data.html;
    document.title = data.title;
    if (data.description !== null) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', data.description);
    }
    currentPage = page;

    // 5. Menu: đánh dấu mục hiện tại, đóng menu di động
    if (window.duckMarkActiveNav) duckMarkActiveNav();
    if (window.duckCloseNav) duckCloseNav();

    // 6. Script riêng của trang mới
    data.scripts.forEach(code => runScript(code, page));

    // 7. Đếm lượt xem trang (đã chống đếm trùng theo phiên trong app.js)
    if (window.trackPageView) trackPageView();

    // 8. Cuộn, hiệu ứng mờ dần, focus cho bàn phím / trình đọc màn hình
    scrollAfterSwap(url, mode, history.state && history.state.scrollY);
    root.classList.remove('page-enter');
    void root.offsetWidth; // chạy lại animation
    root.classList.add('page-enter');
    root.addEventListener('animationend', () => root.classList.remove('page-enter'), { once: true });

    const main = document.getElementById('main');
    if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
    announce(data.title);
  }

  let navToken = 0;
  async function go(url, mode) {
    const page = pageOf(url);
    const token = ++navToken;
    // Nếu tải > 150ms mới đổi con trỏ sang "đang tải" (tránh nháy khi tải nhanh)
    const slowTimer = setTimeout(() => document.documentElement.classList.add('is-navigating'), 150);
    try {
      const data = await loadPage(page);
      await ensureStylesheets(data.stylesheets);
      if (token !== navToken) return; // đã có lượt điều hướng mới hơn
      applyPage(data, url, mode, page);
    } catch (err) {
      console.warn('Điều hướng không tải lại trang thất bại, chuyển sang tải trang thường:', err);
      location.href = url.href;
    } finally {
      clearTimeout(slowTimer);
      if (token === navToken) document.documentElement.classList.remove('is-navigating');
    }
  }

  // ---------------------------------------------------------------
  // Bắt sự kiện bấm link
  // ---------------------------------------------------------------
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;

    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const page = pageOf(url);
    if (!page) return; // ví dụ admin.html: để trình duyệt tải bình thường

    if (page === currentPage) {
      if (url.hash) return; // neo trong cùng trang (#gioi-thieu...): để trình duyệt tự cuộn
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' }); // bấm lại đúng trang đang mở => chỉ cuộn lên đầu
      return;
    }
    e.preventDefault();
    go(url, 'push');
  });

  // Nút Back / Forward
  window.addEventListener('popstate', () => {
    const url = new URL(location.href);
    const page = pageOf(url);
    if (!page) { location.reload(); return; }
    const y = history.state && history.state.scrollY;
    if (page === currentPage) {
      // Cùng trang, chỉ đổi neo (#...) hoặc vị trí cuộn
      scrollAfterSwap(url, 'pop', y);
      return;
    }
    go(url, 'pop');
  });

  // Tự quản lý vị trí cuộn (mặc định trình duyệt khôi phục cuộn ngay, trước khi nội dung mới kịp hiện)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('pagehide', saveScroll);
  const initialY = history.state && history.state.scrollY;
  if (typeof initialY === 'number' && initialY > 0 && !location.hash) {
    requestAnimationFrame(() => window.scrollTo(0, initialY)); // F5 => giữ nguyên chỗ đang đọc
  }
})();
