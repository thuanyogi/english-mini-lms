# Hướng dẫn từng bước: tự xây English Mini LMS với Antigravity

Dành cho anh Minh. Mỗi bước có: mục tiêu → việc anh làm tay → prompt dán vào Antigravity → tiêu chí "xong". Làm **đúng một bước mỗi phiên chat**, xong mới sang bước kế.

Tài liệu nền: [lite-mvp-track.md](lite-mvp-track.md) (phạm vi), [product-design.md](product-design.md) (sản phẩm), [AGENTS.md](../../AGENTS.md) và [.agents/rules](../../.agents/rules/english-mini-lms.md) (luật cho agent).

---

## Trước khi bắt đầu — 5 quy tắc vàng khi làm với Antigravity

1. **Luôn để agent lập Implementation Plan trước** (Planning mode). Đọc plan, sửa bằng comment inline nếu chưa đúng ý, rồi mới duyệt cho sửa code.
2. **Một phiên = một bước.** Đừng gộp. Hết bước, mở phiên chat mới, gõ `/build-step <số>`.
3. **Không dán API key vào chat.** Key chỉ nằm trong file `.env.local`. Agent cần key thì anh tự mở file và điền.
4. **Tin nhưng kiểm.** Sau mỗi bước, tự mở app trên điện thoại làm đúng luồng ghi ở "tiêu chí xong". Agent báo pass không thay cho anh bấm thử.
5. **Commit sau mỗi bước.** Agent sẽ commit; anh chỉ cần thấy `git log` có dòng mới. Lỡ hỏng → quay lại commit trước.

Từ ngữ Antigravity anh sẽ gặp: **Agent Manager** (màn tổng nơi giao việc), **Editor** (nhìn code), **Artifacts** (Implementation Plan, Task list, Walkthrough, screenshot — anh review ở đây), **Browser subagent** (agent tự mở Chrome để bấm thử web), **Rules/Workflows** (luật và lệnh tắt `/…` trong `.agents/`).

---

## Bước 0 — Chuẩn bị công cụ và tài khoản (làm tay)

### Cài trên máy

| Công cụ | Lấy ở đâu | Kiểm tra |
|---|---|---|
| Antigravity | Đã cài sẵn | Mở được Agent Manager |
| Node.js LTS | nodejs.org (bản LTS) | Terminal: `node -v` ra số phiên bản |
| Git | git-scm.com (macOS thường có sẵn) | `git --version` |
| Google Chrome | Để Browser subagent dùng | — |

### Tài khoản (đều có gói miễn phí)

| Dịch vụ | Dùng để | Lấy gì |
|---|---|---|
| GitHub (github.com) | Lưu code, nối Vercel | Đã có sẵn → tạo repo private **trống** tên `english-mini-lms` |
| Vercel (vercel.com) | Chạy web public | Đã có sẵn → chưa cần làm gì thêm |
| Google AI Studio (aistudio.google.com) | Gemini API key | 1 API key → dán vào `.env.local` sau |
| Supabase (supabase.com) | Database + đăng nhập + lưu file | Tạo project mới, region Singapore; lấy `Project URL`, `anon key`, `service_role key`, `DB connection string` |

> Quyền riêng tư: chọn Supabase/Vercel nghĩa là bài viết và voice của anh lưu trên cloud (mã hoá, chỉ anh đăng nhập được). Nếu anh không muốn, nói với agent ở Bước 1: "dùng Postgres local qua Docker và lưu file trong thư mục ./private" — cách này chỉ dùng được trên máy của anh.

### Mở workspace (repo này đã sẵn sàng)

Repo `english-mini-lms` **đã là dự án độc lập**, tách khỏi repo phòng khám. Trong đó đã có sẵn:

```text
english-mini-lms/
├── AGENTS.md                 # ngữ cảnh dự án cho agent
├── .agents/rules/english-mini-lms.md     # luật bắt buộc
├── .agents/workflows/build-step.md, verify.md   # lệnh /build-step, /verify
├── docs/plan/                # toàn bộ plan (file này, lite-mvp-track, product-design, phase-01..08…)
├── docs/journals/            # nhật ký làm việc
└── content/english-lab/      # nguồn học: README, activities-inventory, manifest.example.yaml
```

