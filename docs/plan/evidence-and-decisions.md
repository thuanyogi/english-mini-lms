# Cơ sở và quyết định đề xuất

Ngày: 19/09/2026. Trạng thái: bản kế hoạch để duyệt; chưa triển khai sản phẩm.

## Yêu cầu được người dùng xác nhận

- Đối tượng đầu tiên là BS. Minh, học cá nhân 30–45 phút/ngày.
- Mục tiêu gồm giao tiếp đời sống, công việc, hội nghị; đủ nghe, nói, đọc, viết; đọc và dịch sách y khoa; hướng tới IELTS 7.5–8.0.
- Ưu tiên sử dụng thực tế, không học thuộc máy móc.
- Cần môi trường AI agent và mini LMS, có cách triển khai cụ thể.
- Zalo đã kết nối qua OpenClaw theo người dùng. Tái sử dụng kết nối này; không xây Zalo adapter mới.
- D1 đã xác nhận ngày 19/09/2026: “Zalo để trò chuyện; web để học với tài liệu, làm bài và xem tiến độ”. Người xác nhận là người đặt dự án; chưa suy ra anh Minh đã duyệt toàn bộ plan.
- Đầu ra hiện tại là bộ plan kỹ thuật và một bản ngắn để gửi anh Minh duyệt. Không có yêu cầu triển khai, gửi Zalo hoặc xuất bản trong lượt này.

## Bằng chứng workspace

| Bằng chứng | Kết luận được phép rút ra |
|---|---|
| README của repo `dr-minh-clinic` (thời điểm 19/09/2026) mô tả workspace quản lý phòng khám, dashboard tương lai | Đây chưa phải source mini LMS; ngày 22/09/2026 LMS đã tách sang repo riêng `english-mini-lms` |
| Khảo sát trong phiên: không có `src-astro/`, package web hoặc module LMS | Plan phải có bước dựng app mới; không coi đường dẫn trong README là app có sẵn |
| Khảo sát `openclaw.json` và các bot trong phiên trước | Các bot local là Telegram y khoa; cấu hình local không đại diện đầy đủ cho OpenClaw ngoài VPS |
| Người dùng xác nhận OpenClaw đã xử lý Zalo | Giữ nguyên tiền đề kết nối có sẵn; chỉ xác minh giao diện tools và media khi tích hợp LMS |
| `AGENTS.md` của repo `dr-minh-clinic` (19/09/2026) | Skills ở `.agents/skills/`, workflow ở `.agents/workflows/`, nguồn nội dung trong `docs/sources/`. Repo LMS mới có [AGENTS.md](../../AGENTS.md) riêng, nguồn học tại `content/english-lab/` |
| `CLAUDE.md` không tồn tại khi kiểm tra | Không có hướng dẫn bổ sung từ file này; không tự tạo thay thế |
| Worktree có nhiều file sửa và chưa theo dõi của công việc khác | Lượt lập plan chỉ thêm tài liệu trong thư mục plan; triển khai sau phải giới hạn vùng sở hữu |
| Kiểm tra 19/09/2026 bằng `rg --files --no-ignore docs/sources` liệt kê hai PDF y khoa | File bị ignore nên tìm mặc định có thể bỏ sót; chưa xác nhận nội dung/quyền dùng và chưa có thư viện `english-lab`, bộ đề/audio/rubric IELTS được duyệt |

Những nhận định này không xác nhận cấu hình VPS, định dạng voice hay khả năng gọi tools của OpenClaw đang chạy. Không đọc dữ liệu bệnh nhân, secret hoặc sách để đưa ra đánh giá y khoa.

## Quyết định thiết kế và trạng thái duyệt

