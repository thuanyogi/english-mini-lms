# Thiết kế sản phẩm và trải nghiệm học

Liên quan: [Plan](plan.md), [cơ sở và quyết định](evidence-and-decisions.md), [hợp đồng dữ liệu](data-and-tools-contract.md).

## Kết quả sản phẩm

Anh Minh có một nơi học tiếng Anh cá nhân, có AI hiểu mục tiêu và nhớ bằng chứng học trước đó. Theo D1 được người đặt dự án xác nhận ngày 19/09/2026, Zalo là nơi trò chuyện với trợ lý; web là nơi học với tài liệu, làm bài, nhận góp ý, sửa lại và xem tiến độ. Hai kênh dùng chung hồ sơ và trạng thái phiên. Mỗi phiên được thiết kế cho 30 hoặc 45 phút; có lưu dở và tiếp tục.

Hệ thống phải hỗ trợ đồng thời tiếng Anh thực tế, sách y khoa và IELTS. Lộ trình được điều chỉnh từ bài làm, thời gian còn lại và nhu cầu công việc; không lấy số ngày đăng nhập làm bằng chứng tăng trình độ.

## Mục tiêu đến tính năng và nghiệm thu

| Mục tiêu | Tính năng phải có | Bằng chứng nghiệm thu sản phẩm |
|---|---|---|
| Giao tiếp đời sống | Hội thoại theo tình huống, phản hồi ngắn, thử lại | Voice đầu và voice sửa, nhận xét gắn với câu nói cụ thể |
| Công việc/hội nghị | Tự giới thiệu, trình bày ý tưởng, hỏi đáp, viết email | Minh hoàn thành một tình huống do anh chọn, có lưu các lần sửa |
| Listening | Phát audio, trả lời trước khi mở transcript, nghe lại đoạn khó | Câu trả lời, số lần nghe, thời điểm mở transcript và nguồn audio được lưu |
| Speaking | Ghi âm/gửi voice, transcript kiểm tra được, phản hồi về ngôn ngữ và audio khi đủ bằng chứng | Không đưa nhận xét phát âm khi chỉ có text; voice lỗi có đường ghi lại |
| Reading và dịch sách y | Đọc đoạn được chọn, giải thích ý, dịch, đối chiếu và dùng lại cụm từ | Gắn trang/đoạn nguồn, bản dịch của Minh và góp ý có trích vị trí |
| Writing | Viết theo bối cảnh hoặc dạng IELTS, nhận góp ý, sửa bản tiếp theo | Nháp, bài nộp, phản hồi và bản sửa không ghi đè nhau |
| IELTS 7.5–8.0 | Kho bài có nguồn, luyện từng kỹ năng có giờ, rubric phiên bản hóa, đánh giá con người khi cần | Phân biệt bài luyện, ước lượng tham khảo, mock và điểm thi chính thức |
| 30–45 phút/ngày | Chọn thời lượng, chia hoạt động vừa sức, lưu dở | Bộ đếm hoạt động, pause/resume và nhắc kết thúc; không ép nộp bài dang dở |
| Không học vẹt | Ôn lỗi trong bối cảnh mới, nói/viết lại bằng lời của mình | Có bài vận dụng mới, không chỉ lặp nguyên câu mẫu |

## Các module phải bàn giao

