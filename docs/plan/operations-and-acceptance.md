# Triển khai, chi phí, kiểm thử và bàn giao

Liên quan: [Plan](plan.md), [kiến trúc](technical-architecture.md), [hợp đồng](data-and-tools-contract.md), [sổ quyết định](evidence-and-decisions.md).

## Phân công đề xuất

| Vai trò | Trách nhiệm | Đầu ra |
|---|---|---|
| Người đặt dự án | Chốt phạm vi, ngân sách, điều phối và tiếp nhận bàn giao | Quyết định MVP, môi trường, ưu tiên và nghiệm thu |
| Anh Minh | Nêu nhu cầu, chọn tài liệu có quyền dùng, học thử và góp ý | Mục tiêu/đầu vào, bài làm, đánh giá hữu ích, quyết định tiếp tục |
| Kỹ thuật | Xây app/API/tools, kiểm thử, deploy, vận hành và khôi phục | Release có bằng chứng, runbook và đầu mối bảo trì |
| Người vận hành OpenClaw | Cấp đúng ngữ cảnh tích hợp, gắn agent/tools, hỗ trợ receipt/media | Hợp đồng runtime, cấu hình có backup và kiểm chứng luồng thật |
| Người duyệt nội dung/tiếng Anh được chỉ định | Kiểm nguồn/bài/rubric; rà mẫu góp ý AI | Nội dung approved, đánh giá phản hồi và trường hợp cần sửa |

Một người có thể kiêm nhiều vai trò, nhưng tên người chịu trách nhiệm phải được ghi trước pilot. Không giả định đã thuê giáo viên; nếu chưa có người đủ khả năng đối chiếu rubric IELTS thì chưa bật ước lượng band và chưa nghiệm thu phần đó như đã hiệu chuẩn.

## Công sức và thời gian đề xuất

| Giai đoạn | Công sức kỹ thuật | Phụ thuộc |
|---|---|---|
| 1. Chốt hợp đồng, nguồn và runtime | 12–16 giờ | Duyệt hướng sản phẩm, có đầu mối OpenClaw |
| 2. Nền tảng, tài khoản, lưu trữ | 24–32 giờ | 1 |
| 3. Thư viện và phiên học | 24–32 giờ | 2 |
| 4. AI và các chế độ học | 32–48 giờ | 3, nguồn/rubric/audio đủ |
| 5. Web di động | 32–40 giờ | 3; có thể song song 4 với người khác |
| 6. Tools và tích hợp OpenClaw | 16–24 giờ | 2–4 và hợp đồng runtime |
| 7. Kiểm thử, triển khai, phục hồi | 24–32 giờ | 4–6 |
| 8. Hỗ trợ pilot và bàn giao | 16–24 giờ | 7 đạt các điều kiện bắt đầu |
| **Tổng** | **180–248 giờ** | Chưa gồm thời gian học và công biên tập toàn bộ thư viện |

Với một người kỹ thuật dành khoảng 32 giờ hiệu quả/tuần: trước pilot khoảng 5–7 tuần, tiếp theo 4 tuần pilot; tổng lịch dự kiến 9–11 tuần sau khi đầu vào sẵn sàng. Đây là ước lượng lập kế hoạch, không là cam kết ngày giao. Nếu cần sớm hơn, có thể demo một luồng trước; tiêu chí MVP đầy đủ giữ nguyên. Nguồn thiếu, chờ phản hồi hoặc VPS không phù hợp làm thay đổi lịch; phải cập nhật kế hoạch công khai.

