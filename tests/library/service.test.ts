import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { describe, it, expect } from "vitest";
import { db } from "@/db";
import { activities as activitiesTable } from "@/db/schema";
import { getApprovedActivities, getActivityDetail, getTopics } from "@/server/library/service";

describe("Library Service", () => {
  it("getApprovedActivities should only return approved activities", async () => {
    // Upsert a draft activity to verify filtering
    await db
      .insert(activitiesTable)
      .values({
        id: "TEST-DRAFT-99",
        slot: "TEST",
        title: "Draft Activity",
        mode: "writing",
        output: "text",
        reviewState: "draft",
      })
      .onConflictDoUpdate({
        target: activitiesTable.id,
        set: { reviewState: "draft" },
      });

    const activities = await getApprovedActivities();

    expect(Array.isArray(activities)).toBe(true);
    expect(activities.length).toBeGreaterThan(0);

    const ids = activities.map((a) => a.id);
    expect(ids).toContain("W1");
    expect(ids).toContain("R1");
    expect(ids).toContain("S1");
    expect(ids).toContain("L1");
    expect(ids).not.toContain("TEST-DRAFT-99");
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
    const draft = await getActivityDetail("TEST-DRAFT-99");
    expect(draft).toBeNull();
  });

  it("getActivityDetail should return null for non-existent id", async () => {
    const result = await getActivityDetail("UNKNOWN-ACTIVITY-ID");
    expect(result).toBeNull();
  });

  describe("topics (needs db:migrate + seed)", () => {
    it("getApprovedActivities can filter by topic and exposes topic on each item", async () => {
      const hoiNghi = await getApprovedActivities(undefined, "giao-tiep-hoi-nghi");
      const ids = hoiNghi.map((a) => a.id);

      expect(ids).toEqual(expect.arrayContaining(["W1", "W4", "S1", "S3", "L1", "L4"]));
      expect(ids).not.toContain("R1");
      for (const act of hoiNghi) {
        expect(act.topic).toBe("giao-tiep-hoi-nghi");
      }
    });

    it("topic filter can be combined with mode filter", async () => {
      const speaking = await getApprovedActivities("speaking", "giao-tiep-hoi-nghi");
      expect(speaking.map((a) => a.id).sort()).toEqual(["S1", "S3"]);
    });

    it("topic 'uncategorized' returns only activities without a topic", async () => {
      const none = await getApprovedActivities(undefined, "uncategorized");
      for (const act of none) {
        expect(act.topic).toBeNull();
      }
    });

    it("getTopics returns distinct approved topics with counts and never counts drafts", async () => {
      const topics = await getTopics();
      const byTopic = Object.fromEntries(topics.map((t) => [t.topic, t.activityCount]));

      expect(byTopic["giao-tiep-hoi-nghi"]).toBe(6);
      expect(byTopic["doc-sach-y-khoa"]).toBe(6);
      expect(byTopic["giao-tiep-lam-sang"]).toBe(4);
      // TEST-DRAFT-99 (draft) must not inflate any group
      const total = topics.reduce((sum, t) => sum + t.activityCount, 0);
      const approved = await getApprovedActivities();
      expect(total).toBe(approved.length);
      // Without learnerId, no learned counts
      expect(topics.every((t) => t.learnedCount === 0)).toBe(true);
    });

    it("getActivityDetail includes topic", async () => {
      const w1 = await getActivityDetail("W1");
      expect(w1?.topic).toBe("giao-tiep-hoi-nghi");
    });

    it("getTopics(learnerId) runs the learned-count query and keeps counts consistent", async () => {
      // learner không có bài nộp → học 0, nhưng câu SQL (subquery tương quan) phải chạy được
      const topics = await getTopics("00000000-0000-0000-0000-0000000000aa");
      const withoutLearner = await getTopics();

      expect(topics.map((t) => t.topic)).toEqual(withoutLearner.map((t) => t.topic));
      for (const t of topics) {
        expect(t.learnedCount).toBe(0);
        expect(t.learnedCount).toBeLessThanOrEqual(t.activityCount);
      }
    });
  });
});