1. **Hồ sơ và lộ trình cá nhân:** mục tiêu, ưu tiên, trình độ ban đầu theo bằng chứng, thời gian, chủ đề công việc và gợi ý bước kế tiếp.
2. **Thư viện và nguồn học tuyển chọn:** nguồn hợp lệ, đoạn/trang/chủ đề, audio/verified transcript, bài IELTS, trạng thái duyệt; tìm theo kỹ năng/chủ đề/độ khó thử nghiệm. Phân định rõ tài liệu nhúng/link từ bên thứ ba (YouTube, British Council...) với dữ liệu lưu nội bộ.
3. **Không gian học:** đọc, nghe, viết, ghi âm, nộp và sửa bài; hỗ trợ chế độ Shadowing (video/audio theo mốc thời gian kèm transcript chuẩn); giữ trạng thái khi chuyển Zalo–web.
4. **Trợ lý AI:** ra nhiệm vụ, giải thích, gợi ý từng mức, phản hồi có bằng chứng, điều phối thử thách ôn từ (micro-challenge roleplay) và đề xuất bài tiếp theo.
5. **Sổ từ vựng và cụm từ theo ngữ cảnh (Context-rich Vocabulary Vault):** lưu trữ từ/cụm từ theo cấu trúc tuple (từ + phiên âm IPA + nghĩa theo ngữ cảnh + câu/đoạn trích gốc + nguồn/mốc thời gian + câu tự vận dụng + lịch sử Spaced Repetition). Hỗ trợ "1-Click Smart Capture" trên web và "Micro-challenge Roleplay" trên Zalo.
6. **Hồ sơ học tập:** lịch sử bài làm, thời gian, lỗi lặp, cụm từ đã dùng, so sánh bản đầu/bản sửa.
7. **Quản trị gọn:** duyệt tài liệu/bài, kiểm tra job lỗi, sửa nhận xét sai, theo dõi chi phí và hỗ trợ người học theo quyền được cấp.

## Năm chế độ học

| Chế độ | Đầu vào | Minh thực hiện | AI thực hiện | Đầu ra |
|---|---|---|---|---|
| Hội thoại và speaking | Tình huống đời sống, công việc, hội nghị | Nói 1–3 phút/lượt, trả lời câu hỏi, nói lại | Đóng vai, hỏi tiếp, chọn tối đa 3 điểm ưu tiên để sửa | Audio, transcript có xác nhận, phản hồi, lần nói lại |
| Listening | Audio đã duyệt + câu hỏi/đáp án | Nghe, trả lời, nghe lại rồi đối chiếu | Chỉ ra đoạn gây nhầm, giải thích cách nghe | Đáp án, lịch sử nghe, lỗi và bài vận dụng |
| Đọc–dịch y khoa | Đoạn/trang sách đã duyệt | Nêu ý chính, dịch, tự giải thích thuật ngữ | Đối chiếu ý và cách diễn đạt, chỉ vị trí bỏ sót | Bản dịch, góp ý theo nguồn, 3–5 cụm sử dụng trong câu mới |
| Writing thực tế | Email, tóm tắt tài liệu, nội dung hội nghị | Viết trước, sửa sau nhận xét | Góp ý độ rõ, cấu trúc, ngữ pháp, dùng từ | Các phiên bản và lý do sửa |
| IELTS | Biến thể thi đã xác nhận, bài/rubric đã duyệt | Làm bài theo thời lượng phù hợp rồi nộp | Chấm câu đóng theo đáp án, góp ý bài mở theo rubric | Kết quả luyện có giới hạn rõ, đề xuất luyện điểm yếu |

“IELTS” là ngữ cảnh luyện chuyên biệt sử dụng cả bốn kỹ năng; không thay thế bài nghe/đọc đúng dạng bằng tài liệu y khoa. Không tự tạo nhãn “đề thi chính thức” cho bài do AI soạn.

## Một phiên học mẫu 30–45 phút

- 2–3 phút: Minh chọn việc muốn làm và thời lượng, hoặc tiếp tục bài dở.
- 15–22 phút: nghe/đọc và tự nói, viết hoặc dịch; có thể xin gợi ý.
- 8–12 phút: xem góp ý, hỏi lại lý do, sửa một số lỗi ưu tiên.
- 5–8 phút: làm một lượt vận dụng và lưu bước tiếp theo.

Đây là mẫu phân bổ để thiết kế giao diện, không phải thời khóa biểu bắt buộc. Ở phút 30/45, hệ thống đề nghị lưu/khép phiên; tự động pause phần luyện chủ động, không xóa nháp. Nếu Minh chủ động học thêm, mở phiên mới và ghi thời gian thực; không che phần vượt giờ. Với bài thi có timer, hết giờ chốt bản tại thời điểm đó; phần sửa sau được tách khỏi điểm timed.

Ví dụ: Minh nhắn “Tôi có 30 phút, luyện giới thiệu ở hội nghị”. Agent lấy mục tiêu và lỗi ưu tiên từ LMS, đưa tình huống, nhận voice, xác nhận bài đã lưu, trả tối đa 3 góp ý, mời nói lại. Web hiển thị hai bản ghi cùng nhận xét và bài ôn tiếp theo.

