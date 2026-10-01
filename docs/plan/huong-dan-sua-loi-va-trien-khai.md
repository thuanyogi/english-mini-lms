# Sửa lỗi & đưa app vào chạy thật — English Mini LMS

Anh Minh ơi, app đã build xong phần lớn nhưng khi rà soát lại kỹ thì có một số lỗi làm luồng học chưa chạy trọn được (nộp bài speaking bị lỗi, trang Hôm nay chưa tạo được phiên, phút học chưa được đếm...). Tài liệu này hướng dẫn sửa từng bước rồi deploy + pilot.

Cách làm y hệt như khi build: **mỗi phiên chat Antigravity làm đúng 1 bước**, dán prompt, đọc Implementation Plan rồi mới duyệt, xong thì tự kiểm tay trên điện thoại theo mục "Xong khi".

---

# PHẦN 1 — SỬA LỖI

## Trước tiên: trả lời 3 câu hỏi nhỏ (chỉ làm 1 lần)

| # | Câu hỏi | Gợi ý của tôi (chọn cái này nếu anh không có ý kiến khác) |
|---|---|---|
| 1 | Phần transcript bài nói anh tự sửa sau khi nộp — có được phép sửa thẳng bài đã nộp không? | **Không** — lưu transcript đã sửa vào một chỗ riêng, bài gốc giữ nguyên (đúng nguyên tắc "bài nộp không bị ghi đè") |
| 2 | Nhịp ôn từ vựng: tài liệu viết 1-3-7-14 ngày, code đang dùng 1-3-7-14-30 ngày? | Giữ **1-3-7-14-30** (như code), sửa tài liệu cho khớp |
| 3 | Khi ôn từ mà trả lời "tạm được" (dùng đúng nhưng chưa tự nhiên): tính đúng hay sai? | **Tạm đạt** — từ không bị reset về ôn lại ngay ngày mai, nhưng cũng chưa được nhảy mốc |

Nếu đồng ý gợi ý thì cứ dán prompt nguyên văn; muốn khác thì sửa dòng "Quyết định đã chốt" trong prompt tương ứng.

## Vá 1 — Nộp bài nói + nút "Bắt đầu" ở trang Hôm nay

**Mục tiêu:** nộp bài speaking/shadowing qua app thành công; bấm "Bắt đầu" tạo được phiên học; chọn 45 phút thì app nhớ đúng 45 phút.

**Prompt dán vào Antigravity:**

```
Sửa các lỗi sai khớp giữa API và giao diện (contract mismatch) — đúng các chỗ sau, không mở rộng phạm vi:

1. src/app/api/v1/media/route.ts trả { media_id: media.id } nhưng client đọc mediaData.mediaId
   → src/app/(main)/learn/[sessionId]/speaking-session-view.tsx:150,160 và
     src/app/(main)/learn/[sessionId]/listening-session-view.tsx:219,228 luôn throw.
   Sửa client đọc media_id (giữ API snake_case nhất quán với submissions body).

2. src/app/(main)/today/today-view.tsx:
   - Dòng ~53: GET /api/v1/today gửi ?target_minutes= nhưng route.ts đọc targetMinutes → sửa param cho khớp.
   - Dòng ~97-105: POST /api/v1/sessions gửi { activity_id, target_minutes } nhưng schema zod
     nhận { activityId, targetMinutes }; response đọc data.session.id nhưng API trả { sessionId }.
     → sửa client dùng camelCase + đọc sessionId.
   - Đồng bộ resume: client đọc data.activeDraftSessionId nhưng today service trả
     recommendedActivity.sessionId + actionType="continue_draft". Sửa client dùng đúng field
     (ưu tiên continue_draft → đi thẳng /learn/[sessionId]).

3. POST /api/v1/sessions: siết zod targetMinutes chỉ nhận 30 hoặc 45.

Lập Implementation Plan trước, chờ tôi duyệt. Sau sửa chạy npm run typecheck + lint.
```

