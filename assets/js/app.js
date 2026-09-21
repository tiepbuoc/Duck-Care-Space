// Duck Care Space — tiện ích dùng chung cho mọi trang

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Đánh dấu mục nav hiện tại
  const here = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach(a => {
    const target = a.getAttribute('href');
    if (target === here) a.classList.add('is-active');
  });
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

// Ghi nhận 1 lượt xem trang vào Firestore (site_stats/visits) để Admin
// Dashboard hiển thị "Tổng lượt truy cập". Không gắn IP hay thông tin cá nhân —
// chỉ tăng một bộ đếm tổng và một bộ đếm theo trang. Chạy 1 lần / phiên trình
// duyệt (dùng sessionStorage để tránh đếm trùng khi người dùng bấm qua lại).
function trackPageView() {
  if (typeof db === 'undefined') return; // trang chưa nhúng Firebase
  const flagKey = 'duck_view_logged_' + (window.location.pathname.split('/').pop() || 'index.html');
  if (sessionStorage.getItem(flagKey)) return;
  sessionStorage.setItem(flagKey, '1');

  const page = window.location.pathname.split('/').pop() || 'index.html';
  const safeKey = page.replace(/\./g, '_'); // Firestore field path không nên chứa dấu chấm
  db.collection('site_stats').doc('visits').set({
    count: firebase.firestore.FieldValue.increment(1),
    [`byPage.${safeKey}`]: firebase.firestore.FieldValue.increment(1),
  }, { merge: true }).catch(err => console.warn('Không ghi nhận được lượt truy cập:', err.message));
}
document.addEventListener('DOMContentLoaded', trackPageView);