Lấy repo về máy: mở Antigravity → trang chủ chọn **Clone Git Repository** → dán `https://github.com/thuanyogi/english-mini-lms.git` → Antigravity tự tải và mở workspace (chi tiết: [huong-dan-tu-build-anh-minh.md](huong-dan-tu-build-anh-minh.md) mục 3.3).

Trong workspace đã mở: vào `…` → Customizations → kiểm tra thấy rule `english-mini-lms` và 2 workflow `/build-step`, `/verify`.

> Không mở workspace `dr-minh-clinic` để build LMS: agent sẽ nhìn thấy luật, dữ liệu và secret của phòng khám — vi phạm ranh giới dữ liệu của plan.

**Xong khi:** `node -v`, `git --version` chạy; có 4 tài khoản; workspace mở trong Antigravity và thấy rules/workflows.

---

## Bước 1 — Khung app, database, đăng nhập

**Mục tiêu:** app Next.js chạy local, đăng nhập bằng email (magic link), database có bảng nền.

**Anh làm tay trước:** tạo file `.env.local` trong thư mục app với nội dung (điền giá trị thật từ Supabase/AI Studio):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
GEMINI_API_KEY=
```

**Prompt dán vào Antigravity:**

```
/build-step 1
Bối cảnh: tôi là bác sĩ, không phải lập trình viên. Hãy scaffold app theo stack trong AGENTS.md (Next.js App Router + TypeScript + Tailwind + shadcn/ui + Supabase + Drizzle). Yêu cầu:
- Đăng nhập Supabase Auth bằng email magic link; chỉ 1 người dùng; tắt public signup sau khi tôi đăng ký lần đầu (hướng dẫn tôi bật/tắt trong Supabase dashboard).
- Schema Drizzle cho các bảng nền theo docs/plan/lite-mvp-track.md mục "Data model Lite": learners, sources, source_segments, activities, learning_sessions, session_events, drafts, media_objects, submissions, assessments, feedback_versions, error_observations, vocabulary_vault, vocabulary_reviews, usage_events. Bật RLS với policy auth.uid() = user_id cho bảng có dữ liệu người học.
- Trang /login, /today (placeholder "Xin chào"), layout mobile-first có thanh điều hướng dưới: Hôm nay · Thư viện · Học · Sổ từ · Tiến độ.
- Scripts: dev, lint, typecheck, test (vitest), build, db:migrate, seed (placeholder).
- .env.example với giá trị giả; kiểm tra .env.local đã trong .gitignore.
Lập Implementation Plan trước, chờ tôi duyệt.
```

**Xong khi:**
- `npm run dev` → mở `http://localhost:3000` trên máy và trên điện thoại (cùng wifi, dùng IP máy) → đăng nhập bằng email → thấy trang Hôm nay.
- Supabase dashboard → Table Editor thấy đủ bảng.
- `/verify` pass; `git log` có commit bước 1.

---

## Bước 2 — Thư viện và nạp nội dung

**Mục tiêu:** đọc `content/english-lab/manifest.yaml` → DB; trang Thư viện hiện activity theo mode.

**Anh làm tay trước:** trong `content/english-lab/`, copy `manifest.example.yaml` thành `manifest.yaml`. Viết thật ít nhất 3 activity `approved`: **W1** (đề email hội nghị — tự soạn đề 3–4 dòng vào `texts/w1-conference-email-prompt.md`), **R1** (gõ 1 đoạn ~150 từ từ sổ tay siêu âm + số trang vào `texts/r1-ultrasound-p42.md`), **S1** (đề giới thiệu bản thân). L1 để `draft` nếu chưa có video.

**Prompt:**

```
/build-step 2
Viết scripts/seed.ts đọc content/english-lab/manifest.yaml (schema như manifest.example.yaml), nạp sources/segments/activities vào DB, chỉ nạp review_state=approved, chạy lại nhiều lần không tạo trùng (upsert theo id). Đọc file texts/, transcripts/, rubrics/ tương ứng. Thiếu file → báo lỗi rõ tên activity, không nạp nửa chừng.
Trang /library: danh sách activity nhóm theo mode, hiện tiêu đề, thời lượng, mục tiêu; lọc theo mode. Activity chưa approved không hiện. Không bao giờ trả answer key/questions đáp án ra client ở trang này.
Trang /library/[id]: chi tiết + nút "Bắt đầu 30 phút" / "Bắt đầu 45 phút" (chưa cần hoạt động, bước 3 làm).
```

