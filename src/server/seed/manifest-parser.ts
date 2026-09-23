import fs from "fs";
import path from "path";
import yaml from "yaml";

export interface ManifestSource {
  id: string;
  title: string;
  kind: string;
  permission?: string;
  locator_type?: string;
  url?: string;
  review_state: "draft" | "reviewing" | "approved" | "rejected" | "retired";
  notes?: string;
}

export interface ManifestSegment {
  id: string;
  source_id: string;
  page?: number;
  start_seconds?: number;
  end_seconds?: number;
  text_file?: string;
  transcript_file?: string;
  verified_transcript?: boolean;
  language?: string;
}

export interface ManifestActivity {
  id: string;
  slot?: string;
  mode:
    | "writing"
    | "reading"
    | "speaking"
    | "listening"
    | "ielts-writing"
    | "ielts-reading"
    | "ielts-speaking"
    | "ielts-listening";
  title: string;
  objective?: string;
  duration_minutes?: number;
  difficulty?: "trial" | "beginner" | "intermediate" | "advanced";
  prompt_file?: string;
  feedback_guide?: string;
  rubric_file?: string;
  answer_reveal?: "none" | "after_submit" | "on_request";
  purpose?: string;
  review_state: "draft" | "reviewing" | "approved" | "rejected" | "retired";
  segment_ids?: string[];
  questions_file?: string;
  output?: string;
}

export interface ManifestData {
  version: number;
  timezone?: string;
  sources?: ManifestSource[];
  segments?: ManifestSegment[];
  activities?: ManifestActivity[];
}

export interface ParsedManifestResult {
  success: boolean;
  errors: string[];
  sourcesToUpsert: Array<{
    id: string;
    title: string;
    kind: string;
    permission: string | null;
    locatorType: string | null;
    url: string | null;
    reviewState: "draft" | "reviewing" | "approved" | "rejected" | "retired";
    notes: string | null;
  }>;
  segmentsToUpsert: Array<{
    id: string;
    sourceId: string;
    page: number | null;
    startSeconds: number | null;
    endSeconds: number | null;
    textContent: string | null;
    transcriptContent: string | null;
    verifiedTranscript: boolean;
    language: string;
  }>;
  activitiesToUpsert: Array<{
    id: string;
    slot: string | null;
    mode: ManifestActivity["mode"];
    title: string;
    objective: string | null;
    durationMinutes: number | null;
    difficulty: "trial" | "beginner" | "intermediate" | "advanced";
    promptText: string | null;
    feedbackGuide: string | null;
    rubricJson: unknown;
    answerReveal: "none" | "after_submit" | "on_request";
    purpose: string | null;
    reviewState: "draft" | "reviewing" | "approved" | "rejected" | "retired";
    segmentIds: string[];
    questionsFile: string | null;
    output: string | null;
  }>;
}

/**
 * Parses and validates manifest.yaml and its referenced content files.
 * Enforces invariant: Only approved items are loaded.
 * If any referenced file is missing, reports clear error with activity ID and does NOT proceed.
 */
