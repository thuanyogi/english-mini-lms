import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { describe, it, expect } from "vitest";
import { getApprovedActivities, getActivityDetail } from "@/server/library/service";

describe("Library Service", () => {
  it("getApprovedActivities should only return approved activities", async () => {
    const activities = await getApprovedActivities();

    expect(Array.isArray(activities)).toBe(true);
    expect(activities.length).toBeGreaterThan(0);

    const ids = activities.map((a) => a.id);
    expect(ids).toContain("W1");
    expect(ids).toContain("R1");
    expect(ids).toContain("S1");
    // Draft activity L1 MUST NOT be present
    expect(ids).not.toContain("L1");
  });

  it("getApprovedActivities MUST NOT expose questions_file, rubric_json, or prompt_text to client", async () => {
    const activities = await getApprovedActivities();

    for (const act of activities) {
      const record = act as unknown as Record<string, unknown>;
      // Strict security check: ensure no sensitive/answer/internal fields leaked
      expect(record.questionsFile).toBeUndefined();
      expect(record.rubricJson).toBeUndefined();
      expect(record.promptText).toBeUndefined();
      expect(record.feedbackGuide).toBeUndefined();
    }
  });

  it("getApprovedActivities can filter by mode", async () => {
    const writingActivities = await getApprovedActivities("writing");

    expect(writingActivities.length).toBeGreaterThan(0);
    for (const act of writingActivities) {
      expect(act.mode).toBe("writing");
    }
  });

  it("getActivityDetail should return detail for approved activity", async () => {
    const w1 = await getActivityDetail("W1");

    expect(w1).not.toBeNull();
    expect(w1?.id).toBe("W1");
    expect(w1?.mode).toBe("writing");
    expect(w1?.promptText).toBeDefined();
    expect(w1?.promptText).toContain("Email xin tham dự hội nghị");

    // Security check: questions_file must not be leaked
    const record = w1 as unknown as Record<string, unknown>;
    expect(record.questionsFile).toBeUndefined();
    expect(record.rubricJson).toBeUndefined();
  });

  it("getActivityDetail should return sourceContext for reading activity", async () => {
    const r1 = await getActivityDetail("R1");

    expect(r1).not.toBeNull();
    expect(r1?.id).toBe("R1");
    expect(r1?.mode).toBe("reading");
    expect(r1?.sourceContext).toBeDefined();
    expect(r1?.sourceContext?.sourceTitle).toContain("siêu âm");
    expect(r1?.sourceContext?.page).toBe(42);
  });

  it("getActivityDetail MUST return null for unapproved (draft) activities", async () => {
    // L1 is in manifest with review_state: draft
    const l1 = await getActivityDetail("L1");
    expect(l1).toBeNull();
  });

  it("getActivityDetail should return null for non-existent id", async () => {
    const result = await getActivityDetail("UNKNOWN-ACTIVITY-ID");
    expect(result).toBeNull();
  });
});
