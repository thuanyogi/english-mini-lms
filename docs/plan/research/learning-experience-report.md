# Nghiên cứu trải nghiệm học: Mini LMS tiếng Anh cho BS Minh

**Ngày nghiên cứu:** 2026-09-19 (Asia/Ho_Chi_Minh)
**Mục đích:** đầu vào cho kế hoạch; chưa phải chương trình học, rubric IELTS hay nội dung y khoa đã được xác thực.

## Kết quả mong muốn

Xây dựng mini LMS ưu tiên thiết bị di động kết hợp gia sư AI, giúp 30–45 phút học mỗi ngày tạo giá trị thực tế cho giao tiếp tự nhiên trong đời sống, công việc lâm sàng và hội nghị, đồng thời phát triển đủ bốn kỹ năng hướng tới mục tiêu IELTS 7.5–8.0. Việc học phải yêu cầu tư duy độc lập, sửa bài và hiểu nguyên nhân lỗi, không học thuộc máy móc.

Mặc định đề xuất là **BS Minh chủ động nhắn Zalo để bắt đầu hoặc tiếp tục phiên học; web di động dùng cho học có cấu trúc, đọc, viết, ôn tập và xem lịch sử bằng chứng**. Chỉ gửi lời nhắc chủ động khi BS Minh đã bật opt-in và có thể tắt lại. OpenClaw đã kết nối Zalo; hệ thống không được xây thêm bộ tích hợp Zalo thứ hai. Vai trò của web là bề mặt học chủ động hay chỉ lưu lịch sử vẫn là quyết định sản phẩm chưa chốt.

## Bằng chứng và ranh giới

### Yêu cầu người dùng đã xác nhận

- Tiếng Anh tự nhiên cho đời sống, công việc và hội nghị; đủ Nghe, Nói, Đọc, Viết.
- Mục tiêu IELTS 7.5–8.0; đọc–dịch tài liệu y khoa thực tế; học 30–45 phút mỗi ngày.
- Tránh học thuộc máy móc; cần môi trường AI agent và mini LMS, không chỉ một thời khóa biểu.
- Zalo đã kết nối qua OpenClaw.

### Đề xuất chưa được xác nhận

- Năm chế độ học, tiến trình thích ứng, phiên học chia nhỏ, pilot bốn tuần và web di động là không gian học chủ động.
- Người học làm trước khi được chấm hoặc xem lời giải đầy đủ **của chính bài tập đó**. Đây không phải lệnh cấm AI dạy: AI được giải thích khái niệm, hướng dẫn, gợi ý, hỗ trợ từng phần và đưa ví dụ khác trước khi người học làm.
- Mọi quota, ngưỡng, tỷ lệ và số lượng nêu trong báo cáo này chỉ là phương án thiết kế chưa chốt; cần hiệu chỉnh sau đánh giá đầu vào và quyết định sản phẩm.

### Giới hạn bằng chứng

- `docs/sources/` hiện có tên hai PDF y khoa. Báo cáo này chưa kiểm tra nội dung, chất lượng trích xuất, quyền sử dụng, độ phù hợp lâm sàng hay độ khó đối với người học.
- Chưa có đặc tả/rubric IELTS đã xác thực, kho nghe, chuẩn phát âm hoặc nội dung tiếng Anh đời sống/hội nghị. Không được tự nhớ rồi tuyên bố rubric chính thức; phải nhập nguồn và xác thực ở giai đoạn 1.
- Chỉ có transcript không đủ để đánh giá phát âm, ngữ điệu hoặc năng lực nghe. Nhận định quan trọng về band hay ngôn ngữ lâm sàng cần chuyên gia hiệu chỉnh.

## Mô hình trải nghiệm học

Mỗi hoạt động theo vòng lặp bằng chứng ngắn: **định hướng → mẫu/hỗ trợ → người học thực hiện → phản hồi có trọng tâm → sửa/làm lại → tự phản tư → thích ứng bài tiếp theo**. LMS lưu sản phẩm học và các lần sửa; agent chọn bài tiếp theo theo lỗ hổng đã thể hiện, không chỉ theo trạng thái hoàn thành.

