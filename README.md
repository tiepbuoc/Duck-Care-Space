# Duck Care Space

Nền tảng can thiệp số cho dự án **Duck Care–SEGC**. Web tĩnh (HTML/CSS/JS thuần, không cần build) host trên **GitHub Pages**, toàn bộ phần "động" (lưu kết quả test, hòm thư ẩn danh, tài khoản Admin, thống kê) chạy trên **Firebase** (Firestore + Authentication).

> ⚠️ **Nếu bạn đã publish `firestore.rules` từ trước**: Duck Whispers vừa được bổ sung trường `title` và tính năng thả tim (`likeCount` + subcollection `likes`). Bạn **cần publish lại** nội dung `firestore.rules` mới nhất trong Firebase Console → Firestore → Rules, nếu không tính năng gửi tâm sự và thả tim sẽ báo lỗi quyền truy cập.

```
duck-care-space/
├─ index.html        Trang chủ
├─ radar.html         Module S — Duck Radar (bộ test)
├─ calm.html          Module E — Hồ tĩnh lặng (thở, âm thanh, xả suy nghĩ)
├─ journal.html       Module G — Nhật ký 14 ngày (Local Storage)
├─ whispers.html      Module C — Duck Whispers (hòm thư ẩn danh + Bảng sẻ chia)
├─ admin.html         Admin Dashboard (đăng nhập, thống kê, duyệt tâm sự)
├─ firestore.rules    Luật bảo mật Firestore — BẮT BUỘC phải publish luật này
├─ assets/
│  ├─ css/style.css
│  ├─ js/app.js              tiện ích dùng chung (menu, đếm lượt truy cập)
│  └─ js/firebase-config.js  ← FILE DUY NHẤT CẦN CHỈNH SỬA để kết nối Firebase
└─ README.md          (chính là file này)
```

---

## Phần 1 — Thiết lập Firebase (làm 1 lần)

> Dự án này đã dùng sẵn Firebase project `duck-9a380` — file `assets/js/firebase-config.js` đã được điền cấu hình, **bạn không cần tạo project mới hay sửa file này**, trừ khi muốn đổi sang project Firebase khác.

1. Vào **https://console.firebase.google.com** → chọn đúng project `duck-9a380`.
2. Vào menu trái **Build → Firestore Database** → nếu chưa có database, bấm **Create database** → chọn **Production mode** → chọn vị trí máy chủ gần Việt Nam nhất (ví dụ `asia-southeast1`).
3. Vào tab **Rules** của Firestore → copy toàn bộ nội dung file `firestore.rules` trong repo này → dán đè → **Publish**. (Nếu bỏ qua bước này, toàn bộ web sẽ không ghi/đọc được dữ liệu.)
4. Vào menu trái **Build → Authentication** → **Get started** → tab **Sign-in method** → bật **Email/Password**.

### Thiết lập Admin

1. Authentication → tab **Users** → **Add user**.
2. **Email**: `admin@admin.com`
3. **Password**: đặt mật khẩu bạn muốn (đây là mật khẩu thật để đăng nhập `admin.html`).
4. Copy **UID** của user vừa tạo (hiện ngay trong danh sách Users).
5. Quay lại **Firestore Database → Data** → **Start collection** → đặt tên `admins` → **Document ID** dán đúng UID vừa copy → thêm 1 field bất kỳ, ví dụ `role` (string) = `admin` → **Save**.

   > Đây là bước "cấp quyền Admin". Muốn thêm Admin thứ 2, lặp lại bước 1–5 với tài khoản/email khác.

Xong phần này, vào `admin.html`, đăng nhập bằng email `admin@admin.com` + mật khẩu đã đặt là vào được dashboard.

---

## Phần 2 — Đưa web lên GitHub Pages

1. Tạo một repository mới trên GitHub (ví dụ `duck-care-space`), đẩy (push) toàn bộ nội dung thư mục này lên nhánh `main`.
2. Vào **Settings → Pages** của repo → mục **Build and deployment** → **Source** chọn **Deploy from a branch** → **Branch**: `main`, thư mục `/ (root)` → **Save**.
3. Sau 1–2 phút, GitHub cấp một link dạng `https://<tên-user>.github.io/duck-care-space/` — đây là link web hoạt động.

### Gắn tên miền riêng (tuỳ chọn)