**Xong khi (kiểm trên điện thoại):** /today chọn 45 phút → "Bắt đầu" vào được bài học (không báo lỗi); ghi âm bài S1 → nộp → không lỗi.

## Vá 2 — Đếm phút học + bài nộp không bị sửa + giấu transcript

**Mục tiêu:** app đếm được phút học thật; bài đã nộp không sửa được nội dung; transcript bài nghe chỉ hiện sau khi anh nộp/bấm xem.

**Prompt:**

```
Sửa 4 vấn đề sau. Quyết định đã chốt: KHÔNG update submissions.body; transcript người học xác
nhận lưu cột riêng confirmed_transcript (migration additive).

1. Vòng đời phiên: learning_sessions.status mãi "active", activeSeconds luôn 0, không event
   pause/resume/finish → /progress "phút thực học" = 0, /today gợi ý nhầm bài đã nộp.
   - Client 4 session view: ghi event finish khi nộp bài thành công và khi "Lưu nháp & khép phiên";
     pause khi wrap-up modal mở (hết giờ), resume khi "Học thêm 5 phút".
   - Server recordSessionEvent: finish → status="completed"; pause/resume → tích activeSeconds
     theo delta event_at. Tạo submission thành công cũng set status completed.
   - Verify sessionId thuộc learner trong events/drafts routes (hiện thiếu).

2. Append-only: PATCH /api/v1/submissions/[id] đang UPDATE body mọi mode.
   - Migration additive: thêm submissions.confirmed_transcript text nullable.
   - PATCH chỉ chấp nhận confirmed_transcript và chỉ khi modality=audio; gỡ update body.
   - my-work-view.tsx: chỗ "sửa transcript" gọi PATCH với confirmed_transcript.
   - learning/service.ts:311-316 đang UPDATE body=transcript → đổi: transcript AI lưu vào
     feedback_versions.rubric_snapshot (hoặc confirmed_transcript NULL tới khi user xác nhận),
     không đụng body sau insert.

3. Khoá transcript listening bằng data: learning/service.ts:833-875 getSessionDetails trả
   transcriptSegments vô điều kiện → chỉ trả khi isTranscriptRevealed=true HOẶC session đã có
   submission. listening-session-view.tsx:144-146: chỉ setIsRevealed(true) khi POST reveal thành công.

4. Regex đáp án đúng: listening-session-view.tsx:270 /Đáp án đúng là ([A-Za-z])/ không khớp
   "Đáp án đúng là (B)" → /Đáp án đúng là \(([A-Za-z])\)/.

5. Test vitest: finish → status completed + activeSeconds>0; PATCH body bài writing → 422;
   getSessionDetails trước nộp không chứa transcriptSegments.

Lập Implementation Plan trước, chờ tôi duyệt.
```

**Xong khi:** làm 1 bài writing 30 phút → nộp → /progress hiện phút học > 0; /today không gợi ý lại bài vừa nộp; làm bài nghe L1 mở DevTools (F12 → tab Network) không thấy transcript trước khi nộp; sửa transcript bài nói lưu được còn nội dung bài viết thì không sửa được.

## Vá 3 — Cài app lên màn hình điện thoại (PWA) + sửa lỗi database

**Mục tiêu:** Add to Home Screen hoạt động và có icon; lệnh migrate tạo đủ cột; `npm run build` chạy được kể cả khi thiếu file env.

**Prompt:**

