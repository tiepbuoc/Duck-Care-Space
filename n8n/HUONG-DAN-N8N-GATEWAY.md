# Duck AI Gateway — gọi AI qua n8n (tách biệt với POP-AI)

```
Web ──(Firebase ID token ẩn danh + page_url)──► n8n /duck-gw-token ──► token 5 phút
Web ──(token + mode + messages + context)─────► n8n /duck-gw-chat  ──► LLM ──► {reply}
Bạn ──(header x-admin-key)────────────────────► n8n /duck-gw-admin ──► thống kê / log / bật-tắt
```

Workflow `duck-gateway.json` là **một workflow riêng** (tên "Duck AI Gateway", đường dẫn `duck-gw-*`). Cấu hình, bộ đếm, khoá ký token, log và thống kê của Duck nằm trong static data của workflow này nên **không dùng chung gì với POP-AI**; import cả hai vào cùng một n8n vẫn chạy độc lập.

## Khác POP-AI ở đâu
- **Học sinh không đăng nhập** → web dùng **Firebase Anonymous Auth** (tự đăng nhập ẩn danh, không thu thập thông tin cá nhân). n8n vẫn xác minh ID token qua Firebase như POP-AI.
- **Nhiều chế độ (`mode`)**: `screening_chat`, `screening_report`, `learning_chat`, `learning_scenario`. System prompt của từng chế độ nằm trong node **Chat Gate** (phía n8n). Trình duyệt chỉ gửi tên chế độ, không gửi prompt.
- Request chat gửi `messages[]` (lịch sử + câu mới nhất, câu cuối phải là `user`) và `context` (object, ví dụ điểm sàng lọc). n8n cắt ngắn và gắn vào prompt như dữ liệu tham khảo, không phải lệnh.
- Hạn mức nhỏ hơn: tin nhắn ≤ 600 ký tự, `context` ≤ 1500 ký tự, 8 câu/phút/người.

## Cài đặt
1. **Firebase Console** (project `duck-9a380`) → Authentication → Sign-in method → bật **Anonymous**. Không bật thì AI báo lỗi `anon_auth_disabled` và web tự rơi về "chế độ cơ bản".
2. **Credential LLM**: n8n → Credentials → Create → **Header Auth**, đặt tên `LLM API Key` (dùng lại credential của POP-AI cũng được). Name: `Authorization`, Value: `Bearer <API key>`.
3. **Import** `duck-gateway.json`. Ở 3 node `LLM 1/2/3`, chọn credential `LLM API Key`.
4. **Sửa node `Config`**:
   - `allowedOrigins`: **đổi thành origin GitHub Pages của Duck** (hiện đặt `https://tiepbuoc.github.io`; nếu dùng tên miền riêng thì thêm vào). Thêm `http://localhost:5500` nếu chạy thử ở máy.
   - `adminKey`: chuỗi ngẫu nhiên ≥ 16 ký tự (`openssl rand -hex 16`); để rỗng là tắt endpoint admin.
   - Hạn mức, `models`, `maxTokens` chỉnh theo ngân sách.
5. **Bật workflow** (Active/Publish). URL: `https://<n8n-host>/webhook/duck-gw-token`, `/duck-gw-chat`, `/duck-gw-admin`.
6. **Web**: `assets/js/ai-config.js` → `gatewayBaseUrl` (đã điền sẵn host n8n của POP-AI; sửa nếu dùng host khác), rồi đẩy code lên GitHub Pages.
7. **Thu hồi API key cũ** `sk-4150…` đã nằm trong `ai-config.js` công khai (xem mục Bảo mật).

## Xem log, thống kê, tắt khẩn cấp
```bash
A="https://<n8n-host>/webhook/duck-gw-admin"; K="<adminKey>"
curl -s -X POST $A -H "x-admin-key: $K" -H "Content-Type: application/json" -d '{"action":"stats"}'
curl -s -X POST $A -H "x-admin-key: $K" -H "Content-Type: application/json" -d '{"action":"logs","limit":50}'
curl -s -X POST $A -H "x-admin-key: $K" -H "Content-Type: application/json" -d '{"action":"disable"}'   # tắt toàn bộ
curl -s -X POST $A -H "x-admin-key: $K" -H "Content-Type: application/json" -d '{"action":"enable"}'
```

## Giới hạn cần biết
1. **Ai cũng tạo được phiên ẩn danh**, nên giới hạn theo người dùng (`perUserPerMin/Day`) chỉ chặn được người dùng bình thường; kẻ cố tình tạo nhiều phiên bị chặn bởi giới hạn theo IP và **trần ngày toàn hệ thống** (`dailyRequestCap`, `dailyTokenCap`) cùng công tắc tắt. Hãy đặt trần theo ngân sách.
2. `Origin` chỉ đáng tin với trình duyệt (curl giả được).
3. Dữ liệu (log, bộ đếm) nằm trong bộ nhớ workflow: chỉ ghi ở chế độ production, mất khi import đè workflow.
4. Giữ **Save successful production executions = Do not save** (đã đặt sẵn) vì dữ liệu thực thi chứa nội dung chat.
5. Nội dung chat của học sinh đi qua n8n và nhà cung cấp LLM; n8n **không lưu** nội dung chat (log chỉ ghi độ dài). Cần thông báo cho học sinh/nhà trường.
6. Admin đăng nhập trên `admin.html` dùng chung Firebase Auth: phiên ẩn danh của chatbot được bỏ qua và tự đăng xuất ở trang admin, không ảnh hưởng đăng nhập admin.

## Mã lỗi
`400 bad_request/message_too_long` · `401 invalid_id_token / invalid_token / token_expired` (web tự xin lại) · `403 forbidden` (`origin_not_allowed`, `site_blocked`, `user_disabled`) · `429 user_rate_limit / user_daily_limit / web_daily_cap / too_many_requests` · `502 llm_unavailable` (`llm_http_401` = key sai hoặc thiếu `Bearer `) · `503 gateway_disabled / daily_cap_reached`. Phía web thêm: `anon_auth_disabled`, `auth_failed`, `network_error`.
