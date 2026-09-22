# Kiến trúc và cách triển khai đề xuất

Liên quan: [Plan](plan.md), [sản phẩm](product-design.md), [data/tools](data-and-tools-contract.md), [vận hành và nghiệm thu](operations-and-acceptance.md).

## Ranh giới hệ thống

```text
Anh Minh trên Zalo → OpenClaw hiện hữu → English Learning Agent
                                             │ tools được giới hạn quyền
Anh Minh trên web ────────────────────────────┼→ LMS API / domain services
                                             │       ├→ PostgreSQL
                                             │       ├→ kho file riêng
                                             │       └→ jobs → worker → AI/STT/OCR
                                             └← kết quả đã lưu ← feedback/outbox
```

OpenClaw giữ trách nhiệm kết nối, nhận/gửi Zalo và định tuyến hội thoại. Agent học dùng công cụ LMS để lấy bài, nhận bài, yêu cầu phản hồi và đọc tiến độ. LMS quản lý trạng thái bền vững; bộ nhớ hội thoại chỉ giữ ngữ cảnh tạm, có thể dựng lại từ dữ liệu LMS.

Web và Zalo cùng thao tác trên một phiên/bài nộp. Không để mỗi kênh tự có một bộ điểm hay lịch sử khác nhau. API dùng chung domain services với web; database không mở trực tiếp cho model hoặc trình duyệt.

## Stack nền để lập ước lượng

| Thành phần | Đề xuất | Lý do và bước xác minh |
|---|---|---|
| Web + API | Next.js, TypeScript, responsive | Một codebase cho UI và server; P1 chọn phiên bản được hỗ trợ, pin lockfile và kiểm tra môi trường Node |
| Database | PostgreSQL riêng cho LMS | Transaction cho nộp bài, jobs và phiên bản; không dùng database clinic |
| File | Private filesystem volume được backup | Phù hợp một học viên trên VPS; chỉ truy cập qua API có quyền, có abstraction để chuyển object storage khi cần |
| Jobs | Worker Node cùng release, queue trong PostgreSQL | Chấm/STT/OCR chạy nền, restart không mất job; chưa cần thêm Redis |
| Auth | Thư viện auth đang được bảo trì, invite-only, cookie session | P1 chọn và kiểm chứng dependency; không tự viết crypto hay lưu mật khẩu thô |
| Triển khai | Docker Compose riêng, reverse proxy TLS hiện có hoặc riêng | Dễ vận hành một học viên; chỉ dùng chung VPS khi kiểm tra đủ RAM/disk và quyền |
| AI | Một provider chính được duyệt và provider interface trong worker | P1 thử structured output, audio/STT, dữ liệu gửi đi và chi phí; không gắn cứng một model chưa kiểm thử |
| Search | Metadata/full-text theo nguồn, đoạn đã chọn | Khởi đầu không cần vector database/RAG cả thư viện; không tái sử dụng index clinic |

Đây là lựa chọn thiết kế để duyệt, không phải thông tin đã xác minh về phiên bản/provider đang có. Nếu P1 cho thấy VPS không phù hợp, giữ nguyên app/API contracts và lập lại placement/chi phí trước provision. Không tự chuyển sang Vercel hoặc mua cloud service trong quá trình viết plan.

## Cấu trúc code dự kiến

Gốc: thư mục gốc của repo `english-mini-lms` (repo riêng, tách khỏi `dr-minh-clinic` ngày 22/09/2026; các đường dẫn `apps/english-mini-lms/` trong tài liệu cũ hiểu là gốc repo này). Mọi đường dẫn trong tài liệu đều tương đối từ gốc repo.

```text
english-mini-lms/
  package.json, lockfile, Dockerfile, compose.yaml
  src/app/                       # màn hình và API /api/v1
  src/server/auth/               # session và quyền
  src/server/identity/           # learner và external identities
  src/server/library/            # sources, segments, activities
  src/server/learning/           # sessions, drafts, submissions, progress
  src/server/assessment/         # rubrics, feedback, repeated errors
  src/server/media/              # upload, OCR, audio, streaming
  src/server/jobs/               # queue, lease, retry, outbox
  src/server/integrations/openclaw/ # tools client/transport contract
  src/server/providers/          # giao diện model/STT/OCR
  src/worker/                    # runner, không public listener
  db/migrations/
  tests/{unit,integration,e2e,contracts}/
  scripts/                       # backup, restore, controlled import
docs/                             # plan, journals, hướng dẫn vận hành sau triển khai
content/english-lab/              # nguồn học được phép nhập; không commit file bản quyền
.agents/skills/en-*/SKILL.md      # chỉ tạo ở giai đoạn triển khai được duyệt
.agents/workflows/english-lab-zalo.md
```