Nhánh nội dung chạy cùng các giai đoạn 1–4: người phụ trách biên tập lập inventory 24 hoạt động theo [thiết kế sản phẩm](product-design.md), chọn nguồn được phép, gắn đoạn/trang/audio, viết yêu cầu bài và hướng dẫn chấm, giữ riêng bộ baseline/endline tương đương, nhập và kiểm trên điện thoại. Dự trù thêm **24–48 giờ biên tập/đối chiếu** nếu nguồn và quyền đã có; thiếu tài liệu, phải xin phép hoặc xử lý OCR nhiều thì ước lượng lại. Đây là công việc cần làm để đủ MVP, không phải phần bị bỏ khỏi phạm vi vì chưa nằm trong giờ kỹ thuật. Tổng công sức dự trù khi cộng nhánh này: **204–296 giờ**, chưa gồm thời gian học của Minh và thời gian chờ bên cấp tài liệu.

## Chi phí và cách kiểm soát

Chưa có ngân sách hoặc báo giá provider được xác nhận. Không dùng giá gói tiêu dùng để suy ra giá API. Cần lập bảng dự toán bằng giá thực tế tại thời điểm triển khai và được chủ dự án duyệt trước khi mua/kích hoạt.

| Khoản | Công thức/đầu vào | Ai xác nhận |
|---|---|---|
| Xây dựng | 180–248 giờ × đơn giá thỏa thuận | Người đặt dự án + người thực hiện |
| Máy chủ/domain | Phần tài nguyên mới hoặc chi phí tăng thêm của VPS đủ cô lập | Người vận hành |
| Database/file/backup | Dung lượng thật + bản sao ngoài VPS + thời hạn lưu | Kỹ thuật |
| Model phản hồi | Token vào/ra mỗi phiên × giá provider × số phiên | Kỹ thuật đo ở pilot |
| STT/TTS/OCR/audio | Phút âm thanh, trang và request thực tế × đơn giá | Kỹ thuật |
| Nội dung/đối chiếu | Quyền sử dụng sách/đề/audio; công duyệt nếu cần | Minh + chủ dự án |
| Bảo trì | Giờ hỗ trợ, cập nhật và diễn tập restore định kỳ | Chủ dự án |

Kịch bản tính dung lượng sử dụng: 30 phiên/tháng × 30–45 phút = 900–1.350 phút người học; không đồng nghĩa toàn bộ phút đều gọi AI. Đo riêng số phút audio, token và số job từ 10 phiên đại diện. Đặt hạn mức ngày/tháng sau khi chủ dự án duyệt số tiền; cảnh báo ở 80%, đến 100% ngừng job AI mới và cho lưu bài/chờ nạp hạn mức. Giữ bản nháp và bài đã nộp ngay cả khi provider hết tiền.

## Các bước phát hành

1. **Chốt đầu vào:** ghi câu trả lời các quyết định D1–D8; kiểm tra source/audio/rubric, thư viện auth và provider; ghi rõ phần chưa xác minh.
2. **Dựng local:** app mới có lockfile và script check/test/build; database test riêng, sample học tập tự tạo có nhãn. Không đưa fixture vào thư viện production làm dữ liệu thật.
3. **Dựng staging:** domain/access riêng, database/volume riêng, tắt gửi nhắc; secrets runtime; kiểm source manifest và migration trên dữ liệu thử.
4. **Kiểm tra tích hợp:** tools authenticated vào agent học; test text/ảnh/voice, danh tính, duplicate event, timeout và chuyển Zalo–web bằng tài khoản thử được chỉ định.
5. **Chốt release:** immutable image/revision, schema compatibility, test report, mẫu feedback đã duyệt, cost estimate. Đạt test local không thay cho stage/live.
6. **Backup và migration:** tạo backup DB+files nhất quán, mã hóa, ghi checkpoint, restore thử trong nơi cô lập; sau đó mới chạy migration một lần. Có đường forward-fix/rollback rõ.
7. **Production:** chủ dự án duyệt bản release cụ thể; deploy LMS riêng, gắn runtime tools đã xác định. Smoke đăng nhập, đọc nguồn, nộp, nhận phản hồi và tiếp tục phiên. Tin gửi live chỉ đến tài khoản/thread đã chỉ định.
8. **Pilot:** onboarding Minh, theo dõi lỗi/chất lượng/chi phí trong 4 tuần, sửa vấn đề ảnh hưởng trải nghiệm; tổng kết rồi quyết định duy trì hoặc điều chỉnh.

