// Duck Care Space — tiện ích dùng chung cho mọi trang

// Không gian tên dùng chung. Các trang gọi Duck.onLeave(fn) để đăng ký hàm dọn dẹp
// (dừng timer, tắt âm thanh, gỡ listener trên document/window...) — điều hướng "thông
// suốt" (assets/js/spa.js) sẽ chạy các hàm này khi người dùng rời trang mà KHÔNG tải lại.
window.Duck = window.Duck || {
  _leaveHooks: [],
  onLeave(fn) { if (typeof fn === 'function') this._leaveHooks.push(fn); },
};

// Tên file trang hiện tại: "/", "/duck-care-space/" => index.html; "/radar" => radar.html
function duckPageName() {
  let seg = window.location.pathname.split('/').pop();
  if (!seg) return 'index.html';
  if (seg.indexOf('.') === -1) seg += '.html'; // GitHub Pages cho phép mở /radar thay cho /radar.html
  return seg;
}

// Đánh dấu mục nav của trang hiện tại (gọi lại sau mỗi lần điều hướng không tải lại trang)
function duckMarkActiveNav() {
  const here = duckPageName();
  document.querySelectorAll('.site-nav a').forEach(a => {
    const target = (a.getAttribute('href') || '').split('#')[0];
    const active = target === here;
    a.classList.toggle('is-active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

// Đóng menu di động (gọi sau khi chuyển trang)
function duckCloseNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (nav) nav.classList.remove('is-open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

document.addEventListener('DOMContentLoaded', () => {
  // Header được giữ nguyên khi chuyển trang => chỉ cần gắn sự kiện 1 lần
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  duckMarkActiveNav();
});

// Sinh mã định danh ẩn danh ngắn, chỉ tồn tại trong phiên trình duyệt hiện tại
// (không gắn với bất kỳ thông tin cá nhân nào) — dùng để tránh gửi trùng lặp.
function duckAnonId() {
  let id = sessionStorage.getItem('duck_session_id');
  if (!id) {
    id = 'anon-' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('duck_session_id', id);
  }
  return id;
}

// Mã định danh bền vững hơn (lưu ở Local Storage thay vì Session Storage),
// dùng riêng cho tính năng "thả tim" ở Duck Whispers — để một trình duyệt
// chỉ tim được 1 lần trên mỗi bài, kể cả khi đóng rồi mở lại trang.
// Đây vẫn là mã ngẫu nhiên, không gắn với danh tính thật của người dùng.
function duckLikerId() {
  let id = localStorage.getItem('duck_liker_id');
  if (!id) {
    id = 'liker-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('duck_liker_id', id);
  }
  return id;
}

// Mã định danh THIẾT BỊ (lưu bền ở Local Storage) — dùng để đếm "số người truy
// cập": mỗi thiết bị/trình duyệt = 1 người. Đây là chuỗi ngẫu nhiên, KHÔNG gắn
// với IP, tên hay bất kỳ thông tin cá nhân nào. Nếu người dùng xoá dữ liệu trình
// duyệt hoặc dùng chế độ ẩn danh, họ sẽ được tính là thiết bị mới.
function duckDeviceId() {
  try {
    let id = localStorage.getItem('duck_device_id');
    if (!id) {
      id = 'dev-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem('duck_device_id', id);
    }
    return id;
  } catch (e) {
    return null; // trình duyệt chặn localStorage => không đếm được thiết bị
  }
}

// Ghi nhận 1 lượt xem trang vào Firestore (site_stats/visits) để Admin
// Dashboard hiển thị "Tổng lượt xem trang". Không gắn IP hay thông tin cá nhân —
// chỉ tăng một bộ đếm tổng và một bộ đếm theo trang. Chạy 1 lần / phiên trình
// duyệt (dùng sessionStorage để tránh đếm trùng khi người dùng bấm qua lại).
function trackPageView() {
  if (typeof db === 'undefined') return; // trang chưa nhúng Firebase
  const page = duckPageName();
  const flagKey = 'duck_view_logged_' + page;
  if (sessionStorage.getItem(flagKey)) return;
  sessionStorage.setItem(flagKey, '1');

  const safeKey = page.replace(/\./g, '_'); // tên trường không nên chứa dấu chấm
  // Lưu ý: dùng object lồng nhau { byPage: { tên_trang: +1 } } thay vì khoá dạng
  // "byPage.tên_trang" — với set()+merge, khoá có dấu chấm sẽ bị coi là TÊN TRƯỜNG
  // nguyên văn và bị Firestore Rules từ chối.
  db.collection('site_stats').doc('visits').set({
    count: firebase.firestore.FieldValue.increment(1),
    byPage: { [safeKey]: firebase.firestore.FieldValue.increment(1) },
  }, { merge: true }).catch(err => console.warn('Không ghi nhận được lượt truy cập:', err.message));
}

// Ghi nhận "người truy cập duy nhất": mỗi thiết bị chỉ tạo đúng 1 document
// visitors/{deviceId} vào lần đầu tiên truy cập (Firestore Rules không cho sửa/xoá).
// Cờ 'duck_device_registered' giúp các lần sau không gửi lại request.
function trackUniqueVisitor() {
  if (typeof db === 'undefined') return;
  let registered = null;
  try { registered = localStorage.getItem('duck_device_registered'); } catch (e) { return; }
  if (registered) return;

  const deviceId = duckDeviceId();
  if (!deviceId) return;

  const page = duckPageName();
  db.collection('visitors').doc(deviceId).set({
    firstSeen: firebase.firestore.FieldValue.serverTimestamp(),
    firstPage: page,
  }).then(() => {
    try { localStorage.setItem('duck_device_registered', '1'); } catch (e) {}
  }).catch(err => console.warn('Không ghi nhận được người truy cập:', err.message));
}

document.addEventListener('DOMContentLoaded', () => {
  trackPageView();
  trackUniqueVisitor();
});