Tên endpoint và schema trong plan là hợp đồng mới của LMS. Tên transport/plugin của OpenClaw chưa chốt. Không sửa `openclaw.json` local chỉ để có thêm agent trên giấy; chỉ xuất bản agent/tools vào cấu hình runtime đã xác định đúng, có backup và rollback.

## Luồng điển hình

1. OpenClaw nhận tin, cung cấp danh tính người gửi từ runtime qua kênh tin cậy. Agent đề nghị tạo/tiếp tục phiên bằng tool.
2. LMS kiểm tra credential, actor binding và session; trả activity cùng phần nguồn được phép xem. Chưa trả đáp án bị khóa.
3. Voice/ảnh/text gốc được bridge gắn `input_ref` cùng inbound event/tác giả đã xác minh; tool chỉ nộp reference này, không cho model tự viết body mang tên Minh. Trên web nhận bài trực tiếp từ session của Minh. File qua vùng tạm, kiểm tra loại/kích thước, ghi bền vững rồi transaction tạo submission + job. API chỉ trả `accepted` sau khi dữ liệu thật đã lưu.
4. Worker đọc nguồn/rubric đúng phiên bản, chạy STT/OCR nếu cần, phân tích bài. Dữ liệu không đủ thì trả trạng thái yêu cầu bổ sung; không chấm đoán.
5. Ghi feedback có cấu trúc và sự kiện kết quả trong cùng transaction. Web đọc được ngay; OpenClaw lấy sự kiện qua tool để trả lời trong thread học.
6. Minh sửa bài thành submission mới, liên kết với bản trước. Lỗi lặp và tiến độ chỉ cập nhật từ kết quả hợp lệ, có thể loại bỏ nhận xét bị xác định là sai.

Web tải lên rồi nộp dùng hai bước; file tạm không được coi là bài đã nộp. Quét dọn file mồ côi sau khoảng chờ có cấu hình; không xóa file còn tham chiếu trong submission.

## AI agent và bộ kỹ năng

Một agent học với hồ sơ/memory riêng. Không cấp shell toàn máy, truy cập Myspa/Onehis, dữ liệu bệnh nhân, `docs/index/` hay credential clinic.

| Skill dự kiến | Trách nhiệm | Invariant được LMS kiểm tra |
|---|---|---|
| `en-session-coach` | Onboarding, chọn bài, phân bổ 30/45 phút, giải thích gợi ý | Session còn hiệu lực, đúng người và activity |
| `en-output-gate` | Phân biệt hướng dẫn, bài làm và đánh giá | Feedback phải tham chiếu submission đã lưu; assisted flag server-side |
| `en-speaking-loop` | Tình huống, audio, phản hồi, nói lại | Audio unavailable không có điểm phát âm |
| `en-listening-loop` | Nghe, trả lời, giải thích đoạn khó | Transcript/answer reveal có event; bài đọc transcript không tính nghe độc lập |
| `en-medical-page` | Nêu ý, dịch, đối chiếu trang, dùng thuật ngữ | Chỉ nguồn đã duyệt, không ra quyết định điều trị |
| `en-writing-feedback` | Góp ý, giữ bản đầu và bản sửa | Không ghi đè bản nộp; không tự nộp câu AI viết làm bài Minh |
| `en-ielts-task` | Bài đúng dạng, timer, rubric và giới hạn điểm | Biến thể IELTS/rubric hợp lệ; không tạo điểm chính thức |

Skills là hướng dẫn hành vi. Quyền, idempotency, nguồn, trạng thái và thứ tự bài nộp–feedback phải nằm trong code/API, không chỉ trong prompt. Các skill gọi cùng bộ tools; không cần bảy agent hay bảy nhà cung cấp model.

## Media và nguồn học