```
Sửa các lỗi hạ tầng sau:

1. public/icons/ không tồn tại → manifest trỏ icon-192.svg, icon-512.svg đều 404 và sw.js
   cache.addAll reject → PWA chết. Tạo 2 icon đơn giản (chữ "E", màu nền brand); nếu manifest đòi
   PNG thì đổi manifest sang svg purpose "any maskable" hoặc xuất PNG.

2. src/db/schema.ts có submissions.deleted_at nhưng file migration 0000 thiếu cột này →
   chạy drizzle-kit generate ra migration additive mới 0001_* (KHÔNG sửa file 0000).
   - .gitignore có dòng "*.sql" sẽ nuốt migration tương lai → đổi thành "backups/*.sql" và thêm
     "!src/db/migrations/**/*.sql" + "!supabase/migrations/**/*.sql"; đảm bảo file 0001 được git add.

3. npm run build fail khi không có DATABASE_URL: src/db/index.ts throw ngay lúc import → lazy init,
   chỉ tạo postgres client khi được gọi. Build phải pass khi thiếu env.

4. next.config.ts: thêm security headers (X-Content-Type-Options nosniff; X-Frame-Options cân
   nhắc vì còn iframe YouTube — nếu gây lỗi thì bỏ, ghi chú lý do trong code).

Sau sửa: npm run typecheck && npm run lint && npm run build phải xanh KHÔNG cần .env.local.
```

**Xong khi:** `npm run build` chạy thành công trên máy; điện thoại mở web → Add to Home Screen có icon; `git status` thấy file migration mới được track.

## Vá 4 — Gemini không bị "treo" khi chấm + nút Chấm lại an toàn

**Mục tiêu:** bài chấm không kẹt mãi trạng thái "đang chấm"; nút "Chấm lại" chỉ dùng được cho bài lỗi; bài shadowing cũng được tính chi phí.

**Prompt:**

```
Sửa các lỗi quanh tầng Gemini:

1. src/server/providers/gemini.ts không có timeout thật (chỉ có maxDuration=60 ở route): bọc
   callGeminiOnce bằng AbortSignal.timeout(55_000) hoặc Promise.race → throw GEMINI_TIMEOUT →
   service map status=failed. Chuẩn hoá retry-1-lần-chỉ-khi-sai-JSON cho MỌI hàm bằng helper
   callGeminiWithRetry; không retry lỗi mạng/429/timeout.

2. retryAssessment (learning/service.ts ~520-706): chỉ retry khi status failed hoặc processing >10
   phút; status ready → 409; giới hạn runVersion ≤3; dùng media.mimeType thật thay hardcode
   "audio/webm"; truyền lại verifiedTranscript; thêm nhánh listening (đang gọi nhầm
   evaluateWriting); learnerId trong feedback_versions/usage_events lấy theo assessment.learnerId
   không phải người bấm; bỏ qua submission có deletedAt.

3. shadowing/route.ts: ghi usage_events sau evaluateSpeaking (action="evaluate_shadowing").

4. Khi GET chi tiết submission mà assessment processing >10 phút → đánh failed để hiện nút Chấm lại.

Test: mock timeout → failed; retry bài ready → 409; shadowing ghi usage_events.
```

**Xong khi:** bài lỗi mạng lúc chấm chuyển "thất bại" + hiện nút Chấm lại; bài chấm xong không bấm Chấm lại được; /admin thấy chi phí của cả bài shadowing.

## Vá 5 — Ôn từ vựng + thư viện đồng bộ manifest + chặn file quá lớn

**Prompt:**

