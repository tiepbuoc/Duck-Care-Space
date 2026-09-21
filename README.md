# Duck Care Space

Nền tảng can thiệp số cho dự án **Duck Care–SEGC**. Web tĩnh (HTML/CSS/JS thuần, không cần build) host trên **GitHub Pages**, toàn bộ phần "động" (lưu kết quả test, hòm thư ẩn danh, tài khoản Admin, thống kê) chạy trên **Firebase** (Firestore + Authentication).

> ⚠️ **Nếu bạn đã publish `firestore.rules` từ trước**: bản này bổ sung 2 collection mới — `visitors` (đếm người truy cập theo thiết bị) và `breathing_sessions` (đếm lượt tập thở). Bạn **cần publish lại** nội dung `firestore.rules` mới nhất trong Firebase Console → Firestore → Rules. Nếu bỏ qua, web vẫn chạy bình thường nhưng 2 số liệu mới sẽ không được ghi nhận (và Admin sẽ hiện "—" ở các thẻ tương ứng).

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
│  ├─ audio/                 ← đặt rain.mp3, wave.mp3, chill.mp3 vào đây
│  ├─ css/style.css
│  ├─ js/app.js              tiện ích dùng chung (menu, đếm lượt truy cập)
│  ├─ js/spa.js              điều hướng "thông suốt" — chuyển trang không tải lại
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
- **Âm thanh thư giãn** (module Hồ tĩnh lặng): trang `calm.html` phát 3 file mp3 nằm trong `assets/audio/`, mỗi file tự **lặp lại vô hạn** khi bật:
  - `assets/audio/rain.mp3` → nút "Mưa rơi"
  - `assets/audio/wave.mp3` → nút "Sóng biển"
  - `assets/audio/chill.mp3` → nút "Nhạc chill"

  Tên file phải đúng như trên (chữ thường). Nếu chưa có file, bấm nút sẽ hiện thông báo "Chưa tải được âm thanh" chứ không làm hỏng trang. Chỉ dùng âm thanh có bản quyền mở hoặc do nhóm tự sở hữu. Muốn đổi tên file, sửa đối tượng `SOUND_FILES` trong `calm.html`.
- **Ngưỡng phân loại Duck Radar** (Xanh/Vàng/Đỏ): đang chia đều theo tổng điểm 8 câu hỏi × thang 1–5 (Xanh ≤18, Vàng 19–29, Đỏ ≥30) trong `radar.html`, hàm `classify()`. Nếu nhóm nghiên cứu có thang đo chuẩn hoá riêng (ví dụ dựa trên DASS-21 hay thang đo đã kiểm định), nên thay bằng thang đó để tăng độ tin cậy học thuật.
- **Kiểm duyệt Duck Whispers**: mọi tâm sự gửi lên đều ở trạng thái "chờ duyệt" và **không tự động hiển thị công khai** — Admin phải vào `admin.html` → tab "Duyệt Duck Whispers" để duyệt từng tin trước khi nó xuất hiện ở Bảng sẻ chia. Nhóm vận hành nên phân công người kiểm duyệt thường xuyên, đặc biệt chú ý các tin có dấu hiệu cần hỗ trợ khẩn cấp để chuyển tiếp cho giáo viên/phòng tâm lý kịp thời — hệ thống này không thay thế con người trong các tình huống khẩn cấp.

---

## Phần 4 — Nơi lấy số liệu phục vụ báo cáo KHKT

Tất cả nằm trong `admin.html` sau khi đăng nhập:

- **Người truy cập**: mỗi thiết bị/trình duyệt = 1 người (collection `visitors`). Mã thiết bị là chuỗi ngẫu nhiên lưu trong trình duyệt, không gắn IP hay danh tính. Giới hạn: người xoá dữ liệu trình duyệt hoặc dùng chế độ ẩn danh sẽ bị tính là thiết bị mới.
- **Tổng lượt xem trang** và lượt xem theo từng trang (`site_stats/visits`) — mỗi trang chỉ đếm 1 lần cho mỗi phiên trình duyệt.
- **Phân bổ mức độ stress** Xanh/Vàng/Đỏ và số lượt làm Duck Radar (`radar_results`).
- **Lượt tập thở**: mỗi lần bấm "Bắt đầu hít thở" ở Hồ tĩnh lặng tính 1 lượt (`breathing_sessions`).
- **Số lượt gửi/đã duyệt Duck Whispers** (`whispers`).

### Xuất báo cáo Excel

Bấm nút **⬇ Xuất báo cáo Excel** ở góc trên của Admin Dashboard để tải file `DuckCare_BaoCao_<ngày>.xlsx` (không cần bật gói Blaze). File gồm 7 sheet: *Tổng quan*, *Theo ngày*, *Duck Radar*, *Lượt tập thở*, *Duck Whispers*, *Người truy cập*, *Lượt xem theo trang*. Thời gian trong file theo giờ của máy đang xuất. File có **nội dung đầy đủ các tâm sự** (kể cả chưa duyệt/đã từ chối) nên cần bảo quản như dữ liệu nhạy cảm. Để xuất được, máy cần kết nối Internet tới `cdnjs.cloudflare.com` (thư viện SheetJS).