| Mã | Đề xuất trong plan | Điều kiện thay đổi |
|---|---|---|
| D1 | **Đã xác nhận 19/09/2026:** Zalo để trò chuyện; web để học với tài liệu, làm bài và xem tiến độ | Giữ làm cơ sở thiết kế; chỉ đổi khi người đặt dự án có quyết định mới |
| D2 | Một tài khoản học viên và một vai trò quản trị hỗ trợ | Thêm học viên/gia sư là thay đổi phạm vi, chưa thiết kế quản lý lớp |
| D3 | App độc lập tại repo `english-mini-lms/` (repo riêng), backend và web dùng chung domain service | Chỉ gắn vào app có sẵn nếu xác định đúng repo và có đánh giá phạm vi mới |
| D4 | Một deployment LMS riêng, PostgreSQL riêng và vùng lưu file riêng | Cùng VPS vật lý chỉ khi đủ tài nguyên và cô lập được quyền, dữ liệu, backup |
| D5 | Tiến độ trong database; agent gọi tools qua API nội bộ xác thực | Chọn cơ chế gọi tools phù hợp OpenClaw thực tế trong giai đoạn 1; không giả định tên plugin/schema |
| D6 | AI được ra bài, giải thích và gợi ý; bài làm của Minh được lưu trước phản hồi đánh giá | Mẫu/đáp án xem trước được ghi là bài có hỗ trợ, không tính như năng lực độc lập |
| D7 | Pilot 4 tuần sau khi hệ thống đủ điều kiện chạy thật | Đây là giai đoạn thử sản phẩm, không phải thời hạn đạt IELTS |
| D8 | Nhắc học chủ động mặc định tắt; chỉ bật theo lựa chọn riêng của Minh | Không suy ra quyền gửi định kỳ từ việc duyệt plan |
| D9 | **Sổ từ vựng ngữ cảnh (Vocabulary Vault):** Lưu dạng tuple (từ + IPA + nghĩa ngữ cảnh + câu gốc + nguồn/locator + câu tự dùng + Spaced Repetition). Hỗ trợ "1-Click Smart Capture" trên Web và "Micro-challenge Roleplay" qua Zalo | Thay thế flashcard từ đơn rời rạc; giảm tải thao tác cho bác sĩ bận rộn |
| D10 | **Kết nối nguồn bên ngoài & Shadowing:** Tận dụng link và nhúng iframe (YouTube Iframe Player API); MVP 24 bài lưu transcript chuẩn và mốc thời gian đã duyệt thay vì gọi API caption runtime | Tránh vi phạm quyền tải caption YouTube và đảm bảo AI chấm phát âm chính xác |
| D11 | **Nhánh Lite tự xây (đề xuất 22/09/2026):** anh Minh tự xây bằng Antigravity theo [lite-mvp-track.md](lite-mvp-track.md) — web-first, Supabase + Gemini + Vercel, không worker/outbox/Zalo ở bản đầu; giữ invariant append-only/assisted/not_assessable/no-official-band. P1–P8 giữ làm đích v2 | Chờ anh Minh chọn cloud (Supabase/Vercel) hay local; chờ duyệt ngân sách Gemini |

Các quy tắc “không được giảng trước khi nộp bài”, “web chỉ để xem” và quota lịch cứng trong hội thoại trước là đề xuất của trợ lý, chưa phải quyết định của người dùng. Plan làm rõ chúng, không coi là yêu cầu đã duyệt.

D2–D11 vẫn là đề xuất cần duyệt. Việc xác nhận D1 không đồng nghĩa duyệt ngân sách, lịch, triển khai hoặc gửi tin cho anh Minh.

## Lựa chọn và đánh đổi

| Hướng | Lợi ích | Hạn chế | Kết luận đề xuất |
|---|---|---|---|
| Chỉ file + Zalo | Ít thành phần lúc đầu | Khó đồng bộ bài làm, phiên bản phản hồi, sửa bài và quyền truy cập web | Không chọn làm nền dữ liệu cho mini LMS đầy đủ |
| App riêng + API tools cho OpenClaw | Có bài học, bài làm, tiến độ và UI nhất quán | Cần vận hành app/database và kiểm thử tích hợp | Chọn làm phương án nền |
| Gắn LMS vào dashboard phòng khám | Có thể dùng lại giao diện nếu tìm đúng repo | Source chưa có; dễ nối nhầm dữ liệu/quyền phòng khám | Không lấy làm phụ thuộc cho plan này |

## Những việc cần xác nhận và người phụ trách

| Việc | Người cung cấp/quyết định | Khi cần | Nếu chưa có |
|---|---|---|---|
| Đồng ý hướng pilot và phần plan còn lại | Người đặt dự án và Minh | Trước triển khai/pilot tương ứng | D1 đã xác nhận; pilot và các lựa chọn khác vẫn chờ duyệt |
| Trình độ hiện tại, ưu tiên công việc, Academic/General, ngày thi/hội nghị nếu có | Minh | Onboarding | Đánh giá đầu vào; không tự gán band hoặc tự chọn biến thể IELTS |
| Sách/chương/audio/đề có quyền sử dụng | Minh + người biên tập | Trước nhập nội dung | Hiển thị “chưa có tài liệu”; không tạo đề gắn nhãn chính thức |
| OpenClaw phiên bản, cách gọi tools, media, định danh người gửi | Người vận hành OpenClaw | Giai đoạn 1 | Test hợp đồng có kiểm soát; không sửa adapter Zalo |
| Máy chủ, domain, chủ sở hữu backup, người bảo trì | Người đặt dự án + kỹ thuật | Trước dựng môi trường | Chưa triển khai public |
| Ngân sách xây dựng, chi phí tháng và giới hạn AI | Người đặt dự án/Minh | Trước kích hoạt dịch vụ trả phí | Định lượng bằng công thức; chưa mua dịch vụ |
| Đồng ý lưu bài/voice, thời hạn lưu và người được xem | Minh | Trước pilot dữ liệu thật | Chỉ dùng dữ liệu kiểm thử được tạo riêng |

## Phạm vi xác minh của bộ plan

Nghiên cứu dựa trên brief người dùng, nguồn chỉ dẫn và bằng chứng workspace. Chưa sử dụng tài liệu học hoặc dữ liệu ngoài `docs/sources/`. Các phiên bản framework, provider, mức phí và khả năng OpenClaw cụ thể phải được xác minh ở giai đoạn 1, không được hiểu là đã kiểm thử chỉ vì xuất hiện trong thiết kế đề xuất.