```
Sửa các lỗi sau. Quyết định đã chốt: giữ nhịp ôn từ 1→3→7→14→30 ngày (theo code), sửa docs/UI cho
khớp; kết quả ôn "partial" (tạm được) tính đạt nhẹ: giữ nguyên mốc, không reset về 1 ngày.

1. vocab-review-view.tsx đọc needs_improvement/naturalnessScore/improvedVersion nhưng API trả
   partial/feedbackNotes/exampleCorrection → đồng bộ type + render feedbackNotes + exampleCorrection.
   vocabulary/service.ts: partial → giữ mastery + interval. Dòng text empty-state (~133) sửa thành
   1→3→7→14→30. submitVocabularyReview chỉ ghi my_attempt khi đang rỗng. Toggle "Giọng nói": đổi
   nhãn "Nhập bằng dictation bàn phím", không ghi response_modality="audio" khi không có audio thật.

2. Seed đồng bộ 2 chiều: manifest đổi approved→draft/retired → cập nhật review_state trong DB
   (gỡ khỏi /library), vẫn fail-fast khi thiếu file. Bỏ fallback hardcode service.ts:329
   (questionsFile → file L1) → thiếu questions_file trên listening = lỗi 422 rõ ràng.
   reading-session-view.tsx:85-95 bỏ hardcode R1/"Trang 42" → segment null hiện "chưa gắn đoạn
   nguồn". Popup chữ vựng (smart-capture): bỏ +window.scrollY ở position fixed, giữ popup luôn
   trong màn hình, chạm ra ngoài để đóng (thêm touchstart).

3. Chặn phía server: media upload check durationSeconds ≤ 300; zod .max(20000) cho drafts.content
   + submissions.body; bài writing bắt buộc có nội dung.

4. src/server/auth.ts:50 — user mới tự động được role "admin" → đổi "learner"; quyền admin set
   tay trong database.

5. docs/RUNBOOK.md (~96-107): câu SQL xem chi phí sai tên cột → sửa theo schema thật: action,
   model_name, token_input, token_output, cost_estimate.

Test: ôn từ trả "partial" giữ mốc; manifest đổi approved→draft → seed → mất khỏi Thư viện;
upload audio 400s → bị từ chối.
```

**Xong khi:** ôn 1 từ trả lời "tạm được" → hiện gợi ý câu hay hơn + từ không bị về ôn ngay ngày mai; đổi L1 thành draft trong manifest → chạy seed → L1 biến khỏi Thư viện; upload audio >5 phút bị chặn; tài khoản mới tạo không phải admin.

## Vá 6 (không bắt buộc — làm sau khi app đã chạy được) — Đẹp và tiện hơn

**Prompt:**

```
1. /my-work: thêm trạng thái "⏳ Đang chờ chấm" khi assessment queued/processing; tab So sánh
   render cả observations của bản 1.
2. Nút "Tôi không đồng ý" trên mỗi nhận xét → đánh review_state="under_review"; /admin hiện
   danh sách nhận xét bị gắn cờ để rà lại.
3. /today: không có bài nào approved → hiện màn hình trống có hướng dẫn (không crash); baseline
   chưa làm → banner mời vào /onboarding.
4. error_observations.category: lấy category thật từ Gemini (grammar/vocabulary/...) thay vì
   ghi nhầm activity.mode; retry không insert trùng.
5. Chặn tạo 2 phiên active trùng cùng một activity (server trả 409 → client hỏi "Tiếp tục phiên
   đang dở?").
6. Tách các file code >200 dòng cho dễ bảo trì, ưu tiên: listening-session-view.tsx (~1100 dòng),
   learning/service.ts (~1050), my-work-view.tsx (~1000), gemini.ts (~740).
```

---

# PHẦN 2 — ĐƯA APP VÀO CHẠY THẬT

Làm theo thứ tự sau khi Vá 1–5 xong.

## Bước 1 — Kiểm tra Supabase (làm tay, ~15 phút)

Vào supabase.com → mở project:

- [ ] **Authentication → Sign In/Up**: tắt "Allow new users to sign up" — **nhưng tắt SAU KHI anh đã đăng ký tài khoản của mình** (nếu không ai có link cũng đăng ký được).
- [ ] **SQL Editor**: copy nguyên file `supabase/migrations/00001_enable_rls.sql` → Run. Kiểm: Table Editor → từng bảng có badge "RLS enabled".
- [ ] **Storage**: bucket `learner-media` tồn tại và **Public = OFF**.
- [ ] Table `submissions` có cột `deleted_at` chưa? Chưa → chạy `npm run db:migrate` (sau Vá 3).
- [ ] Chưa có dữ liệu → `npm run db:migrate` rồi `npm run seed`.

## Bước 2 — Thêm bài học vào thư viện (~1–2 giờ)

Thư viện đang có 4 bài (1 viết, 1 đọc, 1 nói, 1 nghe). Nên có ít nhất 6 bài trước khi pilot.