## Onboarding và điều chỉnh lộ trình

Onboarding thu mục tiêu ưu tiên, tự đánh giá, bối cảnh công việc, lựa chọn IELTS, sách đang dùng và thời gian. Không yêu cầu đầy đủ mới cho học buổi đầu; phần chưa biết để trống.

Trong tuần đầu của pilot, chia đánh giá đầu vào thành 3–4 phiên trong khung 30–45 phút: nghe và trả lời; nói tình huống; đọc–dịch một đoạn; viết đoạn/email hoặc bài IELTS phù hợp. Có thể ghép khi đủ thời gian. Lưu điều kiện làm bài và mức hỗ trợ. Kết quả là hồ sơ điểm mạnh/yếu kèm bài làm, chưa phải chứng nhận CEFR/band.

Thuật toán gợi ý đầu tiên dùng quy tắc giải thích được:

1. Đề nghị hoàn thành bài đang dở hoặc bài cần sửa nếu Minh muốn.
2. Chọn lỗi đến lượt ôn; đưa vào tình huống mới.
3. Bù kỹ năng ít được luyện trong 7 ngày gần nhất, đồng thời giữ nội dung thực tế/y khoa/IELTS theo ưu tiên đã chọn.
4. Khớp thời lượng, nguồn và độ khó quan sát được; hiển thị lý do gợi ý và cho đổi bài.
5. Chỉ đề xuất tăng độ khó sau ít nhất hai bài độc lập tương đương làm tốt; ngưỡng ban đầu là quy tắc thử nghiệm, hiệu chỉnh sau pilot.

Khoảng ôn đề xuất 1, 3, 7 và 14 ngày; dễ lại thì giãn, mắc lại thì ôn sớm. Đây là cấu hình sản phẩm để thử, không phải tuyên bố hiệu quả đã chứng minh. Không gắn cứng quota theo thứ trong tuần.

## Nguyên tắc AI và người học

- AI được giải thích kiến thức, ra bài, cung cấp gợi ý hoặc ví dụ khác trước khi có bài làm.
- Phản hồi đánh giá cá nhân phải tham chiếu bài đã lưu. Không tự tạo bài mang tên Minh.
- Nếu xem đáp án của chính bài đang làm trước khi nộp, đánh dấu `assisted`; vẫn học tiếp nhưng không tính là bài độc lập.
- Mỗi góp ý gồm vị trí/câu gốc, vấn đề, cách cải thiện, ví dụ ngắn và một yêu cầu thử lại. Minh có thể phản đối nhận xét; bản cũ được giữ và gắn trạng thái xem xét.
- Text transcript hỗ trợ xem từ/ngữ pháp; đánh giá phát âm cần audio và năng lực phân tích audio đã kiểm chứng. Nhận dạng không chắc thì đề nghị xác nhận, không biến lỗi STT thành lỗi của người học.
- Với sách y, đánh giá ngôn ngữ và mức trung thành với đoạn nguồn; không suy diễn thành khuyến nghị điều trị, không đưa ca bệnh thật vào bài tập.
- Phản hồi AI là tham khảo. Chỉ ghi điểm IELTS chính thức từ kết quả thi đã xác minh; tự khai và ước lượng được ghi riêng, không suy ra từ điểm nội bộ.

## Sổ từ vựng và kết nối nguồn học bên thứ ba

### 1. Cơ chế Sổ từ vựng theo ngữ cảnh (Vocabulary Vault)

Không lưu danh sách từ đơn (word-to-meaning) rời rạc. Mỗi mục từ vựng là một bộ liên kết (tuple):
- **Cụm từ / từ:** ví dụ `degenerative disc disease`, `could you clarify...?`.
- **Phiên âm IPA & nghĩa trong ngữ cảnh:** nghĩa chuyên biệt cho ca lâm sàng hoặc hội nghị, không liệt kê nghĩa từ điển chung chung.
- **Ngữ cảnh gốc:** câu hoặc đoạn trích đầy đủ nơi anh Minh gặp từ đó.
- **Nguồn trích:** link video + mốc thời gian (start/end seconds), hoặc tên sách + số trang.
- **Câu anh Minh tự dùng:** câu do anh tự viết hoặc nói trong bài làm/lần sửa.
- **Lịch sử Spaced Repetition:** số lần ôn, ngày đến hạn ôn kế tiếp (`due_at`), mức độ thành thạo (`mastery_level`).

