import { describe, it, expect } from "vitest";
import path from "path";
import { parseAndValidateManifest } from "@/server/seed/manifest-parser";

describe("Manifest Parser & File Validator", () => {
  const baseDir = path.resolve(process.cwd(), "content/english-lab");

  it("should parse valid manifest and return only approved activities", () => {
    const validManifest = `
version: 1
sources:
  - id: src-1
    title: "Test Source"
    kind: book
    review_state: approved
segments:
  - id: seg-1
    source_id: src-1
    text_file: texts/r1-ultrasound-p42.md
activities:
  - id: ACT-APPROVED
    slot: W1
    mode: writing
    title: "Approved Activity"
    prompt_file: texts/w1-conference-email-prompt.md
    rubric_file: rubrics/writing-practical-v1.yaml
    review_state: approved
  - id: ACT-DRAFT
    slot: L1
    mode: listening
    title: "Draft Activity"
    review_state: draft
`;

    const result = parseAndValidateManifest(baseDir, validManifest);

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.activitiesToUpsert).toHaveLength(1);
    expect(result.activitiesToUpsert[0].id).toBe("ACT-APPROVED");
    expect(result.activitiesToUpsert[0].promptText).toContain("Email xin tham dự hội nghị");
    expect(result.activitiesToUpsert[0].rubricJson).toBeDefined();
  });

  it("should fail validation and NOT proceed when prompt_file is missing", () => {
    const invalidManifest = `
version: 1
sources: []
segments: []
activities:
  - id: W1-BROKEN
    slot: W1
    mode: writing
    title: "Broken Prompt Activity"
    prompt_file: texts/non-existent-prompt.md
    review_state: approved
`;

    const result = parseAndValidateManifest(baseDir, invalidManifest);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("W1-BROKEN");
    expect(result.errors[0]).toContain("non-existent-prompt.md");
    expect(result.activitiesToUpsert).toHaveLength(0);
  });

  it("should fail validation and NOT proceed when rubric_file is missing", () => {
    const invalidManifest = `
version: 1
sources: []
segments: []
activities:
  - id: W1-RUBRIC-FAIL
    slot: W1
    mode: writing
    title: "Broken Rubric Activity"
    prompt_file: texts/w1-conference-email-prompt.md
    rubric_file: rubrics/missing-rubric.yaml
    review_state: approved
`;

    const result = parseAndValidateManifest(baseDir, invalidManifest);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("W1-RUBRIC-FAIL");
    expect(result.errors[0]).toContain("missing-rubric.yaml");
    expect(result.activitiesToUpsert).toHaveLength(0);
  });

  it("should fail validation when referenced segment text_file is missing", () => {
    const invalidManifest = `
version: 1
sources:
  - id: src-1
    title: "Valid Source"
    kind: book
    review_state: approved
segments:
  - id: seg-broken
    source_id: src-1
    text_file: texts/ghost-text.md
activities:
  - id: R1-SEG-FAIL
    slot: R1
    mode: reading
    title: "Broken Segment Activity"
    segment_ids: [seg-broken]
    review_state: approved
`;

    const result = parseAndValidateManifest(baseDir, invalidManifest);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("R1-SEG-FAIL");
    expect(result.errors[0]).toContain("ghost-text.md");
    expect(result.activitiesToUpsert).toHaveLength(0);
  });

  it("should ignore missing files in unapproved (draft) activities", () => {
    const manifestWithDraftMissingFile = `
version: 1
sources: []
segments: []
activities:
  - id: DRAFT-IGNORED
    slot: L1
    mode: listening
    title: "Draft With Missing File"
    prompt_file: texts/does-not-exist.md
    review_state: draft
`;

    const result = parseAndValidateManifest(baseDir, manifestWithDraftMissingFile);

    // Should succeed because draft activities are not loaded
    expect(result.success).toBe(true);
    expect(result.activitiesToUpsert).toHaveLength(0);
  });

  it("should parse topic key, treat empty topic as null", () => {
    const manifest = `
version: 1
sources: []
segments: []
activities:
  - id: T-A
    mode: writing
    title: "Has topic"
    topic: giao-tiep-hoi-nghi
    review_state: approved
  - id: T-B
    mode: writing
    title: "Empty topic"
    topic: ""
    review_state: approved
  - id: T-C
    mode: writing
    title: "No topic"
    review_state: approved
`;
    const result = parseAndValidateManifest(baseDir, manifest);

    expect(result.success).toBe(true);
    const byId = Object.fromEntries(result.activitiesToUpsert.map((a) => [a.id, a]));
    expect(byId["T-A"].topic).toBe("giao-tiep-hoi-nghi");
    expect(byId["T-B"].topic).toBeNull();
    expect(byId["T-C"].topic).toBeNull();
  });

  it("should reject an invalid topic slug and not proceed", () => {
    const manifest = `
version: 1
sources: []
segments: []
activities:
  - id: T-BAD
    mode: writing
    title: "Bad topic"
    topic: "Giao Tiếp!"
    review_state: approved
`;
    const result = parseAndValidateManifest(baseDir, manifest);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("T-BAD");
    expect(result.errors[0]).toContain("topic");
    expect(result.activitiesToUpsert).toHaveLength(0);
  });
});
