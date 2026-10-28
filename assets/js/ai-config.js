/**
 * ============================================================
 *  CẤU HÌNH DUCK CARE AI — gọi AI qua Duck AI Gateway (n8n)
 * ============================================================
 * KHÔNG có API key LLM ở đây. Key thật chỉ nằm trong Credentials của n8n.
 * Trình duyệt chỉ xin một token sống ~5 phút (dựa trên phiên Firebase ẩn danh) rồi gửi câu hỏi tới n8n;
 * n8n kiểm tra, gắn system prompt, chọn model và gọi LLM. Xem n8n/HUONG-DAN-N8N-GATEWAY.md.
 *
 * Để gatewayBaseUrl trống → "chế độ cơ bản" (bài học, tình huống, khảo sát vẫn chạy, chat trả lời mẫu).
 */
window.DUCK_AI_CONFIG = {
  // URL gốc của webhook n8n (KHÔNG có dấu "/" ở cuối), ví dụ: https://n8n.ten-mien.com/webhook
  gatewayBaseUrl: "https://n8nhosting-67079049.phoaify.com/webhook",

  // Số tin nhắn gần nhất gửi kèm để AI hiểu ngữ cảnh (n8n còn cắt lại theo giới hạn của nó)
  maxHistory: 10,

  // Thời gian chờ tối đa cho 1 câu trả lời (ms)
  timeoutMs: 45000,
};