- Runtime giữ nguồn thư viện ở `/srv/english-mini-lms/content/english-lab/`; đồng bộ có manifest từ nguồn được duyệt. Index sinh ra nằm trong `/srv/english-mini-lms/private/index/`, không dùng `docs/index/` clinic.
- Bài người học ở `/srv/english-mini-lms/private/artifacts/`; DB là dữ liệu phát sinh phục vụ học tập, không phải nguồn tham khảo để suy diễn y khoa. Không commit voice, bài riêng, tài khoản hoặc source có bản quyền vào Git.
- Trang sách gửi qua Zalo/web trước hết là private upload `pending_review`, chưa phải nguồn học. Qua thao tác curate riêng được cho phép, bản có quyền dùng được đưa vào `content/english-lab/` với manifest/hash/version và approve rồi mới dùng cho bài đọc–dịch. Publisher từ chối source không có provenance từ root này; OCR lỗi phải xác nhận lại. Upload nguồn giữ namespace khác với bài dịch của Minh.
- Giới hạn khởi điểm để test: text 20.000 ký tự; audio 5 phút/20 MB; ảnh 10 MB; PDF 30 MB. Client lẫn server kiểm tra, không tin extension; thay đổi sau thử thiết bị, ghi trong config.
- Voice Zalo không lấy được file: hiện trạng thái thiếu media và cho ghi/upload trên web. Không hạ tiêu chí nghiệm thu speaking thành text-only; phải kiểm chứng đường audio web thật.
- Nghe có thể dùng audio đã duyệt hoặc audio tạo từ kịch bản đã duyệt; phân biệt nguồn người thật/TTS. TTS và rubric IELTS cần kiểm tra chất lượng, không tự gọi chúng là bản chuẩn thi.

## Định danh và quyền

Tạo trước một tài khoản học viên, tài khoản quản trị tách riêng. Invite/binding có thời hạn và dùng một lần; không public signup, không cấp admin theo số điện thoại. Admin hỗ trợ chỉ được xem bài trong phạm vi Minh đồng ý; audit mọi sửa feedback hoặc xuất dữ liệu.

Zalo binding dùng issuer/channel/account/external subject của OpenClaw đã xác minh. Model không được điền `learner_id` hay quyền tự do rồi backend tin ngay. Service credential xác thực caller, không chứng minh người gửi là Minh. Nếu runtime chưa cấp trusted context, P1 chọn cách lấy metadata đã xác minh qua extension runtime phù hợp; chưa lấy được verified subject thì chặn mutation Zalo. Thread ID/tên hiển thị hoặc credential riêng không đủ để thay thế xác minh danh tính.

Trình duyệt dùng session cookie `HttpOnly`, `Secure`, CSRF/origin checks, rate-limit login và session expiry. Có recovery do quản trị thực hiện sau xác minh ngoài luồng; không dùng câu hỏi kiến thức hay tên Zalo để reset tài khoản.

## Bảo vệ dữ liệu đúng phạm vi

Mối quan tâm thực tế là voice, bài làm, lịch sử học và tài liệu có bản quyền. Service account chỉ đọc nguồn LMS và ghi state LMS; không mount toàn repo hoặc dùng `.env` clinic. Worker không có quyền internet tùy ý để tải URL model đưa; media chỉ từ file handle hoặc endpoint OpenClaw allowlist, chặn SSRF/đường dẫn vượt thư mục.

Nội dung tài liệu/bài nộp là dữ liệu, không phải chỉ dẫn tool. Model chỉ được nhận đoạn liên quan và output schema cho phép. Không đưa secret/định danh kênh thô vào prompt. Feedback hiển thị được sanitize; request/log chỉ dùng IDs và số liệu, không lưu toàn bài.

## Ranh giới release

Mốc demo một mode đầu-cuối giúp kiểm tra thiết kế; MVP chỉ hoàn tất khi cả năm mode, bốn kỹ năng, web, tích hợp OpenClaw, backup/restore và nguồn/rubric đều qua nghiệm thu. Nếu một phần chưa đạt, báo là bản thử giới hạn; không xóa scope để gọi hoàn thành.

## Còn mở

Phiên bản stack/auth library/provider; VPS/domain và tài nguyên; giao diện gọi tools và receipt OpenClaw; nguồn học và thời hạn lưu. Giai đoạn 1 phải ghi lựa chọn cụ thể cùng bằng chứng trước khi tạo infrastructure hoặc dependency lock.