**Xong khi:** `npm run seed` báo nạp 3 activity; Thư viện trên điện thoại hiện W1, R1, S1; sửa tiêu đề trong manifest → seed lại → đổi theo, không nhân đôi.

---

## Bước 3 — Writing mode chạy trọn vòng ⭐ mốc quan trọng nhất

**Mục tiêu:** chọn W1 → viết → nộp → Gemini chấm có cấu trúc → xem góp ý → viết bản 2 → so sánh 2 bản.

**Prompt:**

```
/build-step 3
Làm luồng writing end-to-end theo docs/plan/product-design.md và luật trong .agents/rules:
1. POST /api/v1/sessions: tạo learning_session (activity_id, target_minutes 30/45, status active). Trang /learn/[sessionId] hiện đề bài, ô soạn thảo, bộ đếm thời gian còn lại, nút "Xin gợi ý" (ghi session_event kind=hint), "Lưu nháp" (drafts, optimistic version), "Nộp bài".
2. POST /api/v1/sessions/[id]/submissions: INSERT submissions (immutable, revision n, parent_id nếu là bản sửa), tính assisted từ session_events (có reveal trước nộp → true), tạo assessments status=queued, rồi gọi Gemini ngay trong request (timeout 60s) → feedback_versions. Lỗi/timeout → assessments.status=failed và nút "Chấm lại".
3. src/server/providers/gemini.ts: một hàm evaluateWriting(prompt, rubric, submissionText) trả JSON đúng schema: { observations:[{location, original, issue, suggestion, example, retry_prompt}], strengths:[], next_action, limitations, scores:[{kind:"practice_estimate", dimension, value, note}] }. Dùng responseSchema/structured output của Gemini; validate bằng zod; JSON sai → retry 1 lần rồi failed. Không có trường official band.
4. Trang /my-work/[submissionId]: hiện bài, feedback theo từng observation (bôi màu vị trí), nút "Viết bản sửa" → mở lại editor với parent_id. Bản 2 hiện cạnh bản 1 và feedback tương ứng.
5. Test vitest: (a) sửa bài tạo bản mới, bản cũ không đổi; (b) có reveal trước nộp → assisted=true; (c) JSON Gemini sai schema không được ghi thành feedback.
Ghi usage_events (token in/out) mỗi lần gọi Gemini.
```

**Xong khi:** trên điện thoại, anh viết thật email W1 → nộp → trong ~30s thấy góp ý có vị trí câu, lý do, cách sửa, ví dụ → bấm "Viết bản sửa" → nộp bản 2 → thấy 2 bản cạnh nhau. Bấm "Xem gợi ý đáp án" trước nộp ở một bài khác → bài đó gắn nhãn "Có hỗ trợ".

> Nếu góp ý của Gemini chung chung hoặc sai: đây là lúc chỉnh **prompt chấm**, không phải code. Nói với agent: "Feedback đang [mô tả vấn đề]. Sửa prompt trong gemini.ts để [yêu cầu cụ thể], giữ schema."

---

## Bước 4 — Đọc–dịch y khoa + Sổ từ vựng

**Mục tiêu:** đọc đoạn R1, dịch, được đối chiếu theo vị trí; bôi đen cụm từ → popup → "Lưu vào sổ" 1 chạm.

**Prompt:**

