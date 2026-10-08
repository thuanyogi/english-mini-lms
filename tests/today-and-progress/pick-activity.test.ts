import { describe, it, expect } from "vitest";
import {
  pickRecommendedActivity,
  type CandidateActivity,
  type PracticeContext,
} from "@/server/today/pick-activity";

const acts: CandidateActivity[] = [
  { id: "W1", slot: "W1", title: "Viết 1", mode: "writing", objective: null, durationMinutes: 20 },
  { id: "R1", slot: "R1", title: "Đọc 1", mode: "reading", objective: null, durationMinutes: 25 },
  { id: "S1", slot: "S1", title: "Nói 1", mode: "speaking", objective: null, durationMinutes: null },
  { id: "L1", slot: "L1", title: "Nghe 1", mode: "listening", objective: null, durationMinutes: 15 },
];

function ctx(overrides: Partial<PracticeContext> = {}): PracticeContext {
  return {
    latestDraft: null,
    unrevisedSubmission: null,
    skillCounts: { writing: 3, reading: 2, speaking: 1, listening: 0 },
    leastPracticedMode: "listening",
    ...overrides,
  };
}

describe("pickRecommendedActivity (shared by /today and /library)", () => {
  it("rule (a): an unfinished draft wins over everything", () => {
    const rec = pickRecommendedActivity(
      acts,
      ctx({
        latestDraft: { sessionId: "sess-1", activityId: "W1" },
        unrevisedSubmission: { id: "sub-1", activityId: "R1" },
      }),
      30
    );
    expect(rec?.id).toBe("W1");
    expect(rec?.actionType).toBe("continue_draft");
    expect(rec?.sessionId).toBe("sess-1");
  });

  it("rule (a): revision 1 without revision 2 comes next", () => {
    const rec = pickRecommendedActivity(
      acts,
      ctx({ unrevisedSubmission: { id: "sub-1", activityId: "R1" } }),
      30
    );
    expect(rec?.id).toBe("R1");
    expect(rec?.actionType).toBe("start_revision");
    expect(rec?.parentId).toBe("sub-1");
  });

  it("rule (c): otherwise picks the least-practiced skill", () => {
    const rec = pickRecommendedActivity(acts, ctx(), 30);
    expect(rec?.id).toBe("L1");
    expect(rec?.actionType).toBe("new_session");
    expect(rec?.reason).toContain("chưa được luyện bài nào");
  });

  it("falls back to speaking, then the first candidate", () => {
    const noListening = acts.filter((a) => a.mode !== "listening");
    expect(pickRecommendedActivity(noListening, ctx(), 30)?.id).toBe("S1");

    const onlyWriting = acts.filter((a) => a.mode === "writing");
    expect(pickRecommendedActivity(onlyWriting, ctx(), 30)?.id).toBe("W1");
  });

  it("only ever picks from the candidates it is given (per-topic use)", () => {
    // Draft belongs to W1, but W1 is not a candidate in this topic
    const topicActs = acts.filter((a) => a.id !== "W1");
    const rec = pickRecommendedActivity(
      topicActs,
      ctx({ latestDraft: { sessionId: "sess-1", activityId: "W1" } }),
      30
    );
    expect(rec).not.toBeNull();
    expect(topicActs.map((a) => a.id)).toContain(rec!.id);
    expect(rec?.actionType).toBe("new_session");
  });

  it("defaults missing duration to 15 and returns null for no candidates", () => {
    const rec = pickRecommendedActivity(acts, ctx({ leastPracticedMode: "speaking" }), 45);
    expect(rec?.id).toBe("S1");
    expect(rec?.durationMinutes).toBe(15);

    expect(pickRecommendedActivity([], ctx(), 30)).toBeNull();
  });
});