| Chế độ | Nhiệm vụ thực tế | Bằng chứng lưu lại | Ranh giới phản hồi |
|---|---|---|---|
| Nói | Giải thích một khái niệm ca bệnh, trò chuyện xã giao hoặc trả lời tại hội nghị | Âm thanh, transcript, lần nói lại, tự ghi chú | Chỉ đánh giá phát âm từ âm thanh; đánh dấu độ bất định của ASR; cần người duyệt với nhận định hệ trọng |
| Nghe | Theo dõi một đoạn nói/hội thoại ngắn và hành động theo ý nghĩa | Câu trả lời trước khi mở đáp án, độ tự tin, số lần nghe lại, loại lỗi | Ẩn transcript/lời giải tới khi đã làm; hoạt động chỉ có transcript là đọc, không phải nghe |
| Đọc–dịch | Đọc đoạn y khoa đã khử định danh; tóm tắt, dịch và xử lý thuật ngữ | Vị trí nguồn, chú giải, bản nháp, bản sửa, quyết định thuật ngữ | Tách phản hồi ngôn ngữ khỏi tính đúng y khoa; không bịa hướng dẫn lâm sàng |
| Viết | Email, tóm tắt kiểu chuyển tuyến, đoạn tóm tắt nghiên cứu hoặc bài IELTS | Đề bài, bản nháp, nhãn phản hồi, bản sửa, giải thích thay đổi | Nêu lỗi ưu tiên và ví dụ; người học tự sửa trước khi nhận bản hoàn thiện đầy đủ |
| IELTS | Luyện tập theo dạng bài, có giới hạn thời gian ở bốn kỹ năng | Điều kiện làm bài, câu trả lời, nhận xét theo tiêu chí, kết quả lần làm lại | Không bịa band tổng; chỉ dùng rubric có nguồn, phiên bản và xác thực của con người |

### Cấu trúc phiên hằng ngày, tối đa 45 phút

- **Một trọng tâm, khoảng 30 phút:** định hướng, thực hiện, phản hồi/sửa, bài chuyển giao và phản tư.
- **Luyện tập chia đôi, khoảng 40–45 phút:** khởi động, chế độ chính, chế độ phụ, ôn tập và hành động tiếp theo.
- Thời lượng từng phần là gợi ý chưa chốt. Nếu bị gián đoạn, lưu và tiếp tục đúng bước; không đánh dấu hoàn thành khi chưa có sản phẩm thực hiện và phản tư.
- Mỗi lần chỉ điều chỉnh một biến độ khó: tốc độ, độ dài, độ phức tạp ngôn ngữ, mức hỗ trợ hoặc áp lực thời gian. Lỗi lặp lại kích hoạt dạy lại, không chỉ tăng độ khó.

## Ma trận nghiệm thu sản phẩm đề xuất

| Khu vực | Nghiệm thu quan sát được | Tín hiệu thất bại |
|---|---|---|
| Khởi tạo | Ghi nhận đầu vào từng kỹ năng, mục tiêu/thời hạn, chuyên khoa, tình huống thường gặp, quỹ thời gian, khả năng dùng âm thanh và ranh giới đồng thuận | Sinh chương trình cố định trước khi có dữ liệu đầu vào |
| Bộ máy phiên học | Khởi chạy phiên 30–45 phút, lưu từng bước, tiếp tục sau gián đoạn và ghi nhận lần làm + lần sửa + phản tư | Chỉ dựa vào việc mở nội dung hoặc số lượt chat để đánh dấu hoàn thành |
| Sư phạm của agent | Có thể dạy, gợi ý và đưa ví dụ khác; giữ lại phần chấm/lời giải đầy đủ của bài đang làm tới khi có lần làm; giải thích nguyên nhân lỗi và yêu cầu thử lại | Từ chối dạy một cách cứng nhắc, đưa ngay đáp án hoặc sửa mà không giải thích |
| Năm chế độ | Mỗi chế độ tạo đúng bằng chứng cần thiết và khuyến nghị bước tiếp theo; người học có thể tự làm trước phản hồi | Chế độ chỉ là nhãn giao diện cho cùng một luồng chat |
| Tính toàn vẹn âm thanh | Nhận định Nói/Nghe liên kết tới âm thanh phát lại được; thiếu âm thanh phải chuyển sang trạng thái “không thể đánh giá” | Suy ra điểm phát âm/nghe chỉ từ transcript |
| Nguồn đọc | Mỗi đoạn y khoa có nguồn/phiên bản/vị trí trang, trạng thái quyền sử dụng và xác thực | Đoạn không rõ nguồn hoặc khẳng định y khoa do AI tạo được trình bày như sự thật |
| Sửa bài viết | Thể hiện khác biệt giữa bản nháp và bản sửa, yêu cầu người học giải thích ít nhất một thay đổi có ý nghĩa | Chỉ trả lại một bài mẫu hoàn chỉnh |
| Tính toàn vẹn IELTS | Hiện tên/phiên bản/nguồn rubric và giới hạn chấm; rubric chưa xác thực phải chặn tuyên bố band | Tự nhận “chính thức” hoặc tạo band chính xác mà không có nguồn đã xác thực |
| Thích ứng | Bài tiếp theo dẫn bằng chứng gần nhất như mẫu lỗi, lần thử lại, độ tự tin hoặc lịch ôn; người học có quyền đổi | Độ khó thay đổi không có lý do quan sát được |
| Liên tục Zalo/web | Tin nhắn chủ động của BS Minh qua OpenClaw mở/tiếp tục đúng phiên LMS và đồng bộ trạng thái idempotent; lời nhắc chủ động chỉ sau opt-in; không có connector Zalo trùng lặp | Trùng hội thoại, mất tiến độ, gửi nhắc khi chưa opt-in hoặc có hai adapter cùng gửi |
| An toàn/riêng tư | Bài tập dùng ca tổng hợp/đã khử định danh; không cần dữ liệu bệnh nhân; AI tách huấn luyện ngôn ngữ khỏi tư vấn y khoa | Lưu định danh bệnh nhân hoặc giao quyết định lâm sàng cho AI |
| Hiệu chỉnh của người | Người duyệt xem được bằng chứng, ghi đè phản hồi, lưu lý do và so sánh nhận định AI/người | Kết quả hệ trọng không có dấu vết duyệt |