```
/build-step 4
1. Reading mode trên /learn/[sessionId] khi activity.mode=reading: cột đoạn gốc (từ source_segments, hiện trang/nguồn), ô "Ý chính" + ô "Bản dịch" + ô "3 thuật ngữ tự giải thích". Nộp → evaluateReading(segmentText, submission): góp ý về độ trung thành với đoạn gốc, vị trí bỏ sót/sai nghĩa, cách diễn đạt tiếng Việt; tuyệt đối không nhận xét y khoa hay khuyến nghị điều trị (ghi vào system prompt và limitations).
2. Vocabulary Vault: bôi đen văn bản trong đoạn gốc → popup gọi POST /api/v1/vocabulary/quick-capture (selected_text, surrounding_sentence, source_ref) → Gemini trả { phrase, ipa, context_meaning (chuyên ngành cơ xương khớp nếu phù hợp), example_sentence } → nút "Lưu vào sổ" → POST /api/v1/vocabulary lưu tuple đủ: phrase, ipa, context_meaning, original_sentence, source_ref, my_attempt (rỗng lúc đầu), mastery_level=0, due_at=now+1 ngày.
3. Trang /vocab: danh sách theo ngày, lọc "đến hạn", "đã thuộc"; mở 1 từ thấy câu gốc + nguồn + ô "Câu của tôi" (lưu vào my_attempt).
4. Test: quick-capture không được lưu khi thiếu original_sentence.
```

**Xong khi:** dịch R1 trên điện thoại → nhận góp ý chỉ đúng chỗ sai; bôi đen "degenerative disc disease" → popup có IPA + nghĩa + ví dụ → lưu → xuất hiện trong Sổ từ.

---

## Bước 5 — Speaking (audio thật) + Listening/Shadowing

**Mục tiêu:** ghi âm trên điện thoại → upload → Gemini nghe → transcript + tối đa 3 góp ý → nói lại. Nghe đoạn video theo mốc giây → trả lời trước → mở transcript.

**Anh làm tay trước:** chọn 1 video YouTube hội nghị có phụ đề chuẩn, xác định `video_id`, mốc bắt đầu/kết thúc 60s, gõ transcript đoạn đó vào `content/english-lab/transcripts/l1-….txt` (mỗi dòng `giây_bắt_đầu|giây_kết_thúc|câu`), viết 3 câu hỏi + đáp án vào `texts/l1-questions.yaml`. Đổi L1 thành `approved`, seed lại.

**Prompt:**

```
/build-step 5
A. Speaking (activity.mode=speaking):
- Recorder trên trình duyệt (MediaRecorder, webm/mp4 tuỳ thiết bị), nút ghi/dừng/nghe lại/xoá trước khi nộp; hiển thị thời lượng; giới hạn 5 phút.
- Upload 2 bước: POST /api/v1/media → Supabase Storage bucket private "learner-media", media_objects status pending→ready sau khi kiểm MIME/kích thước server-side. Nộp chỉ nhận media_id đã ready.
- evaluateSpeaking(audioFile, prompt): gửi audio trực tiếp cho Gemini (audio input) → { transcript, transcript_confidence, observations (≤3, ưu tiên), pronunciation: {status: "assessed"|"not_assessable", notes}, retry_prompt }. Không có audio → pronunciation.status=not_assessable bắt buộc. Transcript hiển thị cho tôi xác nhận/sửa trước khi lưu làm bằng chứng.
- Nút "Nói lại" tạo revision mới; hai bản ghi và feedback hiện cạnh nhau, nghe lại được (signed URL 10 phút).
B. Listening/Shadowing (activity.mode=listening):
- Nhúng YouTube IFrame Player API, phát đúng start_seconds→end_seconds, nút nghe lại đoạn, tốc độ 0.75/1.0.
- Câu hỏi hiện trước; transcript và đáp án KHOÁ đến khi nộp (answer_reveal=after_submit); mở transcript trước nộp → session_event reveal → assisted.
- Sau nộp: chấm câu đóng theo đáp án, chỉ ra câu/giây gây nhầm; tab Shadowing: từng câu transcript + nút ghi âm câu đó → evaluateSpeaking bám theo verified_transcript.
- Video không cho nhúng → hiện link mở tab mới, vẫn cho làm câu hỏi.
C. Test: nộp speaking không có media → 422; feedback speaking từ text-only → not_assessable.
```

**Xong khi:** trên điện thoại, ghi âm S1 60s → nộp → thấy transcript đúng ~90% → ≤3 góp ý → nói lại → 2 bản cạnh nhau. Nghe L1 → trả lời 3 câu trước → nộp → thấy đúng/sai và đoạn nhầm → shadowing 1 câu có nhận xét.