**Cơ chế lưu 1 chạm (1-Click Smart Capture trên Web):**
Khi đọc bài hoặc sách y khoa trên Web LMS:
1. Anh Minh bôi đen cụm từ.
2. Popup thông minh hiện ra: AI tự bắt câu ngữ cảnh gốc, tự tra phiên âm IPA, nghĩa chuyên ngành cơ xương khớp và 1 câu ví dụ mẫu.
3. Anh Minh bấm **"Lưu vào sổ"** (1 click) — dữ liệu được đóng gói chuẩn đưa vào database LMS mà không tốn công gõ chép.

**Cơ chế ôn tập Micro-challenge qua Zalo:**
Không kiểm tra trắc nghiệm từ vựng. Trợ lý OpenClaw lấy các từ đến hạn ôn từ LMS và tạo thử thách nhập vai ngắn:
- Agent gửi voice/text: *"Chào anh Minh, hôm nay anh thử đóng vai giải thích cho bệnh nhân về tình trạng đau lan, nhớ dùng cụm 'radicular symptoms' nhé. Anh bấm voice 2 câu ngắn gửi em nhé!"*
- Anh Minh bấm mic Zalo nói 20–30 giây.
- AI nghe, nhận xét cách dùng từ trong ngữ cảnh thực tế và cập nhật lịch sử ôn vào LMS.

### 2. Cơ chế kết nối với nguồn học bên ngoài (YouTube, YouGlish, British Council...)

Phân biệt rõ hai tầng kết nối:
1. **OpenClaw ↔ LMS:** Tích hợp API/tool trực tiếp để trao đổi hồ sơ, bài học, sổ từ vựng và kết quả ôn.
2. **LMS ↔ Nguồn bên ngoài:** Kết nối nội dung thông qua **Link dẫn đường** và **Nhúng iframe**, không xây API phức tạp với từng website bên thứ ba.

**Giới hạn kỹ thuật và giải pháp cho Shadowing / YouTube:**
- *Giới hạn:* YouTube Iframe API chỉ hỗ trợ điều khiển phát/dừng/seek/tốc độ; API `captions.download` của YouTube không cho phép ứng dụng bên thứ ba tải phụ đề tùy ý nếu không sở hữu video. Do đó không giả định AI có thể tự động đọc transcript của bất kỳ link YouTube nào.
- *Giải pháp MVP (Bộ 24 hoạt động tuyển chọn):*
  - Curator chuẩn bị sẵn đoạn video/audio ngắn (30–60 giây), xác định mốc `start_seconds` và `end_seconds`.
  - Transcript chuẩn đã kiểm duyệt được lưu cứng trong LMS kèm mốc thời gian từng câu.
  - Trên web LMS: cột trái nhúng video YouTube phát đúng đoạn; cột phải hiển thị transcript chuẩn và mic ghi âm Shadowing. AI chấm phát âm và ngữ điệu bám theo transcript đã được xác minh.
- *Giai đoạn mở rộng (Anh Minh tự gửi link ngoài):*
  - OpenClaw chuyển link qua pipeline bóc tách STT/Whisper có kiểm duyệt hoặc ưu tiên video có sẵn phụ đề chuẩn (CC).

## Giao diện MVP

Bộ nội dung khởi đầu đề xuất 24 hoạt động đã duyệt: 4 hội thoại/speaking, 4 listening, 4 đọc–dịch y, 4 writing thực tế và 8 IELTS (2 cho mỗi kỹ năng, theo biến thể thi Minh chọn). Dùng một phần cho baseline và bài cuối kỳ tương đương nhưng khác nội dung; các bài còn lại để luyện/sửa. Đây là phạm vi biên tập khởi đầu để ước lượng, không phải cam kết lấy đủ từ hai PDF hiện có. Mỗi hoạt động phải có mục tiêu, nguồn/locator, thời lượng, đầu ra, hướng dẫn phản hồi và đáp án/rubric nếu cần. Thiếu nguồn thì đánh dấu chưa sẵn sàng; không tự thay bằng nội dung gắn nhãn chính thức.