Khi chạy dev/test server, chọn port cụ thể sau kiểm tra owner; ghi PID/port/workdir và dừng process do task khởi tạo. Không khởi động lại gateway OpenClaw hay bot clinic của người dùng để giải quyết lỗi LMS.

## Ma trận nghiệm thu kỹ thuật

| Nhóm | Kiểm tra bắt buộc | Kết quả đạt |
|---|---|---|
| Auth | Người lạ, credential sai, learner giả trong tool, truy cập chéo ID | 401/403, không đọc/ghi dữ liệu người khác |
| Core | Nộp bài, revision, hai kênh sửa đồng thời, reload sau lưu | Lưu đúng một bản cho một event; giữ mọi lần sửa có chủ ý |
| Sources | Source chưa duyệt, locator sai, OCR hỏng, đáp án bị yêu cầu sớm | Chặn publish/chấm khi thiếu; không lộ đáp án khi chưa được phép |
| AI | Hướng dẫn trước bài, chấm khi chưa nộp, JSON lỗi, prompt injection, model giả bài người học | Cho hướng dẫn; chỉ nhận submission tool từ input reference có tác giả đã xác minh; lỗi có trạng thái rõ |
| Speaking | Audio thật, STT sai, mic bị từ chối, file rỗng | Cho xác nhận/ghi lại; không chấm phát âm từ transcript |
| Listening | Audio, câu trả lời, mở transcript, replay | Có trace câu trả lời trước reveal; assisted không trộn độc lập |
| Reading/writing | Nguồn/trang, nháp, nộp, góp ý, bản sửa | Xem lại đủ chuỗi và lý do; không ghi đè |
| IELTS | Chưa chọn biến thể, rubric chưa duyệt, timer, score claim | Có trạng thái thiếu; không tự gán official band |
| Worker | Crash/restart, lease hết hạn, provider timeout, hết budget | Bài không mất, retry giới hạn, kết quả không nhân đôi |
| Giao tin | Event lặp, timeout sau send, receipt vắng | Web vẫn có kết quả; unknown không tự gửi lại mù |
| Mobile | Thiết bị Minh, webview Zalo/trình duyệt, keyboard/mic/audio | Đọc, nghe, nộp và sửa được; permission/error có hướng dẫn |
| Vận hành | Backup, restore, migration, rollback, log redaction | Khôi phục có bằng chứng; không lộ secret/bài riêng trong log |

Tầng kiểm thử: unit cho state/permissions/gating, integration với PostgreSQL và worker thật, contract với bridge/provider stub cho lỗi kiểm soát, E2E trình duyệt, cuối cùng smoke provider/OpenClaw thật. Stub chứng minh xử lý lỗi, không chứng minh provider hay Zalo live. Commands cụ thể là script cần tạo trong app: `lint`, `typecheck`, `test`, `test:integration`, `test:e2e`, `build`; ghi exit status/report khi triển khai, không đánh dấu đã chạy trong bộ plan này.

## Điều kiện bắt đầu và kết thúc pilot

Trước pilot đủ cả năm mode, nguồn cho từng mode, tài khoản và audio thật; một chuỗi nộp–chấm–sửa trên cả web/OpenClaw; test quyền và restore đạt; ngân sách/thời hạn lưu được duyệt. Không còn lỗi làm mất bài, sai người, lộ dữ liệu hoặc điểm đánh giá không có bằng chứng.

Trong 4 tuần, mục tiêu đề xuất ít nhất 12 phiên, đủ nghe–nói–đọc–viết, có hai bài đọc–dịch, hai bài IELTS, bốn lượt sửa và ít nhất một tình huống công việc/hội nghị. Báo cáo riêng: mức sử dụng, độ ổn định, chi phí, cảm nhận Minh và dấu hiệu tiến bộ từ bài tương đương. Nếu thiếu số liệu thì ghi “chưa đủ bằng chứng”, không tự đánh dấu hiệu quả học tập.