> Nếu ghi âm không chạy trong trình duyệt Zalo: mở bằng Safari/Chrome. Agent nên hiện hướng dẫn này khi phát hiện in-app browser.

---

## Bước 6 — Hôm nay, Tiến độ, ôn từ theo lịch

**Prompt:**

```
/build-step 6
1. Trang /today: chọn 30/45 phút → gợi ý theo quy tắc giải thích được (docs/plan/product-design.md mục "Onboarding và điều chỉnh lộ trình"): (a) bài đang dở/cần sửa, (b) từ vựng đến hạn, (c) kỹ năng ít luyện 7 ngày, (d) khớp thời lượng. Hiện lý do gợi ý, nút "Đổi bài". Ở phút 30/45 hiện đề nghị lưu/khép phiên, tự pause; không xoá nháp.
2. Ôn từ: /vocab/review lấy vocabulary_vault due_at<=now (tối đa 5) → mỗi từ 1 thử thách ngắn "dùng từ này trong 1 câu về [ngữ cảnh công việc]" (text hoặc voice) → Gemini nhận xét cách dùng → ghi vocabulary_reviews, cập nhật due_at theo lịch 1→3→7→14 ngày (đúng: bước tiếp; sai: về 1 ngày), mastery_level.
3. /progress: số phiên/tuần, phút thực học, bài theo kỹ năng, tách "độc lập" và "có hỗ trợ", lỗi lặp (error_observations nhóm theo category), từ đã thuộc, danh sách bài có bản sửa để so sánh. Không vẽ "band ước tính". Ít dữ liệu → hiện "chưa đủ bằng chứng".
4. Onboarding lần đầu (/onboarding): mục tiêu ưu tiên, tự đánh giá 4 kỹ năng, bối cảnh công việc, IELTS Academic/General (cho phép bỏ trống), sách đang đọc, giờ học quen. Lưu vào learners.
```

**Xong khi:** mở app buổi sáng → Hôm nay đưa 1 gợi ý có lý do → làm → ôn 3 từ đến hạn → Tiến độ cập nhật; bài "có hỗ trợ" nằm riêng.

---

## Bước 7 — Đưa lên mạng, backup

**Anh làm tay:** push repo lên GitHub (agent hướng dẫn lệnh); vào Vercel → Import repo → thêm đúng 5 biến môi trường như `.env.local` → Deploy. Trong Supabase → Authentication → URL Configuration → thêm domain Vercel vào Redirect URLs.

**Prompt:**

```
/build-step 7
1. Chuẩn bị deploy Vercel: next.config đúng, kiểm tra route gọi Gemini với audio có kịp giới hạn thời gian của Vercel (nếu không, chuyển sang streaming hoặc chia nhỏ); hướng dẫn tôi từng bước nhập env trên Vercel bằng lời, không in giá trị.
2. PWA tối thiểu: manifest.json, icon, "Add to Home Screen"; chỉ cache app shell, không cache audio/bài.
3. Backup: scripts/backup.sh dùng pg_dump (DATABASE_URL) + tải bucket learner-media về ./backups/YYYY-MM-DD/ (gitignore). Viết docs/RUNBOOK.md: cách chạy backup hàng tuần, cách restore, cách đổi API key, cách xem chi phí Gemini tháng này từ usage_events.
4. Trang /settings: xuất dữ liệu của tôi (JSON + link file), xoá bài theo yêu cầu (soft delete + xoá file), tắt/bật nhắc học (mặc định tắt), đăng xuất.
5. /admin (chỉ role admin): danh sách activity + review_state, assessments failed + nút chấm lại, tổng token tháng.
```

**Xong khi:** mở domain Vercel trên điện thoại → thêm vào màn hình chính → đăng nhập → làm 1 bài trọn vòng. `./scripts/backup.sh` tạo được thư mục backup. Tài khoản Google thứ 2 đăng nhập không thấy bài của anh (RLS).

---

## Bước 8 — Pilot 4 tuần (học thật)

Không có prompt lớn. Theo [phase-08](phase-08-pilot-and-handover.md) rút gọn:

