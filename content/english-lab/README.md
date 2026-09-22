# english-lab — nguồn học tiếng Anh cho English Mini LMS

Thư mục này là **nguồn học duy nhất** của LMS theo [plan](../../docs/plan/plan.md). Không dùng dữ liệu clinic, bệnh nhân, hay `docs/index/` cho LMS.

## Cấu trúc

```text
content/english-lab/             # (repo english-mini-lms)
├── README.md                    # file này
├── activities-inventory.md      # 24 slot hoạt động, trạng thái ready/not-ready
├── manifest.example.yaml        # mẫu khai báo 1 activity + nguồn
├── manifest.yaml                # (tạo khi có nội dung thật) — script seed đọc file này
├── texts/                       # đoạn đọc–dịch, đề writing (markdown/txt)
├── audio/                       # audio nghe đã có quyền dùng (mp3/m4a) — không commit file bản quyền
├── transcripts/                 # transcript đã kiểm duyệt cho listening/shadowing
└── rubrics/                     # rubric chấm (yaml/json), có nguồn và phiên bản
```

## Quy tắc

- Mỗi activity phải có: mục tiêu, mode, nguồn/locator, thời lượng, đầu ra, hướng dẫn phản hồi, đáp án/rubric nếu cần.
- Nguồn bản quyền (sách, đề IELTS thật): chỉ lưu **metadata + locator** (tên sách, trang, link + mốc giây); không copy nội dung dài vào repo. Với video YouTube: lưu `video_id`, `start_seconds`, `end_seconds`, `verified_transcript` do người duyệt gõ/kiểm.
- Trích đoạn ngắn để luyện dịch (≤ 1 đoạn/trang) đặt trong `texts/` kèm `source_ref` rõ ràng.
- `review_state`: `draft → reviewing → approved`. Chỉ `approved` được seed vào DB cho học thật.
- Thiếu nguồn → để `not_ready`; không tự bịa nội dung gắn nhãn "đề thi chính thức".
- `.gitignore` của repo đã chặn `content/english-lab/**/*.{pdf,mp3,m4a,wav,mp4}`; file bản quyền chỉ nằm trên máy, không lên GitHub.

## Ai làm gì

- **Anh Minh**: chọn sách/chương, video, chủ đề hội nghị; xác nhận quyền dùng; duyệt transcript.
- **Người biên tập / Antigravity**: điền `manifest.yaml`, tách đoạn, viết yêu cầu bài và rubric nháp để anh Minh duyệt.