1. Mua domain tại một nhà đăng ký (Mắt Bão, PA Vietnam, Namecheap...).
2. Trong **Settings → Pages** của repo, ở mục **Custom domain**, nhập domain (ví dụ `duckcare.tentruong.edu.vn`) → **Save**. GitHub sẽ tạo file `CNAME` tự động trong repo — không xoá file này.
3. Vào trang quản trị DNS của domain, thêm 1 bản ghi **CNAME** trỏ subdomain (ví dụ `duckcare`) về `<tên-user>.github.io`. (Nếu dùng domain gốc không có subdomain, cần khai báo 4 bản ghi **A** trỏ về các IP của GitHub Pages — xem hướng dẫn chính thức: https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)
4. Đợi DNS cập nhật (vài phút đến vài giờ), sau đó tick **Enforce HTTPS** trong Settings → Pages.

---

## Phần 3 — Việc cần làm thêm trước khi bàn giao chính thức

- **Logo trường**: mở `index.html`, tìm dòng có chú thích `CHÈN LOGO TRƯỜNG`, thay thẻ emoji 🦆 bằng `<img src="assets/img/logo-truong.png" alt="Logo trường">` và đặt file ảnh logo vào `assets/img/`.
- **Âm thanh thư giãn** (module Hồ tĩnh lặng): hiện đang dùng âm thanh tạo trực tiếp bằng Web Audio API (mưa/sóng biển = tiếng ồn đã lọc, Alpha lofi = nhịp hai tai 10Hz) — không cần file mp3, không vướng bản quyền, chạy được ngay trên GitHub Pages. Nếu muốn thay bằng file âm thanh thật, có thể thêm thẻ `<audio>` trỏ tới file `.mp3` (bản quyền mở) đặt trong `assets/audio/` và chỉnh lại phần JS tương ứng trong `calm.html`.
- **Ngưỡng phân loại Duck Radar** (Xanh/Vàng/Đỏ): đang chia đều theo tổng điểm 8 câu hỏi × thang 1–5 (Xanh ≤18, Vàng 19–29, Đỏ ≥30) trong `radar.html`, hàm `classify()`. Nếu nhóm nghiên cứu có thang đo chuẩn hoá riêng (ví dụ dựa trên DASS-21 hay thang đo đã kiểm định), nên thay bằng thang đó để tăng độ tin cậy học thuật.
- **Kiểm duyệt Duck Whispers**: mọi tâm sự gửi lên đều ở trạng thái "chờ duyệt" và **không tự động hiển thị công khai** — Admin phải vào `admin.html` → tab "Duyệt Duck Whispers" để duyệt từng tin trước khi nó xuất hiện ở Bảng sẻ chia. Nhóm vận hành nên phân công người kiểm duyệt thường xuyên, đặc biệt chú ý các tin có dấu hiệu cần hỗ trợ khẩn cấp để chuyển tiếp cho giáo viên/phòng tâm lý kịp thời — hệ thống này không thay thế con người trong các tình huống khẩn cấp.

---

## Phần 4 — Nơi lấy số liệu phục vụ báo cáo KHKT

Tất cả nằm trong `admin.html` sau khi đăng nhập:

- **Tổng lượt truy cập** và lượt truy cập theo từng trang (`site_stats/visits` trên Firestore).
- **Phân bổ mức độ stress** theo 3 mức Xanh/Vàng/Đỏ, số lượt làm Duck Radar (`radar_results`).
- **Số lượt gửi/đã duyệt Duck Whispers** (`whispers`).

Muốn xuất số liệu thô ra Excel/CSV để phân tích sâu hơn: vào Firebase Console → Firestore Database → chọn collection → dùng nút **Export collection** (yêu cầu bật gói Blaze, có hạn mức miễn phí) hoặc copy thủ công từ giao diện Data với quy mô dữ liệu nhỏ của một trường học.

---

## Giới hạn của gói miễn phí (Firebase Spark)

Với quy mô một trường học, gói miễn phí gần như chắc chắn đủ dùng:
- Firestore: 50.000 lượt đọc / 20.000 lượt ghi / 20.000 lượt xoá mỗi ngày.
- Authentication: không giới hạn số tài khoản email/password.

Nếu vượt ngưỡng (ví dụ được nhiều trường cùng dùng), cần nâng lên gói **Blaze** (trả theo lượng dùng vượt mức, mức miễn phí vẫn giữ nguyên).