## Hành trình mẫu

1. BS Minh chủ động nhắn Zalo để học 35 phút; OpenClaw trả liên kết mở đúng hoạt động “giải thích tại hội nghị + nghe” trên web di động. Nếu đã opt-in, một lời nhắc nhẹ có thể được gửi theo lịch đã chọn.
2. Phần định hướng ngắn dạy một cấu trúc diễn đạt và minh họa bằng ví dụ không trùng bài tập.
3. BS Minh nghe khi chưa có transcript, ghi lại ý hiểu và độ tự tin, rồi mới mở gợi ý có trọng tâm sau lần làm đầu.
4. BS Minh ghi âm phần giải thích 90 giây. LMS giữ âm thanh và transcript; agent chỉ ra mẫu lỗi ngôn ngữ và độ bất định, không suy điểm phát âm từ transcript.
5. BS Minh nói lại sau phản hồi và giải thích một thay đổi. Agent so sánh hai lần, lên lịch ôn ngắn; LMS lưu cả hai sản phẩm và nguồn gốc.

## Cổng sẵn sàng nguồn và nội dung giai đoạn 1

Trước khi biên soạn chương trình: kiểm kê file được phép dùng trong `docs/sources/`; ghi chủ sở hữu/quyền, bản/phiên bản, ngôn ngữ, vị trí trang, chất lượng OCR, độ liên quan chuyên khoa, độ khó và người duyệt lâm sàng. Cách ly trang khó đọc, mơ hồ, không an toàn hoặc chứa dữ liệu cá nhân. Duy trì truy vết từ bài tập về nguồn.

Khoảng trống cần bổ sung: đặc tả/rubric IELTS đã xác thực, âm thanh nghe được cấp quyền kèm transcript, chuẩn phát âm và bộ kiểm thử thu âm, tình huống đời sống/hội nghị, đoạn y khoa phù hợp trình độ. Theo quy tắc dự án, các nguồn này phải được thêm vào `docs/sources/` trước khi sử dụng; không được âm thầm nhập nội dung ngoài.

Nghiệm thu nội dung: mỗi hoạt động có mục tiêu học, nguồn, bằng chứng cần tạo, hướng dẫn phản hồi, nhãn độ khó, thời lượng ước tính, trạng thái đáp án/rubric, trạng thái duyệt lâm sàng khi liên quan và hiển thị di động đã kiểm thử. Người duyệt thứ hai lấy mẫu nhiệm vụ do AI tạo để phát hiện sai lệch sự thật và lộ đáp án trước pilot.

## Đề xuất pilot bốn tuần sau khi xây dựng

