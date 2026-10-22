/**
 * ============================================================
 *  CẤU HÌNH DUCK CARE AI
 * ============================================================
 * Gọi AI theo đúng cách dự án NR10: API chuẩn OpenAI-compatible
 *   POST {baseUrl}/chat/completions   (Authorization: Bearer apiKey)
 *
 * Thứ tự ưu tiên:
 *   1) baseUrl + apiKey  → gọi thẳng từ trình duyệt (như NR10)
 *   2) endpoint (Worker) → gọi qua máy chủ trung gian, giấu khóa (xem worker/ + README Phần 7)
 *   3) để trống cả hai   → "chế độ cơ bản" (bài học, tình huống, khảo sát vẫn chạy)
 *
 * ⚠️ Khóa đặt ở đây thì AI mở trang cũng đọc & dùng được. Chỉ nên dùng khi TEST /
 *    đặt hạn mức chi tiêu thấp. Khi triển khai thật nên xoá apiKey và dùng endpoint (Worker).
 */
window.DUCK_AI_CONFIG = {
  baseUrl: "https://api.shopaikey.com/v1",
  model: "gpt-4.1-mini-2025-04-14",
  apiKey: "sk-4150297863e3eee405805e8609648e6c5cebb1b502ffb46e",
  maxTokens: 1500,
  temperature: 0.6,

  // (tuỳ chọn) địa chỉ Worker trung gian — chỉ dùng khi baseUrl/apiKey để trống
  endpoint: '',

  // Số tin nhắn gần nhất gửi kèm để AI hiểu ngữ cảnh
  maxHistory: 10,

  // Thời gian chờ tối đa cho 1 câu trả lời (ms)
  timeoutMs: 45000,
};