- [ ] Mở `https://youtube.com/watch?v=M7lc1UVf-VE` xem video bài nghe L1 có đúng nội dung khớp file transcript không; sai → chọn video khác và gõ lại transcript + câu hỏi.
- [ ] Thêm vào `content/english-lab/manifest.yaml`: W2 (bài viết), R2 (đoạn sách y), S2 (tình huống nói). Mỗi bài: tạo file trong `texts/`, đặt `review_state: approved`, chạy `npm run seed`.
- [ ] Chuẩn bị sẵn 4 bài tương đương (W4, R4, S4, L4) làm bài "cuối kỳ" cho tuần 4 pilot — để sẵn nhưng chưa dùng.

## Bước 3 — Deploy lên Vercel (~30 phút)

- [ ] Vercel → Import repo GitHub `thuanyogi/english-mini-lms`.
- [ ] Thêm 5 biến môi trường (copy giá trị từ `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `GEMINI_API_KEY`.
- [ ] Deploy xong → vào Supabase → Authentication → URL Configuration → thêm domain Vercel vào Redirect URLs (để magic link hoạt động).
- [ ] Điện thoại → mở domain → Add to Home Screen → thấy icon; đăng nhập bằng magic link → làm trọn 1 bài writing.
- [ ] **Test bảo mật**: tạo tài khoản thứ 2 (email khác) → đăng nhập → phải KHÔNG thấy bài của anh. (Nếu đã tắt signup thì tạo user tay trong dashboard: Authentication → Users → Add user.)

## Bước 4 — Backup lần đầu (~15 phút)

- [ ] Chạy `./scripts/backup.sh` → tạo thư mục `./backups/<ngày>/` chứa dump database + media. Nếu báo thiếu `pg_dump`: `brew install libpq` rồi chạy lại.
- [ ] Đọc 1 lần mục khôi phục trong `docs/RUNBOOK.md` để biết cách cứu dữ liệu.
- [ ] Đặt nhắc lịch: backup mỗi tuần 1 lần.

## Bước 5 — Pilot 4 tuần (học thật hàng ngày)

| Tuần | Việc |
|---|---|
| 1 | Làm bài onboarding + bài đầu vào: W1, R1, S1, L1 (mỗi bài 1 phiên 30 phút) |
| 2–3 | Mỗi ngày mở Hôm nay làm theo gợi ý; ôn từ đến hạn trong /vocab/review; mỗi tuần thêm 2–3 bài mới vào thư viện |
| 4 | Làm W4, R4, S4, L4 → vào /progress so sánh với tuần 1 |

Cuối mỗi tuần: mở Antigravity 1 phiên ngắn — "Tuần này tôi thấy [vấn đề]. Sửa [cụ thể]." Xem chi phí Gemini ở trang /admin.

**Hết pilot, trả lời 3 câu:** app có hữu ích không · bài tuần 4 tốt hơn tuần 1 ở chỗ nào (nhìn bằng chứng trong /progress, /my-work) · tiếp tục / chỉnh / dừng.

## Bước 6 — Sau pilot (bản mở rộng)

Nếu muốn nâng cấp: nhắn tôi để lên kế hoạch phase tiếp theo (Zalo bot, IELTS bấm giờ chuẩn...). Không tự làm phần này một mình.

## Các rủi ro đã biết & cách xử lý

| Rủi ro | Cách xử lý |
|---|---|
| Bài bị kẹt "đang chấm" khi Gemini chậm | Sau Vá 4 sẽ tự báo lỗi + nút Chấm lại; nếu vẫn gặp → vào /admin bấm Chấm lại |
| Ghi âm không chạy trong trình duyệt Zalo | Mở app bằng Safari/Chrome — app có banner nhắc sẵn |
| Quên backup | Đặt nhắc lịch hàng tuần; script chỉ 1 lệnh |
| Chi phí Gemini cao hơn dự kiến | Xem /admin mỗi tuần; RUNBOOK có câu SQL tổng token (đúng sau Vá 5) |
| Người lạ đăng ký được | Tắt signup trong Supabase dashboard (Bước 1) + Vá 5 đổi role mặc định |