Muốn xuất dữ liệu thô trực tiếp từ Firestore: Firebase Console → Firestore Database → chọn collection → **Export collection** (yêu cầu gói Blaze).

---

## Phần 5 — Điều hướng "thông suốt" (không tải lại trang)

Khi người dùng bấm menu hoặc bất kỳ link nào giữa 5 trang công khai (Trang chủ, Duck Radar, Hồ tĩnh lặng, Nhật ký, Duck Whispers), `assets/js/spa.js` tải ngầm trang đích rồi chỉ thay phần nội dung. Header, font, kết nối Firebase được giữ nguyên nên chuyển trang gần như tức thì, có hiệu ứng mờ dần nhẹ. Các trang được nạp trước khi trình duyệt rảnh hoặc khi người dùng rê chuột / chạm vào link.

**Vẫn chạy bình thường trên GitHub Pages, không cần cấu hình gì thêm**, vì mỗi trang vẫn là một file `.html` thật: mở link trực tiếp, F5, chia sẻ link, nút Back/Forward, tên miền riêng đều hoạt động. Nếu trình duyệt quá cũ hoặc tải ngầm bị lỗi (mất mạng...), web tự quay về cách chuyển trang thông thường.

Những điểm cần biết:
- **`admin.html` vẫn tải trang riêng** (có đăng nhập và thư viện Excel riêng), không nằm trong cơ chế này.
- **Rời Hồ tĩnh lặng thì âm thanh và đồng hồ thở tự dừng** (để không có âm thanh chạy nền mà không có nút tắt).
- Bấm lại đúng trang đang mở chỉ cuộn lên đầu trang, không đặt lại nội dung (ví dụ bài Duck Radar đang làm dở không bị mất).
- Lượt xem trang vẫn được đếm cho mỗi trang, mỗi phiên trình duyệt như trước.

### Thêm trang mới
1. Sao chép cấu trúc một trang hiện có. Toàn bộ nội dung riêng của trang nằm trong `<div id="page-root"> ... </div>` (ngay sau `</header>`, đóng ngay trước các thẻ `<script src=...>`). Nhớ nạp `assets/js/app.js` rồi `assets/js/spa.js`.
2. Script riêng của trang đặt cuối `<body>`, **bọc trong `(function () { ... })();`** để `const`/`let` không bị khai báo trùng khi trang được nạp lại.
3. Timer, âm thanh, hoặc listener gắn vào `document`/`window` phải đăng ký hàm dọn dẹp: `Duck.onLeave(function () { ... });` (xem `calm.html`, `whispers.html`).
4. Thêm tên file vào mảng `PAGES` đầu `assets/js/spa.js`, và thêm link vào menu ở mọi trang.

---

## Phần 6 — Con vịt kéo thả ở trang chủ

Con vịt ở hero trang chủ có thể "cầm" để kéo đi quanh hồ. Sóng elip và bóng nước nằm chung nhóm SVG `#duck-drag` với vịt nên di chuyển đồng thời, vẫn giữ nguyên nhịp nhấp nhô và lan tỏa.

- **Chuột / cảm ứng / bút**: kéo thả bằng Pointer Events. Chạm vào vịt trên điện thoại sẽ không làm cuộn trang; các vùng khác của màn hình vẫn cuộn bình thường.
- **Bàn phím**: Tab để chọn vịt, phím mũi tên để di chuyển (giữ Shift để đi nhanh), Home để về giữa hồ.
- **Chạm 2 lần liên tiếp** vào vịt cũng đưa vịt về giữa hồ.
- Vịt chỉ di chuyển trong khung `.hero-duck-slot` (cột bên phải của hero), không đè lên chữ hay nút bấm. Vị trí không được lưu: mỗi lần vào lại trang chủ, vịt về giữa hồ.
- Muốn chỉnh: logic nằm ở script cuối `index.html`. Hằng số `DUCK_BOX` là hộp bao của vịt (chỉ cần đổi khi bạn vẽ lại vịt), `KEY_STEP` là bước phím mũi tên. Muốn vịt đi được rộng hơn, đổi `slot` trong hàm `bounds()` sang phần tử lớn hơn (ví dụ `.hero-section`).

---

## Giới hạn của gói miễn phí (Firebase Spark)

Với quy mô một trường học, gói miễn phí gần như chắc chắn đủ dùng:
- Firestore: 50.000 lượt đọc / 20.000 lượt ghi / 20.000 lượt xoá mỗi ngày.
- Authentication: không giới hạn số tài khoản email/password.

Nếu vượt ngưỡng (ví dụ được nhiều trường cùng dùng), cần nâng lên gói **Blaze** (trả theo lượng dùng vượt mức, mức miễn phí vẫn giữ nguyên).
