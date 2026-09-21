/**
 * ============================================================
 *  CẤU HÌNH FIREBASE — DUCK CARE SPACE
 * ============================================================
 * Đây là file DUY NHẤT bạn cần chỉnh sửa để kết nối toàn bộ
 * website với dự án Firebase của bạn.
 *
 * Cách lấy thông tin bên dưới:
 * 1. Vào https://console.firebase.google.com → Tạo dự án mới
 *    (ví dụ: "duck-care-space").
 * 2. Trong dự án, bấm biểu tượng </> "Web app" để đăng ký 1 app web.
 * 3. Firebase sẽ cung cấp một đoạn "firebaseConfig" giống hệt
 *    cấu trúc bên dưới — copy đè vào đây.
 * 4. Vào Firestore Database → Tạo database (chọn chế độ production).
 * 5. Vào Authentication → Sign-in method → bật "Email/Password"
 *    (dùng để tạo tài khoản Admin duy nhất, xem README.md).
 *
 * Hướng dẫn triển khai đầy đủ nằm trong README.md ở thư mục gốc.
 * ============================================================
 */

const firebaseConfig = {
  apiKey: "AIzaSyBX7Zfew2e3D6fHrz1_o3nHZeaDeh14ddw",
  authDomain: "duck-9a380.firebaseapp.com",
  databaseURL: "https://duck-9a380-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "duck-9a380",
  storageBucket: "duck-9a380.firebasestorage.app",
  messagingSenderId: "627823271198",
  appId: "1:627823271198:web:03143fea26bca30b9b3d0f",
  measurementId: "G-32BXNBH31P"
};

// Khởi tạo Firebase (dùng SDK dạng "compat" để nhúng trực tiếp bằng <script>,
// không cần công cụ build như Webpack/Vite — phù hợp GitHub Pages tĩnh).
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

// Bật Analytics nếu measurementId đã được điền hợp lệ.
try {
  if (firebase.analytics && !firebaseConfig.measurementId.includes("XXXXXXXXXX")) {
    firebase.analytics();
  }
} catch (e) {
  // Analytics không bắt buộc — bỏ qua nếu lỗi (ví dụ bị trình chặn quảng cáo chặn).
  console.warn("Firebase Analytics chưa sẵn sàng:", e.message);
}
