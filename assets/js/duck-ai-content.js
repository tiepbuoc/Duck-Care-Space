/**
 * Duck Care AI — nội dung có sẵn (chạy được cả khi chưa kết nối AI)
 * ------------------------------------------------------------------
 * - SCREENING: 8 câu hỏi (cùng bộ với Duck Radar) + gợi ý cho từng câu
 * - LESSONS:   bài học ngắn (mỗi bài vài "thẻ" đọc nhanh)
 * - SCENARIOS: câu hỏi tình huống có phản hồi cho từng lựa chọn
 * Muốn sửa/thêm nội dung chỉ cần chỉnh file này.
 */
window.DUCK_AI_CONTENT = (function () {

  const SCALE_LABELS = ['Hiếm khi', 'Thỉnh thoảng', 'Đôi lúc', 'Thường xuyên', 'Rất thường xuyên'];

  // Ngưỡng giống Duck Radar (radar.html → classify): Xanh ≤18, Vàng 19–29, Đỏ ≥30
  function classify(score) {
    if (score <= 18) return 'xanh';
    if (score <= 29) return 'vang';
    return 'do';
  }

  const LEVELS = {
    xanh: { label: 'Mức Xanh — Bình thường', cls: 'result-badge--xanh' },
    vang: { label: 'Mức Vàng — Áp lực tiềm ẩn', cls: 'result-badge--vang' },
    do:   { label: 'Mức Đỏ — Cần được hỗ trợ', cls: 'result-badge--do' },
  };

  // Mỗi câu hỏi: nội dung, nhóm vấn đề, gợi ý riêng khi điểm cao (≥4)
  const SCREENING = [
    { q: 'Mình cảm thấy phải luôn tỏ ra ổn trước mặt người khác, dù bên trong không như vậy.',
      topic: 'Che giấu cảm xúc', lesson: 'chia-se',
      tip: 'Thử nói thật một điều nhỏ với một người bạn tin tưởng. Bạn không cần kể hết — chỉ cần "dạo này mình hơi mệt" cũng là một bước.' },
    { q: 'Mình lo lắng nếu điểm số hoặc kết quả không như kỳ vọng của bố mẹ, thầy cô.',
      topic: 'Áp lực kỳ vọng', lesson: 'ap-luc',
      tip: 'Hãy tách "kết quả" khỏi "giá trị bản thân". Đặt một mục tiêu vừa sức cho tuần này và cân nhắc nói với bố mẹ/thầy cô về mức bạn đang cố gắng.' },
    { q: 'Mình khó ngủ vì cứ nghĩ mãi về bài vở, deadline hoặc thành tích.',
      topic: 'Giấc ngủ & suy nghĩ lặp', lesson: 'giac-ngu',
      tip: 'Trước khi ngủ 30 phút, viết ra việc cần làm ngày mai rồi gập vở lại; sau đó thử bài thở 4–7–8 ở Hồ tĩnh lặng.' },
    { q: 'Mình so sánh bản thân với bạn bè và cảm thấy mình chưa đủ tốt.',
      topic: 'So sánh bản thân', lesson: 'so-sanh',
      tip: 'Mỗi tối ghi 1 điều bạn làm được hôm nay, dù nhỏ. Hãy so với chính mình của tuần trước thay vì so với bạn khác.' },
    { q: 'Mình ngại chia sẻ khó khăn của mình vì sợ bị đánh giá hoặc làm người khác thất vọng.',
      topic: 'Ngại xin giúp đỡ', lesson: 'chia-se',
      tip: 'Bắt đầu từ kênh dễ nhất: Duck Whispers (ẩn danh) hoặc một câu nhắn ngắn cho người bạn tin. Xin giúp đỡ là kỹ năng, không phải yếu đuối.' },
    { q: 'Mình cảm thấy kiệt sức dù đã cố gắng nghỉ ngơi.',
      topic: 'Kiệt sức', lesson: 'thoi-gian',
      tip: 'Hãy xếp lại lịch: mỗi ngày chừa ít nhất 1 khoảng nghỉ thật sự (không điện thoại). Nếu kiệt sức kéo dài nhiều tuần, hãy nói với thầy cô/phụ huynh hoặc cán bộ tâm lý.' },
    { q: 'Mình nhận thêm việc hoặc hoạt động dù đã quá tải, vì sợ bị coi là kém cỏi.',
      topic: 'Khó từ chối', lesson: 'tu-choi',
      tip: 'Tập một câu từ chối nhẹ nhàng: "Mình rất muốn giúp nhưng lúc này mình đang quá tải, để lần sau nhé".' },
    { q: 'Mình dần mất hứng thú với những điều từng khiến mình vui.',
      topic: 'Mất hứng thú', lesson: 'ap-luc',
      tip: 'Đây là tín hiệu cần để ý. Hãy chọn một việc nhỏ từng thích và làm 10 phút, đồng thời cân nhắc nói chuyện với người lớn bạn tin tưởng nếu cảm giác này kéo dài trên 2 tuần.' },
  ];

  // ---------------- Bài học ngắn ----------------
  const LESSONS = [
    { id: 'ap-luc', icon: '🌊', title: 'Áp lực là gì? Hiểu để không sợ', minutes: 2,
      cards: [
        'Áp lực là phản ứng tự nhiên của cơ thể khi gặp đòi hỏi (thi cử, kỳ vọng, deadline). **Một chút áp lực giúp bạn tập trung** — vấn đề chỉ xuất hiện khi nó kéo dài mà không có thời gian hồi phục.',
        'Dấu hiệu thường gặp:\n- **Cơ thể:** đau đầu, mỏi vai, khó ngủ, tim đập nhanh\n- **Cảm xúc:** dễ cáu, lo âu, trống rỗng\n- **Hành vi:** trì hoãn, né tránh, ăn/ngủ thất thường',
        'Cách gọi tên cảm xúc giúp bình tĩnh hơn: thay vì "mình tệ quá", hãy nói **"mình đang thấy lo vì bài kiểm tra ngày mai"**. Khi gọi được tên, não bớt hoảng.',
      ],
      remember: 'Áp lực không phải lỗi của bạn. Nhận ra sớm là cách tốt nhất để xử lý nó.',
      challenge: 'Ngay bây giờ, viết 1 câu: "Mình đang cảm thấy ___ vì ___".' },

    { id: 'tho', icon: '🌬️', title: 'Thở để dịu lại trong 2 phút', minutes: 2,
      cards: [
        'Khi căng thẳng, nhịp thở nhanh và nông khiến cơ thể càng báo động. **Thở chậm, dài ra hơi thở ra** gửi tín hiệu "an toàn" cho hệ thần kinh.',
        'Bài **4–7–8**: hít vào bằng mũi đếm 4 → nín thở đếm 7 → thở ra từ từ bằng miệng đếm 8. Lặp 4 vòng. Nếu chóng mặt, hãy rút ngắn số đếm.',
        'Dùng được ở đâu? Trước giờ kiểm tra, khi bị gọi lên bảng, hoặc lúc nằm chưa ngủ được. Bạn có thể tập cùng đồng hồ thở ở **Hồ tĩnh lặng**.',
      ],
      remember: 'Thở ra dài hơn hít vào là "công tắc" làm dịu cơ thể.',
      challenge: 'Thử 4 vòng thở 4–7–8 ngay bây giờ rồi tự chấm cảm giác căng thẳng từ 0–10 trước và sau.' },

    { id: 'thoi-gian', icon: '🗓️', title: 'Quản lý thời gian ôn thi không kiệt sức', minutes: 3,
      cards: [
        'Học dồn nhiều giờ liên tục thường kém hiệu quả. Hãy thử **25 phút tập trung – 5 phút nghỉ** (Pomodoro), sau 4 vòng nghỉ dài 15–20 phút.',
        'Mỗi tối chọn **tối đa 3 việc quan trọng** cho ngày mai: 1 việc khó, 2 việc vừa. Hoàn thành cả 3 là một ngày tốt rồi.',
        'Chừa "khoảng đệm" trong lịch: mỗi ngày ít nhất 1 giờ cho thứ bạn thích (thể thao, nhạc, gặp bạn). Nghỉ ngơi **là một phần** của việc học, không phải phần thừa.',
      ],
      remember: 'Lịch học tốt là lịch bạn thực hiện được, không phải lịch đẹp nhất.',
      challenge: 'Viết ra 3 việc quan trọng nhất của ngày mai ngay bây giờ.' },

    { id: 'giac-ngu', icon: '🌙', title: 'Ngủ ngon khi đầu đầy suy nghĩ', minutes: 2,
      cards: [
        'Ngủ đủ giúp trí nhớ và tâm trạng ổn định. Học sinh thường cần khoảng **8–10 tiếng/đêm**; thức khuya để học dồn thường phản tác dụng.',
        'Thói quen giúp dễ ngủ: tắt màn hình trước giờ ngủ 30 phút, giữ giờ đi ngủ gần như cố định, phòng tối và mát.',
        'Khi đầu cứ quay vòng: **"xả suy nghĩ"** — viết hết lo lắng ra giấy, kèm 1 việc nhỏ sẽ làm ngày mai. Sau đó thở 4–7–8. Bạn có thể dùng mục "Xả bọc suy nghĩ" ở Hồ tĩnh lặng.',
      ],
      remember: 'Suy nghĩ viết ra giấy sẽ nhẹ hơn suy nghĩ giữ trong đầu.',
      challenge: 'Tối nay đặt điện thoại xa giường 30 phút trước khi ngủ và xem mình thấy thế nào.' },

    { id: 'so-sanh', icon: '🪞', title: 'Khi bạn hay so sánh mình với người khác', minutes: 2,
      cards: [
        'Mạng xã hội chỉ cho thấy **"khoảnh khắc đẹp nhất"** của người khác, còn bạn thì thấy **"hậu trường"** của chính mình. So sánh như vậy luôn thiệt thòi.',
        'Thử đổi câu hỏi: từ "Sao mình không bằng bạn ấy?" sang **"Mình học được gì từ bạn ấy, và bước nhỏ tiếp theo của mình là gì?"**',
        'Ghi lại tiến bộ của chính bạn: hôm nay làm được gì hơn tuần trước? Nhật ký 14 ngày của Duck Care có thể giúp bạn làm việc này.',
      ],
      remember: 'Mỗi người có một nhịp riêng. Điều quan trọng là bạn đang tiến bộ theo nhịp của mình.',
      challenge: 'Viết 3 điểm mạnh của bạn mà không ai cần phải công nhận.' },

    { id: 'chia-se', icon: '💬', title: 'Cách mở lời khi cần giúp đỡ', minutes: 3,
      cards: [
        'Nhiều bạn không nói vì sợ làm người khác lo hoặc sợ bị đánh giá. Nhưng giữ một mình thường khiến áp lực **nặng hơn**. Nói ra không có nghĩa bạn yếu.',
        'Công thức 3 bước: **(1) Sự việc** → **(2) Cảm xúc** → **(3) Điều bạn cần**.\nVí dụ: "Dạo này con học nhiều mà vẫn thấy không theo kịp, con khá mệt. Con cần được nghe và có thể điều chỉnh lịch học."',
        'Chọn người và thời điểm: một người bạn tin tưởng, lúc cả hai đều yên tĩnh. Nếu khó nói trực tiếp, hãy **nhắn tin hoặc viết thư**. Chưa sẵn sàng? Bắt đầu bằng Duck Whispers ẩn danh.',
      ],
      remember: 'Bạn không cần diễn đạt hoàn hảo, chỉ cần bắt đầu.',
      challenge: 'Soạn sẵn 1 câu theo công thức 3 bước (không cần gửi ngay).' },

    { id: 'tu-choi', icon: '🙅', title: 'Học cách nói "không" nhẹ nhàng', minutes: 2,
      cards: [
        'Nhận quá nhiều việc vì sợ bị coi là kém cỏi sẽ dẫn đến kiệt sức và làm việc nào cũng kém đi. **Từ chối khéo là bảo vệ chất lượng**, không phải ích kỷ.',
        'Công thức: **Cảm ơn + lý do ngắn + đề xuất khác**.\n"Cảm ơn bạn đã nghĩ đến mình. Tuần này mình đang kín lịch ôn thi nên chưa nhận được. Tuần sau mình giúp được không?"',
        'Trước khi nhận việc mới, tự hỏi: "Nếu nhận, mình sẽ bỏ bớt việc gì?" Nếu không có câu trả lời, có lẽ đã đến lúc nói "chưa được".',
      ],
      remember: 'Mỗi lần nói "không" với điều không cần thiết là một lần nói "có" với sức khoẻ của bạn.',
      challenge: 'Chọn một việc đang làm quá sức và nghĩ cách bớt đi 1 phần.' },
  ];

  // ---------------- Câu hỏi tình huống ----------------
  // options[i]: { t: nội dung, ok: 'tốt' | 'tạm' | 'chưa', fb: phản hồi }
  const SCENARIOS = [
    { id: 's1', lesson: 'ap-luc', title: 'Điểm kiểm tra thấp',
      situation: 'Bạn vừa nhận bài kiểm tra Toán với điểm thấp hơn mong đợi. Bố mẹ chắc chắn sẽ hỏi. Bạn đang thấy rất nặng lòng.',
      options: [
        { t: 'Giấu bài đi và nói là chưa có điểm', ok: 'chưa', fb: 'Giấu sẽ giúp bạn nhẹ nhõm ngắn hạn nhưng lo lắng sẽ lớn dần, và khi bị phát hiện thì khó nói hơn.' },
        { t: 'Hít thở, tìm hiểu mình sai ở đâu rồi chủ động nói với bố mẹ kèm kế hoạch cải thiện', ok: 'tốt', fb: 'Đây là hướng tốt: bạn tự điều hoà cảm xúc trước, biến điểm số thành thông tin để cải thiện và chủ động chia sẻ.' },
        { t: 'Tự trách bản thân và thức khuya học bù để "chuộc lỗi"', ok: 'chưa', fb: 'Tự trách và thiếu ngủ làm trí nhớ kém đi, dễ lặp lại vòng luẩn quẩn. Một bài kiểm tra không quyết định giá trị của bạn.' },
      ] },
    { id: 's2', lesson: 'so-sanh', title: 'Bạn thân được học bổng',
      situation: 'Bạn thân của bạn vừa được chọn vào đội tuyển. Mọi người chúc mừng rất nhiều, còn bạn bỗng thấy mình chẳng giỏi gì cả.',
      options: [
        { t: 'Chúc mừng bạn, rồi viết ra điều mình đã tiến bộ gần đây và mục tiêu nhỏ tiếp theo', ok: 'tốt', fb: 'Cảm giác chạnh lòng là bình thường. Bạn vừa ghi nhận cảm xúc vừa đưa sự chú ý về hành trình của riêng mình.' },
        { t: 'Tránh mặt bạn một thời gian', ok: 'chưa', fb: 'Tránh mặt có thể làm bạn mất đi một mối quan hệ tốt và thêm cô đơn. Cảm xúc ghen tị không xấu, chỉ cần không để nó điều khiển hành động.' },
        { t: 'Tự nhủ "mình kém quá" và bỏ luôn việc đang cố gắng', ok: 'chưa', fb: 'Kết luận "mình kém" từ một lần so sánh là suy nghĩ chưa công bằng. Hãy nhìn vào quá trình của bạn thay vì chỉ kết quả của người khác.' },
      ] },
    { id: 's3', lesson: 'giac-ngu', title: '11 giờ đêm vẫn chưa ngủ được',
      situation: 'Đã 11 giờ đêm, mai có bài kiểm tra nhưng bạn nằm mãi vẫn không ngủ được vì cứ nghĩ đến bài vở.',
      options: [
        { t: 'Lấy điện thoại lướt cho đến khi buồn ngủ', ok: 'chưa', fb: 'Ánh sáng màn hình và nội dung kích thích khiến não càng tỉnh. Cách này thường làm bạn ngủ muộn hơn.' },
        { t: 'Ghi nhanh các điều đang lo ra giấy, thở 4–7–8 vài vòng rồi nhắm mắt', ok: 'tốt', fb: 'Viết ra giúp "gửi" suy nghĩ lên giấy, thở chậm giúp cơ thể dịu lại. Một đêm ngủ đủ giúp bạn làm bài tốt hơn học thêm 1 tiếng.' },
        { t: 'Bật đèn dậy học thêm cho đến khi mệt thì thôi', ok: 'tạm', fb: 'Có thể bớt lo ngắn hạn, nhưng thiếu ngủ sẽ ảnh hưởng đến trí nhớ và sự tập trung ngày mai.' },
      ] },
    { id: 's4', lesson: 'tu-choi', title: 'Lời nhờ vả khi đang quá tải',
      situation: 'Bạn đang kín lịch ôn thi nhưng lớp trưởng nhờ bạn làm thêm bài thuyết trình nhóm vì "bạn làm giỏi nhất".',
      options: [
        { t: 'Nhận luôn vì sợ làm mọi người thất vọng', ok: 'chưa', fb: 'Nhận vì sợ thường dẫn đến kiệt sức và chất lượng giảm. Ai cũng có giới hạn.' },
        { t: 'Cảm ơn, nói rõ tuần này mình đang quá tải và đề nghị chia phần việc hoặc làm một phần nhỏ', ok: 'tốt', fb: 'Bạn vừa giữ quan hệ vừa bảo vệ sức mình. Đề xuất thay thế cho thấy bạn vẫn có trách nhiệm.' },
        { t: 'Im lặng, không trả lời', ok: 'chưa', fb: 'Im lặng dễ gây hiểu nhầm. Một câu trả lời ngắn lịch sự luôn tốt hơn.' },
      ] },
    { id: 's5', lesson: 'chia-se', title: 'Muốn nói nhưng ngại',
      situation: 'Dạo này bạn cảm thấy rất mệt và buồn, nhưng sợ nói ra sẽ làm bố mẹ thất vọng hoặc lo lắng.',
      options: [
        { t: 'Tiếp tục giữ trong lòng, chắc rồi cũng qua', ok: 'chưa', fb: 'Giữ kéo dài thường làm cảm giác nặng thêm. Bạn xứng đáng được lắng nghe.' },
        { t: 'Nhắn cho một người mình tin (bạn thân, thầy cô chủ nhiệm, cán bộ tâm lý) hoặc viết trước ra giấy', ok: 'tốt', fb: 'Bạn không cần nói với tất cả mọi người, chỉ cần một người đáng tin là đủ để nhẹ bớt.' },
        { t: 'Đăng trạng thái buồn lên mạng xã hội cho ai thấy cũng được', ok: 'tạm', fb: 'Có thể giải toả chút ít, nhưng bình luận từ người lạ không phải lúc nào cũng an toàn. Chọn người tin cậy sẽ hiệu quả hơn.' },
      ] },
    { id: 's6', lesson: 'thoi-gian', title: 'Lịch học kín mít',
      situation: 'Bạn đăng ký học thêm 4 môn, thêm câu lạc bộ, và cảm thấy ngày nào cũng mệt rã rời, nhưng vẫn sợ bỏ bớt sẽ "tụt lại".',
      options: [
        { t: 'Giữ nguyên, cố thêm vài tuần nữa', ok: 'chưa', fb: 'Kiệt sức kéo dài làm hiệu quả giảm đi. Cố gắng không bằng cân bằng.' },
        { t: 'Liệt kê mọi hoạt động, xếp thứ tự quan trọng, bỏ hoặc giảm 1–2 mục và xin ý kiến người lớn', ok: 'tốt', fb: 'Ưu tiên rõ ràng giúp bạn giữ thời gian nghỉ. Có người lớn cùng xem lại lịch sẽ dễ quyết định hơn.' },
        { t: 'Nghỉ hẳn tất cả mọi thứ trong một tuần', ok: 'tạm', fb: 'Nghỉ ngơi cần thiết, nhưng điều chỉnh từ từ và có kế hoạch sẽ bền vững hơn.' },
      ] },
    { id: 's7', lesson: 'ap-luc', title: 'Hồi hộp trước khi lên bảng',
      situation: 'Cô gọi bạn lên bảng. Tim đập nhanh, tay run, đầu óc trống rỗng.',
      options: [
        { t: 'Hít vào chậm, thở ra dài vài nhịp, rồi nói một câu đầu thật chậm', ok: 'tốt', fb: 'Thở ra dài làm dịu cơ thể, câu đầu chậm giúp bạn lấy lại nhịp. Hồi hộp là bình thường.' },
        { t: 'Nói thật nhanh cho xong', ok: 'tạm', fb: 'Nói nhanh dễ khiến mình hụt hơi và quên ý. Chậm lại một nhịp thường hiệu quả hơn.' },
        { t: 'Xin cô cho ngồi xuống vì "em không biết gì cả"', ok: 'chưa', fb: 'Né tránh sẽ làm nỗi sợ lần sau lớn hơn. Hãy thử nói ra ý bạn nhớ được, dù chưa hoàn chỉnh.' },
      ] },
    { id: 's8', lesson: 'chia-se', title: 'Bạn đang không ổn',
      situation: 'Một người bạn nhắn với bạn: "Dạo này tớ chán lắm, chẳng muốn làm gì nữa."',
      options: [
        { t: 'Nói "Ai cũng thế mà, cố lên" rồi đổi chủ đề', ok: 'chưa', fb: 'Câu này vô tình làm bạn thấy mình không được lắng nghe. Hãy dừng lại và hỏi han.' },
        { t: 'Hỏi thăm nhẹ nhàng, lắng nghe không phán xét và khuyến khích bạn nói với người lớn/cán bộ tâm lý', ok: 'tốt', fb: 'Lắng nghe và kết nối bạn với sự hỗ trợ phù hợp là điều quý nhất. Nếu bạn nhắc đến việc làm đau bản thân, hãy báo ngay cho người lớn tin cậy.' },
        { t: 'Hứa giữ bí mật mọi chuyện dù bạn nói điều nguy hiểm', ok: 'chưa', fb: 'Nếu bạn có dấu hiệu nguy hiểm đến tính mạng, an toàn của bạn quan trọng hơn lời hứa bí mật. Hãy báo cho thầy cô/phụ huynh.' },
      ] },
  ];

  // Thông tin hỗ trợ khẩn cấp (Việt Nam)
  const CRISIS_HTML =
    '<strong>Mình rất quan tâm đến sự an toàn của bạn.</strong> Nếu bạn đang nghĩ đến việc làm hại bản thân, xin hãy nói ngay với một người lớn bạn tin (bố mẹ, thầy cô, cán bộ tâm lý) hoặc người thân đang ở gần.' +
    '<ul><li><strong>111</strong> — Tổng đài quốc gia bảo vệ trẻ em (miễn phí, 24/7)</li>' +
    '<li><strong>115</strong> hoặc <strong>112</strong> — khi cần cấp cứu ngay</li></ul>' +
    'Bạn không phải đối mặt với điều này một mình. 💛';

  return { SCALE_LABELS, classify, LEVELS, SCREENING, LESSONS, SCENARIOS, CRISIS_HTML };
})();