Điểm IELTS 7.5–8.0 là mục tiêu dài hạn của người học; không dùng làm điều kiện nghiệm thu phần mềm trong 4 tuần. Bài thi thử đầy đủ nếu cần có thời lượng riêng được Minh đồng ý; bài chia nhỏ trong ngày không gọi là full mock.

## Vận hành sau bàn giao

- Dashboard quản trị hiển thị queue age, job lỗi, dung lượng/backup gần nhất, lỗi auth và usage; không đưa thông tin vận hành vào màn hình học nếu không giúp Minh xử lý.
- Người bảo trì kiểm tra lỗi/backup mỗi ngày trong pilot; rà chất lượng feedback và chi phí mỗi tuần; ghi người trực và kênh hỗ trợ trước production.
- Mục tiêu đề xuất RPO ≤24 giờ và RTO ≤8 giờ cho DB+files. Nếu mất toàn VPS, có thể mất tối đa phần học sau backup; Minh phải hiểu và chấp nhận mức này hoặc nâng backup trước live.
- Backup mã hóa ngoài VPS; bộ DB+file cùng checkpoint. Restore thử sang môi trường cô lập, kiểm hash/file references, số bản nộp, quyền và luồng smoke; ghi thời gian thực.
- Khi restore, áp deletion ledger mới nhất trước mở dịch vụ để không tái hiện bài/voice đã yêu cầu xóa. Ledger giữ ngoài checkpoint dữ liệu, mã hóa và tồn tại lâu hơn backup cũ; worker và outbox kiểm tombstone trước commit/gửi. Thiếu ledger thì chưa mở dịch vụ phục hồi.
- Trước migration hoặc chỉnh dữ liệu quản trị hàng loạt phải backup. Rollback app về image trước nếu schema tương thích; schema additive là ưu tiên. Không down-migrate phá dữ liệu vừa học; forward-fix hoặc restore có đối soát khi cần.
- Khi provider lỗi: dừng chấm nhưng nhận/lưu bài nếu DB/files tốt. Khi DB/files lỗi: không báo accepted. Khi Zalo lỗi: Minh xem trên web và tiếp tục được cùng bài.
- Cập nhật dependency/model/rubric có version; chạy lại bộ bài chuẩn nhỏ để so độ lệch trước phát hành. Không đổi model âm thầm rồi so điểm như cùng điều kiện.

## Danh mục bàn giao

- Source/lockfile, migration và release version; quyền sở hữu tài khoản/domain/hosting được chuyển đúng người.
- Source manifest, danh sách nội dung được duyệt, rubric và ghi chú quyền sử dụng.
- Hướng dẫn Minh đăng nhập, bắt đầu/tiếp tục, xin gợi ý, gửi voice, sửa bài, xem tiến độ và yêu cầu hỗ trợ.
- Hướng dẫn quản trị thêm nguồn/bài, xem lỗi, giới hạn chi phí, thu hồi nhận xét sai, backup/restore, xuất/xóa dữ liệu.
- Bằng chứng local/staging/live, báo cáo pilot, tồn đọng và người xử lý; không gọi một phase hoàn thành chỉ vì đã có tài liệu.

## Câu hỏi cần chốt khi duyệt

Mốc mong muốn và ngân sách; sách/đề/audio; baseline/biến thể IELTS/deadline; người vận hành và người duyệt nội dung; đồng ý lưu bài/voice 90 ngày, backup 30 ngày và mức phục hồi đề xuất. Vai trò Zalo/web đã được người đặt dự án xác nhận theo D1 ngày 19/09/2026. Các câu còn mở phải giải quyết trước những bước phụ thuộc.