- **Tuần 1:** onboarding + baseline: W1, R1, S1, L1 (mỗi bài 1 phiên).
- **Tuần 2–3:** học theo gợi ý Hôm nay; mỗi tuần thêm 2–3 activity mới vào manifest (mục tiêu đến hết pilot ≥ 12 activity).
- **Tuần 4:** làm W4, R4, S4, L4 (biến thể tương đương) → so sánh với tuần 1 trên trang Tiến độ.
- **Mỗi cuối tuần** mở Antigravity 1 phiên ngắn: "Tuần này tôi thấy [vấn đề]. Sửa [cụ thể]." Ưu tiên chất lượng feedback và độ mượt trên điện thoại hơn tính năng mới.
- Ghi chi phí Gemini/tuần từ /admin; nếu vượt ngân sách anh đặt → giảm độ dài prompt hoặc số lần chấm lại.

**Kết thúc pilot:** trả lời 3 câu — có hữu ích không, bài tuần 4 tốt hơn tuần 1 ở chỗ nào (có bằng chứng), tiếp tục/chỉnh/dừng.

---

## Bước 9 (v2, tuỳ chọn) — IELTS timed + Zalo/OpenClaw

Khi Lite ổn, quay lại plan gốc:

- IELTS: [phase-04](phase-04-ai-learning-modes.md) mục IELTS gate — cần đề/rubric có nguồn được duyệt, timer chốt bản, không tự gán band.
- Zalo: [phase-01](phase-01-discovery-and-contracts.md) probe OpenClaw → [phase-06](phase-06-openclaw-integration.md) tools. Cần người vận hành OpenClaw; anh không nên tự làm phần này một mình.
- Vận hành chuẩn: [phase-07](phase-07-verification-and-deployment.md).

---

## Xử lý tình huống thường gặp

| Tình huống | Làm gì |
|---|---|
| Agent sửa lung tung ngoài phạm vi bước | Từ chối plan, viết comment "chỉ làm mục X, Y trong bước N". Nếu đã sửa: `git checkout .` để bỏ, hoặc quay về commit trước |
| Agent hỏi API key | Không dán. Trả lời: "Đã có trong .env.local, đọc tên biến từ .env.example" |
| Lệnh `npm run dev` lỗi | Copy nguyên lỗi dán vào chat: "Lỗi này là gì, sửa nguyên nhân gốc, không tắt kiểm tra" |
| Gemini trả JSON sai/chậm | Bảo agent kiểm tra model đang dùng hỗ trợ structured output & audio; thử model flash mới hơn; tăng timeout hợp lý |
| Điện thoại không ghi âm được | Dùng Safari/Chrome thay trình duyệt trong Zalo; kiểm tra site là https |
| Muốn thêm tính năng mới giữa chừng | Ghi vào `docs/plan/backlog.md`, làm sau khi hết bước hiện tại |
| Phiên chat quá dài, agent "quên" | Mở phiên mới; `/build-step N` sẽ đọc lại tài liệu |
| Không chắc agent làm đúng | Gõ `/verify` và yêu cầu Browser subagent quay video luồng chính; xem artifact |

## Checklist nghiệm thu Lite (đánh ✅ khi tự tay làm được trên điện thoại)

- [ ] Đăng nhập; Hôm nay gợi ý có lý do; chọn 30/45 phút
- [ ] Writing: viết → nộp → góp ý có vị trí → bản sửa cạnh bản đầu
- [ ] Đọc–dịch: góp ý chỉ đúng vị trí, không nhận xét y khoa
- [ ] Bôi đen → lưu từ 1 chạm; ôn từ đến hạn có thử thách
- [ ] Speaking: ghi âm → transcript xác nhận → ≤3 góp ý → nói lại
- [ ] Listening: trả lời trước → mở transcript sau; shadowing 1 câu
- [ ] Xem đáp án trước nộp → gắn "Có hỗ trợ", Tiến độ tách riêng
- [ ] Speaking text-only → "không đánh giá được phát âm"
- [ ] Tài khoản khác không đọc được bài của anh
- [ ] Đã chạy backup 1 lần và biết chỗ file
- [ ] `.env.local` không có trong GitHub