| Màn hình | Thao tác chính | Trạng thái phải thiết kế |
|---|---|---|
| Hôm nay | Chọn 30/45 phút, tiếp tục bài, đổi gợi ý, xem từ vựng đến hạn ôn | Chưa đánh giá đầu vào, chưa có nguồn, chưa có bài phù hợp |
| Lộ trình | Xem mục tiêu và ưu tiên; sửa lựa chọn | Chưa biết trình độ/deadline, gợi ý có giải thích |
| Thư viện | Chọn nguồn/đoạn/audio, mở bài liên quan, lọc bài Shadowing | Đang kiểm duyệt, lỗi OCR, chưa có quyền sử dụng |
| Học | Đọc, nghe, nhập nháp, ghi âm, xin gợi ý, nộp; **bôi đen để 1-Click Smart Capture** từ vựng; giao diện Shadowing (video + transcript + mic) | Micro bị từ chối, rớt mạng, timer hết giờ, upload lỗi, video không cho nhúng (fallback mở tab gốc) |
| Sổ từ vựng | Xem danh sách từ theo ngữ cảnh, lọc theo chủ đề/mức thành thạo, nghe phát âm, xem câu ví dụ và lịch sử ôn | Chưa lưu từ nào, từ đến hạn ôn, từ đã thành thạo |
| Bài của tôi | Xem bản đầu–góp ý–bản sửa | Chờ chấm, chấm lỗi, yêu cầu xem lại |
| Tiến độ | Kỹ năng đã luyện, lỗi đang ôn, từ vựng đã nhớ, bài so sánh | Ít dữ liệu; không vẽ xu hướng năng lực từ một bài |
| Cài đặt | Dữ liệu, nhắc học, mục tiêu, đăng xuất | Tắt nhắc ngay, xuất/xóa dữ liệu có xác nhận |

Quản trị hỗ trợ có màn riêng để nhập/duyệt nguồn và bài, xem job lỗi, phản hồi bị gắn cờ và mức sử dụng. Bảng trên chỉ liệt kê bảy màn học viên; quản trị là màn thứ tám, quyền riêng.

Ưu tiên điện thoại; chữ rõ, thao tác chạm đủ lớn, ghi âm có nút nghe lại/xóa trước khi nộp, trạng thái lưu hiển thị rõ. Mở từ trình duyệt Zalo không được thì có hướng dẫn mở trình duyệt hệ thống. Không lưu voice/bài riêng tư trong cache dùng chung. PWA chỉ cài nhanh và cache giao diện; offline hoàn chỉnh không thuộc MVP.

## Nghiệm thu học tập và sản phẩm

Pilot 4 tuần bắt đầu khi bản chạy thật qua kiểm tra kỹ thuật. Minh chọn lịch phù hợp; tuần 1 làm baseline, tuần 2–3 dùng các mode, tuần 4 làm lại nhiệm vụ tương đương và đánh giá trải nghiệm. Mục tiêu pilot đề xuất: ít nhất 12 phiên, có bằng chứng ở đủ bốn kỹ năng, ít nhất hai lượt đọc–dịch và hai lượt IELTS, có nhiệm vụ công việc/hội nghị và ít nhất bốn bài được sửa lại.

Đủ số phiên chỉ cho thấy sản phẩm được dùng. Báo cáo tiến bộ phải so bài tương đương, cùng điều kiện/mức hỗ trợ, và chỉ nhận định phần có bằng chứng. Nếu chưa thấy cải thiện hoặc Minh không thấy hữu ích, điều chỉnh nội dung/feedback trước khi tăng tính năng.

## Còn mở

Baseline thực tế; sách/chủ đề ưu tiên; biến thể IELTS; deadline; người có chuyên môn hỗ trợ đối chiếu chất lượng feedback khi cần. Vai trò Zalo/web đã chốt theo D1. Chi tiết người phụ trách và thời điểm chốt ở [sổ quyết định](evidence-and-decisions.md).