export function parseAndValidateManifest(
  baseDir: string,
  manifestYamlContent: string
): ParsedManifestResult {
  const errors: string[] = [];

  let data: ManifestData;
  try {
    data = yaml.parse(manifestYamlContent) as ManifestData;
  } catch (err) {
    return {
      success: false,
      errors: [`Không thể parse YAML của manifest: ${err instanceof Error ? err.message : String(err)}`],
      sourcesToUpsert: [],
      segmentsToUpsert: [],
      activitiesToUpsert: [],
    };
  }

  if (!data || typeof data !== "object") {
    return {
      success: false,
      errors: ["Manifest rỗng hoặc định dạng không đúng."],
      sourcesToUpsert: [],
      segmentsToUpsert: [],
      activitiesToUpsert: [],
    };
  }

  const allSources = data.sources || [];
  const allSegments = data.segments || [];
  const allActivities = data.activities || [];

  // Index for quick lookup
  const sourceMap = new Map(allSources.map((s) => [s.id, s]));
  const segmentMap = new Map(allSegments.map((s) => [s.id, s]));

  // Rule: Only import review_state = approved activities
  const approvedActivities = allActivities.filter(
    (act) => act.review_state === "approved"
  );

  const neededSegmentIds = new Set<string>();
  const neededSourceIds = new Set<string>();

  // 1. Validation phase: check all referenced files for approved activities
  for (const act of approvedActivities) {
    if (act.prompt_file) {
      const fullPath = path.resolve(baseDir, act.prompt_file);
      if (!fs.existsSync(fullPath)) {
        errors.push(
          `Activity "${act.id}" ("${act.title}") thiếu file đề bài: ${act.prompt_file}`
        );
      }
    }

    if (act.rubric_file) {
      const fullPath = path.resolve(baseDir, act.rubric_file);
      if (!fs.existsSync(fullPath)) {
        errors.push(
          `Activity "${act.id}" ("${act.title}") thiếu file rubric: ${act.rubric_file}`
        );
      }
    }

    if (act.questions_file) {
      const fullPath = path.resolve(baseDir, act.questions_file);
      if (!fs.existsSync(fullPath)) {
        errors.push(
          `Activity "${act.id}" ("${act.title}") thiếu file câu hỏi: ${act.questions_file}`
        );
      }
    }

    // Check referenced segments
    if (act.segment_ids && Array.isArray(act.segment_ids)) {
      for (const segId of act.segment_ids) {
        const seg = segmentMap.get(segId);
        if (!seg) {
          errors.push(
            `Activity "${act.id}" ("${act.title}") tham chiếu segment không tồn tại: "${segId}"`
          );
          continue;
        }

        neededSegmentIds.add(segId);
        neededSourceIds.add(seg.source_id);

        if (seg.text_file) {
          const fullPath = path.resolve(baseDir, seg.text_file);
          if (!fs.existsSync(fullPath)) {
            errors.push(
              `Activity "${act.id}" ("${act.title}") tham chiếu segment "${segId}" thiếu file văn bản: ${seg.text_file}`
            );
          }
        }

        if (seg.transcript_file) {
          const fullPath = path.resolve(baseDir, seg.transcript_file);
          if (!fs.existsSync(fullPath)) {
            errors.push(
              `Activity "${act.id}" ("${act.title}") tham chiếu segment "${segId}" thiếu file transcript: ${seg.transcript_file}`
            );
          }
        }
      }
    }
  }

  // Check referenced sources
  for (const srcId of neededSourceIds) {
    const src = sourceMap.get(srcId);
    if (!src) {
      errors.push(`Nguồn học "${srcId}" được tham chiếu nhưng không có trong danh sách sources.`);
    }
  }

  // If there are ANY errors, stop immediately — "không nạp nửa chừng"
  if (errors.length > 0) {
    return {
      success: false,
      errors,
      sourcesToUpsert: [],
      segmentsToUpsert: [],
      activitiesToUpsert: [],
    };
  }

  // 2. Data preparation phase: read files into memory
  const sourcesToUpsert = allSources
    .filter((s) => s.review_state === "approved" || neededSourceIds.has(s.id))
    .map((s) => ({
      id: s.id,
      title: s.title,
      kind: s.kind,
      permission: s.permission ?? null,
      locatorType: s.locator_type ?? null,
      url: s.url ?? null,
      reviewState: s.review_state,
      notes: s.notes ?? null,
    }));

  const segmentsToUpsert = Array.from(neededSegmentIds).map((segId) => {
    const seg = segmentMap.get(segId)!;
    let textContent: string | null = null;
    let transcriptContent: string | null = null;

    if (seg.text_file) {
      const fullPath = path.resolve(baseDir, seg.text_file);
      textContent = fs.readFileSync(fullPath, "utf-8");
    }

    if (seg.transcript_file) {
      const fullPath = path.resolve(baseDir, seg.transcript_file);
      transcriptContent = fs.readFileSync(fullPath, "utf-8");
    }

    return {
      id: seg.id,
      sourceId: seg.source_id,
      page: seg.page ?? null,
      startSeconds: seg.start_seconds ?? null,
      endSeconds: seg.end_seconds ?? null,
      textContent,
      transcriptContent,
      verifiedTranscript: seg.verified_transcript ?? false,
      language: seg.language ?? "en",
    };
  });

  const activitiesToUpsert = approvedActivities.map((act) => {
    let promptText: string | null = null;
    let rubricJson: unknown = null;

    if (act.prompt_file) {
      const fullPath = path.resolve(baseDir, act.prompt_file);
      promptText = fs.readFileSync(fullPath, "utf-8");
    }

    if (act.rubric_file) {
      const fullPath = path.resolve(baseDir, act.rubric_file);
      const rubricYaml = fs.readFileSync(fullPath, "utf-8");
      rubricJson = yaml.parse(rubricYaml);
    }

    return {
      id: act.id,
      slot: act.slot ?? null,
      mode: act.mode,
      title: act.title,
      objective: act.objective ?? null,
      durationMinutes: act.duration_minutes ?? null,
      difficulty: act.difficulty ?? "trial",
      promptText,
      feedbackGuide: act.feedback_guide ?? null,
      rubricJson,
      answerReveal: act.answer_reveal ?? "none",
      purpose: act.purpose ?? null,
      reviewState: act.review_state,
      segmentIds: act.segment_ids ?? [],
      questionsFile: act.questions_file ?? null,
      output: act.output ?? null,
    };
  });

  return {
    success: true,
    errors: [],
    sourcesToUpsert,
    segmentsToUpsert,
    activitiesToUpsert,
  };
}
