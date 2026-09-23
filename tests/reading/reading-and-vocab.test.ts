import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db";
import { learners } from "@/db/schema";
import * as geminiProvider from "@/server/providers/gemini";
import {
  createVocabulary,
  getLearnerVocabulary,
  updateVocabulary,
  quickCapture,
  ValidationError,
} from "@/server/vocabulary/service";
import {
  createSession,
  createSubmissionAndAssess,
  getSessionDetails,
} from "@/server/learning/service";

describe("Reading Mode & Vocabulary Vault Tests", () => {
  let testLearnerId: string;

  beforeEach(() => {
    vi.spyOn(geminiProvider, "evaluateReading").mockResolvedValue({
      feedback: {
        observations: [
          {
            location: "Câu 2, đoạn 1",
            original: "suprascapular nerve block",
            issue: "Dịch chưa sát thuật ngữ giải phẫu",
            suggestion: "Dịch là 'phong bế thần kinh trên vai'",
            example: "Khi thực hiện phong bế thần kinh trên vai...",
            retry_prompt: "Dịch lại câu số 2 với thuật ngữ chuẩn xác",
          },
        ],
        strengths: ["Bản dịch diễn đạt lưu loát và tự nhiên"],
        next_action: "Chuẩn hóa các thuật ngữ dây chằng và khoang cân mạc",
        limitations:
          "Nhận xét của AI chỉ đánh giá kỹ năng ngôn ngữ và mức độ trung thành với đoạn gốc; tuyệt đối không mang tính chất khuyến nghị điều trị y khoa.",
        scores: [
          { kind: "practice_estimate", dimension: "fidelity", value: 8.5, note: "Trung thành với đoạn gốc" },
          { kind: "practice_estimate", dimension: "terminology", value: 8.0, note: "Thuật ngữ chính xác" },
        ],
      },
      tokenInput: 250,
      tokenOutput: 110,
      modelName: "gemini-2.5-flash",
    });

    vi.spyOn(geminiProvider, "quickCaptureVocabulary").mockResolvedValue({
      result: {
        phrase: "suprascapular nerve block",
        ipa: "/ˌsuːprəˈskæpjʊlər nɜːrv blɒk/",
        context_meaning:
          "Thủ thuật phong bế thần kinh trên vai dưới hướng dẫn siêu âm trong điều trị đau vai mạn tính",
        example_sentence:
          "Ultrasound-guided suprascapular nerve block provides significant pain relief in patients with adhesive capsulitis.",
      },
      tokenInput: 80,
      tokenOutput: 45,
      modelName: "gemini-2.5-flash",
    });
  });

  it("should have or create a test learner", async () => {
    const [existing] = await db
      .select({ id: learners.id })
      .from(learners)
      .limit(1);

    if (existing) {
      testLearnerId = existing.id;
    } else {
      const [created] = await db
        .insert(learners)
        .values({
          userId: "00000000-0000-0000-0000-000000000088",
          displayName: "BS. Minh (Test Reading)",
          role: "learner",
        })
        .returning({ id: learners.id });
      testLearnerId = created.id;
    }
    expect(testLearnerId).toBeDefined();
  });

  // TEST 1: quick-capture / vocabulary không được lưu khi thiếu original_sentence
  it("Requirement 4: cannot save vocabulary when original_sentence is missing or empty", async () => {
    // Missing original_sentence
    await expect(
      createVocabulary(testLearnerId, {
        phrase: "suprascapular nerve block",
        ipa: "/.../",
        context_meaning: "phong bế thần kinh trên vai",
        original_sentence: "",
        source_ref: "Trang 42",
      })
    ).rejects.toThrow(/original_sentence is required/);

    // Whitespace only original_sentence
    await expect(
      createVocabulary(testLearnerId, {
        phrase: "suprascapular nerve block",
        ipa: "/.../",
        context_meaning: "phong bế thần kinh trên vai",
        original_sentence: "   ",
        source_ref: "Trang 42",
      })
    ).rejects.toThrow(ValidationError);
  });

  // TEST 2: Lưu thành công tuple đủ 6 trường, mastery_level=0, due_at=now+1 ngày
  it("Requirement 2: saves full vocabulary tuple with mastery_level=0 and due_at=now+1 day", async () => {
    const beforeTime = Date.now() + 24 * 60 * 60 * 1000 - 5000;
    const item = await createVocabulary(testLearnerId, {
      phrase: "fascial compartment",
      ipa: "/ˈfeɪ.ʃəl kəmˈpɑːrt.mənt/",
      context_meaning: "Khoang cân mạc chứa dịch tiêm",
      original_sentence:
        "Continuous observation verifies that the therapeutic solution distends the intended fascial compartment.",
      source_ref: "Sổ tay siêu âm tr.42",
      source_type: "book",
      my_attempt: "",
    });

    expect(item).toBeDefined();
    expect(item.phrase).toBe("fascial compartment");
    expect(item.ipa).toBe("/ˈfeɪ.ʃəl kəmˈpɑːrt.mənt/");
    expect(item.contextMeaning).toBe("Khoang cân mạc chứa dịch tiêm");
    expect(item.originalSentence).toContain("intended fascial compartment");
    expect(item.sourceRef).toBe("Sổ tay siêu âm tr.42");
    expect(item.myAttempt).toBe("");
    expect(item.masteryLevel).toBe(0);

    const dueTime = new Date(item.dueAt).getTime();
    expect(dueTime).toBeGreaterThanOrEqual(beforeTime);
  });

  // TEST 3: Cập nhật "Câu của tôi" (my_attempt)
  it("Requirement 3: allows learner to update my_attempt on a vocabulary item", async () => {
    const item = await createVocabulary(testLearnerId, {
      phrase: "linear transducer",
      original_sentence:
        "The high-frequency linear transducer should be aligned in a coronal oblique plane.",
      source_ref: "Sổ tay siêu âm tr.42",
    });

    const myAttemptText =
      "In our clinic, we use a 12-MHz linear transducer to evaluate supraspinatus tears.";
    const updated = await updateVocabulary(item.id, testLearnerId, {
      my_attempt: myAttemptText,
    });

    expect(updated.myAttempt).toBe(myAttemptText);
  });

  // TEST 4: Bộ lọc từ vựng "Tất cả", "Đến hạn", "Đã thuộc"
  it("Filters vocabulary correctly by all, due, mastered", async () => {
    const all = await getLearnerVocabulary(testLearnerId, "all");
    expect(all.length).toBeGreaterThan(0);

    // Đánh dấu 1 từ đã thuộc
    const firstItem = all[0];
    await updateVocabulary(firstItem.id, testLearnerId, { mastery_level: 4 });

    const mastered = await getLearnerVocabulary(testLearnerId, "mastered");
    expect(mastered.some((i) => i.id === firstItem.id)).toBe(true);
  });

  // TEST 5: quickCapture trả về đúng định dạng
  it("quickCapture returns parsed definition and example", async () => {
    const res = await quickCapture(
      "suprascapular nerve block",
      "When performing a suprascapular nerve block, dynamic imaging enables precise localization.",
      "Trang 42",
      testLearnerId
    );

    expect(res.phrase).toBe("suprascapular nerve block");
    expect(res.ipa).toBeDefined();
    expect(res.context_meaning).toBeDefined();
    expect(res.example_sentence).toBeDefined();
  });

  // TEST 6: Reading mode evaluation không chứa khuyến nghị điều trị y khoa
  it("Requirement 1: evaluateReading feedback enforces non-clinical disclaimer", async () => {
    const segmentText =
      "Direct sonographic monitoring substantially minimizes the risk of accidental intravascular injection.";
    const submission = {
      mainIdea: "Siêu âm giảm nguy cơ tiêm nhầm vào mạch máu",
      translation:
        "Giám sát trực tiếp bằng siêu âm giảm thiểu đáng kể nguy cơ tiêm nhầm vào lòng mạch máu.",
      keyTerms: "intravascular injection: tiêm vào mạch máu",
    };

    const res = await geminiProvider.evaluateReading(segmentText, submission);
    expect(res.feedback.observations.length).toBeGreaterThan(0);
    expect(res.feedback.limitations.toLowerCase()).toContain("khuyến nghị");
    expect(res.feedback.limitations.toLowerCase()).toContain("điều trị");
  });

  // TEST 7: Luồng Reading mode submission end-to-end trên activity R1
  it("End-to-end: creates session and submits reading assignment on activity R1", async () => {
    const session = await createSession(testLearnerId, "R1", 25);
    expect(session.id).toBeDefined();

    // Kiểm tra getSessionDetails trả về segment và source
    const details = await getSessionDetails(session.id, testLearnerId);
    expect(details?.activity.mode).toBe("reading");
    expect(details?.segment).toBeDefined();
    expect(details?.segment?.page).toBe(42);

    // Nộp bài reading dạng JSON
    const payload = JSON.stringify({
      mainIdea: "Lợi ích của định vị siêu âm trong phong bế thần kinh trên vai",
      translation: "Định vị dưới siêu âm cung cấp hình ảnh trực quan thời gian thực...",
      keyTerms:
        "1. suprascapular nerve block, 2. linear transducer, 3. fascial compartment",
    });

    const result = await createSubmissionAndAssess(session.id, testLearnerId, payload);
    expect(result.submission.id).toBeDefined();
    expect(result.assessment.status).toBe("feedback_ready");
    expect(result.feedback).toBeDefined();
    expect((result.feedback?.observations as unknown[]).length).toBeGreaterThan(0);
  });
});