Mọi số lượng và ngưỡng dưới đây đều là phương án chưa chốt. Bản thiết kế sản phẩm hiện dùng **tối thiểu 12 phiên trong bốn tuần**, bao phủ đủ bốn kỹ năng, có **ít nhất 2 hoạt động đọc–dịch, 2 hoạt động IELTS và 4 vòng sửa bài**; báo cáo này không đề xuất tăng quota bắt buộc.

- **Bằng chứng đầu/cuối:** nhiệm vụ cùng dạng nhưng khác nội dung cho đủ bốn kỹ năng, cộng nhiệm vụ đọc–dịch y khoa; giữ sản phẩm để người đánh giá so sánh mù. Không quy đổi sang band IELTS khi rubric và người chấm chưa được xác thực.
- **Phạm vi:** tối thiểu 12 phiên trong bốn tuần; đủ bốn kỹ năng; ít nhất 2 đọc–dịch, 2 IELTS và 4 vòng làm–phản hồi–sửa. Đây là ngưỡng pilot đề xuất, chưa phải cam kết học tập.
- **Tín hiệu học tập:** người duyệt nhận thấy cải thiện quan sát được ở các kỹ năng mục tiêu, không có suy giảm đáng kể; lỗi ưu tiên lặp lại giảm trên nhiệm vụ so sánh được. Chỉ chốt ngưỡng số sau khi biết biến thiên đầu vào.
- **Tín hiệu trải nghiệm:** theo dõi tỷ lệ hoàn thành không cần trợ giúp quản trị, thời lượng thực tế so với thời lượng hứa hẹn và phản hồi của BS Minh về khả năng chuyển giao sang công việc/hội nghị. Chưa chốt ngưỡng tỷ lệ.
- **Tín hiệu toàn vẹn:** không tuyên bố band khi thiếu rubric xác thực, không đánh giá phát âm/nghe khi thiếu âm thanh, không dùng đoạn y khoa không truy vết được, không có định danh bệnh nhân, không gửi Zalo trùng hoặc lời nhắc chưa opt-in.
- Mỗi tuần, người phụ trách lấy mẫu phản hồi AI, độ trung thành nguồn, độ khó và sự tự tin sai để hiệu chỉnh. Pilot thành công chỉ cho phép tinh chỉnh chương trình, không chứng minh hiệu quả giáo dục.

## Khuyến nghị lập kế hoạch

1. Chốt vai trò của web, sau đó thiết kế một trạng thái phiên chuẩn dùng chung cho Zalo và web.
2. Đánh giá đầu vào và kiểm tra mức sẵn sàng nguồn trước khi cố định cấp độ, cột mốc hoặc thời hạn đạt band.
3. Xây trọn vòng lặp bằng chứng cho một chế độ trước; kiểm tra lưu trạng thái, sửa bài và dấu vết người duyệt rồi mới mở rộng đủ năm chế độ.
4. Chỉ thêm chế độ âm thanh sau khi thu/phát và trạng thái “không thể đánh giá” hoạt động; chỉ thêm chấm IELTS sau khi nhập nguồn và có người xác thực.
5. Pilot bốn tuần theo phạm vi tối thiểu của thiết kế sản phẩm, xem xét sản phẩm học và lỗi an toàn rồi mới hiệu chỉnh tiến trình/ngưỡng nghiệm thu.

## Câu hỏi chưa giải quyết

- Web di động là bề mặt học/đọc/viết/ôn chủ động, hay chỉ lưu lịch sử trong khi mọi hoạt động diễn ra ở Zalo?
- Trình độ hiện tại theo từng kỹ năng, thời hạn mục tiêu, chuyên khoa và tình huống đời sống/công việc/hội nghị có giá trị cao nhất là gì?
- File nào trong `docs/sources/` được phép dùng cho học tập, và ai xác thực tính đúng y khoa/chấm IELTS?
- Thiết bị và bối cảnh thường dùng có cho phép thu/phát âm thanh không?
- BS Minh có muốn opt-in lời nhắc chủ động không; nếu có thì tần suất và khung giờ nào phù hợp?

Status: DONE_WITH_CONCERNS
Tóm tắt: Đã hoàn thiện đầu vào kế hoạch cho trải nghiệm học, ma trận nghiệm thu, cổng nguồn và pilot bốn tuần. Quan ngại chính: chưa có đầu vào, vai trò web chưa chốt, chưa có nguồn IELTS/âm thanh/nội dung đã xác thực và chưa có quyết định opt-in nhắc học.
