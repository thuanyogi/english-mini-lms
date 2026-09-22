---
title: Rà soát plan English Mini LMS, bổ sung Lite Track và hướng dẫn Antigravity
date: 2026-09-22
summary: "Đánh giá bộ plan 15 file: thiết kế đủ nhưng lệch đối tượng (đội dev vs anh Minh tự xây). Bổ sung Lite MVP Track, starter kit Antigravity, thư mục nguồn english-lab, hướng dẫn 9 bước."
---

# Rà soát plan English Mini LMS, bổ sung Lite Track và hướng dẫn Antigravity

## What happened

- Đọc toàn bộ `plans/260919-1141-english-mini-lms/` (plan, 8 phase, product/tech/contract/ops, reports, research).
- Kết luận: plan đủ và chất lượng cho đội kỹ thuật; **không phù hợp để anh Minh tự xây bằng Antigravity** (180–248h, worker/outbox/deletion ledger/OpenClaw trusted tuple). `content/english-lab/`, `apps/`, `docs/english-mini-lms/` đều chưa tồn tại.
- Bổ sung, không sửa phase gốc:
  - `reports/plan-readiness-check-2026-09-22.md` — đánh giá OK/thiếu/bổ sung.
  - `lite-mvp-track.md` — D11: web-first, Supabase + Gemini + Vercel (hoặc Postgres local), không worker/Zalo; giữ 8 invariant; ước lượng 35–55h.
  - `content/english-lab/` — README, `activities-inventory.md` (24 slot, 6 slot ⭐ cho Lite), `manifest.example.yaml`.
  - `antigravity-starter-kit/` — `AGENTS.md`, `rules/english-mini-lms.md`, `workflows/build-step.md`, `workflows/verify.md` (Antigravity đọc `.agents/rules|workflows`).
  - `huong-dan-xay-dung-voi-antigravity.md` — 9 bước, prompt dán sẵn, tiêu chí xong, xử lý sự cố, checklist nghiệm thu.
  - `plan.md` thêm mục nhánh Lite; `evidence-and-decisions.md` thêm D11.

## Decision

- Lite là nhánh đi trước, P1–P8 là đích v2; schema Lite là tập con additive của contract gốc.
- Không tạo `apps/`, không chạy code, không commit trong lượt này.

## Next steps

- Anh Minh chọn cloud vs local, duyệt ngân sách Gemini, chốt IELTS Academic/General.
- Anh Minh điền 3 activity đầu (W1, R1, S1) vào `manifest.yaml` rồi bắt đầu Bước 0–1.

## Câu hỏi tồn đọng

- Anh Minh có chấp nhận lưu voice/bài trên Supabase/Vercel không?
- Ai hỗ trợ kỹ thuật khi anh Minh kẹt ở Bước 5 (audio) hoặc Bước 7 (deploy)?
- Có làm Zalo/OpenClaw ở v2 không, hay web đủ?

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.

## Bổ sung cùng ngày — tách repo

- Theo quyết định người đặt dự án: **tách toàn bộ LMS thành repo riêng** `english-mini-lms` (di chuyển hẳn, không giữ bản copy). Lý do: cô lập dữ liệu/secret phòng khám khỏi workspace Antigravity của anh Minh; khác stack, người làm, vòng đời deploy.
- Ánh xạ: `plans/260919-1141-english-mini-lms/` → `docs/plan/`; `antigravity-starter-kit/` → `AGENTS.md` + `.agents/rules|workflows/` (vị trí thật); `docs/sources/english-lab/` → `content/english-lab/`; 2 journal LMS → `docs/journals/`. Đường dẫn trong phase files đã đổi `apps/english-mini-lms/` → gốc repo.
- Repo `dr-minh-clinic` chỉ còn file pointer `plans/english-mini-lms-MOVED.md`.
