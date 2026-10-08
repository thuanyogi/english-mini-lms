/**
 * Google Drive → DB sync service.
 *
 * Rules:
 *  - Chỉ import bài review_state=approved từ manifest
 *  - Không bao giờ ghi đè row có origin='admin' → báo conflict
 *  - Row có origin='seed' hoặc 'drive' → upsert bình thường
 *  - Dry-run: parse + validate nhưng không write DB
 *  - Cấu trúc thư mục bắt buộc:
 *      manifest.yaml     (ở gốc thư mục Drive)
 *      texts/            (thư mục con)
 *      transcripts/      (thư mục con)
 *      rubrics/          (thư mục con, tuỳ chọn)
 */

import yaml from "yaml";
import { db } from "../../db";
import { activities, sources, sourceSegments } from "../../db/schema";
import {
  getDriveClient,
  getDriveFolderId,
  listFolderContents,
  downloadFileText,
  findFileByName,
  findSubFolderId,
  type DriveFile,
} from "../providers/google-drive";
import {
  parseManifestYaml,
  type ManifestData,
  type ManifestActivity,
} from "../seed/manifest-parser";
import { isValidTopicKey, UNCATEGORIZED_TOPIC } from "../../lib/topics";

// ──────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────

export interface SyncConflict {
  id: string;
  kind: "activity" | "source" | "segment";
  reason: string;
}

export interface SyncError {
  file?: string;
  id?: string;
  message: string;
}

export interface SyncResult {
  added: string[];
  updated: string[];
  skipped: string[];
  conflicts: SyncConflict[];
  errors: SyncError[];
  dryRun: boolean;
}

// ──────────────────────────────────────────────
// Internal: Drive file cache (per sync session)
// ──────────────────────────────────────────────

interface FolderIndex {
  manifestFile: DriveFile | null;
  textsFolderId: string | null;
  transcriptsFolderId: string | null;
  rubricsFolderId: string | null;
}

/**
 * Builds an index of the root Drive folder structure.
 * Returns error strings if required structure is missing.
 */
async function indexDriveFolder(
  drive: ReturnType<typeof getDriveClient>,
  rootFolderId: string
): Promise<{ index: FolderIndex; structureErrors: string[] }> {
  const structureErrors: string[] = [];

  // All items at root level
  const rootItems = await listFolderContents(drive, rootFolderId);

  const manifestFile =
    rootItems.find(
      (f) =>
        f.name === "manifest.yaml" &&
        f.mimeType !== "application/vnd.google-apps.folder"
    ) ?? null;

  if (!manifestFile) {
    structureErrors.push(
      "Không tìm thấy manifest.yaml ở gốc thư mục Drive. Kiểm tra lại cấu trúc thư mục."
    );
  }

  const textsFolderId = await findSubFolderId(drive, rootFolderId, "texts");
  const transcriptsFolderId = await findSubFolderId(
    drive,
    rootFolderId,
    "transcripts"
  );
  const rubricsFolderId = await findSubFolderId(drive, rootFolderId, "rubrics");

  if (!textsFolderId) {
    structureErrors.push(
      "Không tìm thấy thư mục texts/ trong Drive. Kiểm tra lại cấu trúc thư mục."
    );
  }
  if (!transcriptsFolderId) {
    structureErrors.push(
      "Không tìm thấy thư mục transcripts/ trong Drive. Kiểm tra lại cấu trúc thư mục."
    );
  }
  // rubrics/ là tuỳ chọn — chỉ cảnh báo nếu thiếu

  return {
    index: {
      manifestFile,
      textsFolderId,
      transcriptsFolderId,
      rubricsFolderId,
    },
    structureErrors,
  };
}

/**
 * Builds a DriveFileReader (SyncFileReader) that resolves relative paths
 * like "texts/article.txt" by mapping to the correct Drive folder.
 */
function buildDriveFileReader(
  drive: ReturnType<typeof getDriveClient>,
  folderIndex: FolderIndex,
  warnings: string[]
): (relativePath: string) => Promise<string | null> {
  // Per-session in-memory cache
  const cache = new Map<string, string | null>();

  return async (relativePath: string): Promise<string | null> => {
    if (cache.has(relativePath)) return cache.get(relativePath)!;

    const parts = relativePath.replace(/\\/g, "/").split("/");
    if (parts.length !== 2) {
      warnings.push(
        `Đường dẫn "${relativePath}" không đúng cấu trúc (phải là "subfolder/filename"). Bỏ qua.`
      );
      cache.set(relativePath, null);
      return null;
    }

    const [subfolderName, fileName] = parts;
    let parentFolderId: string | null = null;

    switch (subfolderName) {
      case "texts":
        parentFolderId = folderIndex.textsFolderId;
        break;
      case "transcripts":
        parentFolderId = folderIndex.transcriptsFolderId;
        break;
      case "rubrics":
        parentFolderId = folderIndex.rubricsFolderId;
        break;
      default:
        warnings.push(
          `Thư mục "${subfolderName}" không được hỗ trợ (chỉ texts/ transcripts/ rubrics/). Bỏ qua.`
        );
        cache.set(relativePath, null);
        return null;
    }

    if (!parentFolderId) {
      cache.set(relativePath, null);
      return null;
    }

    const file = await findFileByName(drive, parentFolderId, fileName);
    if (!file) {
      cache.set(relativePath, null);
      return null;
    }

    const { downloadFileText: dl } = await import(
      "../providers/google-drive"
    );
    const content = await dl(drive, file.id);
    cache.set(relativePath, content);
    return content;
  };
}

// ──────────────────────────────────────────────
// Validation helpers (reusing manifest-parser logic)
// ──────────────────────────────────────────────

function validateApprovedActivities(
  data: ManifestData
): { approvedActivities: ManifestActivity[]; validationErrors: string[] } {
  const allActivities = data.activities ?? [];
  const allSegments = data.segments ?? [];
  const segmentMap = new Map(allSegments.map((s) => [s.id, s]));

  const approvedActivities = allActivities.filter(
    (act) => act.review_state === "approved"
  );
  const validationErrors: string[] = [];

  for (const act of approvedActivities) {
    // Validate topic key
    if (act.topic !== undefined && act.topic !== null) {
      const topicKey = String(act.topic).trim();
      if (
        topicKey !== "" &&
        (!isValidTopicKey(topicKey) || topicKey === UNCATEGORIZED_TOPIC)
      ) {
        validationErrors.push(
          `Activity "${act.id}" ("${act.title}") có topic không hợp lệ: "${topicKey}"`
        );
      }
    }

    // Check referenced segments exist in manifest
    if (act.segment_ids && Array.isArray(act.segment_ids)) {
      for (const segId of act.segment_ids) {
        if (!segmentMap.has(segId)) {
          validationErrors.push(
            `Activity "${act.id}" tham chiếu segment không tồn tại trong manifest: "${segId}"`
          );
        }
      }
    }
  }

  return { approvedActivities, validationErrors };
}

// ──────────────────────────────────────────────
// DB helpers: check existing origin
// ──────────────────────────────────────────────

async function getExistingOrigins(): Promise<{
  activityOrigins: Map<string, string>;
  sourceOrigins: Map<string, string>;
  segmentOrigins: Map<string, string>;
}> {
  const [existingActivities, existingSources, existingSegments] =
    await Promise.all([
      db.select({ id: activities.id, origin: activities.origin }).from(activities),
      db.select({ id: sources.id, origin: sources.origin }).from(sources),
      db
        .select({ id: sourceSegments.id, origin: sourceSegments.origin })
        .from(sourceSegments),
    ]);

  return {
    activityOrigins: new Map(
      existingActivities.map((a) => [a.id, a.origin ?? "seed"])
    ),
    sourceOrigins: new Map(
      existingSources.map((s) => [s.id, s.origin ?? "seed"])
    ),
    segmentOrigins: new Map(
      existingSegments.map((s) => [s.id, s.origin ?? "seed"])
    ),
  };
}

// ──────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────

export async function syncDriveContent(opts: {
  dryRun?: boolean;
}): Promise<SyncResult> {
  const { dryRun = false } = opts;

  const result: SyncResult = {
    added: [],
    updated: [],
    skipped: [],
    conflicts: [],
    errors: [],
    dryRun,
  };

  // ── 1. Init Drive client + folder ID ──
  let drive: ReturnType<typeof getDriveClient>;
  let rootFolderId: string;
  try {
    drive = getDriveClient();
    rootFolderId = getDriveFolderId();
  } catch (err) {
    result.errors.push({
      message: `Lỗi khởi tạo Drive client: ${err instanceof Error ? err.message : String(err)}`,
    });
    return result;
  }

  // ── 2. Index folder structure ──
  let folderIndex: FolderIndex;
  const structureWarnings: string[] = [];
  try {
    const { index, structureErrors } = await indexDriveFolder(
      drive,
      rootFolderId
    );
    if (structureErrors.length > 0) {
      for (const e of structureErrors) {
        result.errors.push({ message: e });
      }
      return result; // Cấu trúc sai → dừng luôn
    }
    folderIndex = index;
  } catch (err) {
    result.errors.push({
      message: `Lỗi khi kiểm tra cấu trúc thư mục Drive: ${err instanceof Error ? err.message : String(err)}`,
    });
    return result;
  }

  // ── 3. Download manifest.yaml ──
  let manifestContent: string | null;
  try {
    manifestContent = await downloadFileText(drive, folderIndex.manifestFile!.id);
    if (!manifestContent) {
      result.errors.push({ file: "manifest.yaml", message: "Không thể tải manifest.yaml từ Drive." });
      return result;
    }
  } catch (err) {
    result.errors.push({
      file: "manifest.yaml",
      message: `Lỗi tải manifest.yaml: ${err instanceof Error ? err.message : String(err)}`,
    });
    return result;
  }

  // ── 4. Parse manifest YAML ──
  const parseResult = parseManifestYaml(manifestContent);
  if (!parseResult.success) {
    for (const e of parseResult.errors) {
      result.errors.push({ file: "manifest.yaml", message: e });
    }
    return result;
  }
  const { data } = parseResult;

  // ── 5. Validate approved activities (structural, not file existence) ──
  const { approvedActivities, validationErrors } =
    validateApprovedActivities(data);

  if (validationErrors.length > 0) {
    for (const e of validationErrors) {
      result.errors.push({ file: "manifest.yaml", message: e });
    }
    return result;
  }

  if (approvedActivities.length === 0) {
    // Nothing approved — not an error, just skip
    return result;
  }

  // ── 6. Build Drive file reader ──
  const driveFileReader = buildDriveFileReader(
    drive,
    folderIndex,
    structureWarnings
  );

  // ── 7. Check existing origins in DB ──
  let activityOrigins: Map<string, string>;
  let sourceOrigins: Map<string, string>;
  let segmentOrigins: Map<string, string>;
  try {
    ({ activityOrigins, sourceOrigins, segmentOrigins } =
      await getExistingOrigins());
  } catch (err) {
    result.errors.push({
      message: `Lỗi đọc DB: ${err instanceof Error ? err.message : String(err)}`,
    });
    return result;
  }

  // ── 8. Collect needed sources + segments ──
  const allSegments = data.segments ?? [];
  const allSources = data.sources ?? [];
  const segmentMap = new Map(allSegments.map((s) => [s.id, s]));
  const sourceMap = new Map(allSources.map((s) => [s.id, s]));

  const neededSegmentIds = new Set<string>();
  const neededSourceIds = new Set<string>();
  for (const act of approvedActivities) {
    if (act.segment_ids) {
      for (const segId of act.segment_ids) {
        const seg = segmentMap.get(segId);
        if (seg) {
          neededSegmentIds.add(segId);
          neededSourceIds.add(seg.source_id);
        }
      }
    }
  }

  // ── 9. Upsert sources ──
  for (const sourceId of neededSourceIds) {
    const src = sourceMap.get(sourceId);
    if (!src) {
      result.errors.push({
        id: sourceId,
        message: `Source "${sourceId}" được tham chiếu trong segment nhưng không có trong manifest.`,
      });
      continue;
    }

    const existingOrigin = sourceOrigins.get(sourceId);
    if (existingOrigin === "admin") {
      result.conflicts.push({
        id: sourceId,
        kind: "source",
        reason: `Source "${sourceId}" được quản lý bởi admin (origin=admin). Drive sync không được ghi đè.`,
      });
      continue;
    }

    if (!dryRun) {
      try {
        await db
          .insert(sources)
          .values({
            id: src.id,
            title: src.title,
            kind: src.kind,
            permission: src.permission ?? null,
            locatorType: src.locator_type ?? null,
            url: src.url ?? null,
            reviewState: src.review_state,
            notes: src.notes ?? null,
            origin: "drive",
          })
          .onConflictDoUpdate({
            target: sources.id,
            set: {
              title: src.title,
              kind: src.kind,
              permission: src.permission ?? null,
              locatorType: src.locator_type ?? null,
              url: src.url ?? null,
              reviewState: src.review_state,
              notes: src.notes ?? null,
              origin: "drive",
            },
          });
      } catch (err) {
        result.errors.push({
          id: sourceId,
          message: `Lỗi upsert source: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }
    }

    if (existingOrigin !== undefined) {
      result.updated.push(`source:${sourceId}`);
    } else {
      result.added.push(`source:${sourceId}`);
    }
  }

  // ── 10. Upsert segments ──
  for (const segId of neededSegmentIds) {
    const seg = segmentMap.get(segId);
    if (!seg) continue;

    const existingOrigin = segmentOrigins.get(segId);
    if (existingOrigin === "admin") {
      result.conflicts.push({
        id: segId,
        kind: "segment",
        reason: `Segment "${segId}" được quản lý bởi admin (origin=admin). Drive sync không được ghi đè.`,
      });
      continue;
    }

    // Download text + transcript content
    let textContent: string | null = null;
    let transcriptContent: string | null = null;

    if (seg.text_file) {
      try {
        textContent = await driveFileReader(seg.text_file);
        if (textContent === null) {
          result.errors.push({
            id: segId,
            file: seg.text_file,
            message: `Segment "${segId}" thiếu file văn bản: ${seg.text_file}`,
          });
          continue;
        }
      } catch (err) {
        result.errors.push({
          id: segId,
          file: seg.text_file,
          message: `Lỗi tải file ${seg.text_file}: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }
    }

    if (seg.transcript_file) {
      try {
        transcriptContent = await driveFileReader(seg.transcript_file);
        if (transcriptContent === null) {
          result.errors.push({
            id: segId,
            file: seg.transcript_file,
            message: `Segment "${segId}" thiếu file transcript: ${seg.transcript_file}`,
          });
          continue;
        }
      } catch (err) {
        result.errors.push({
          id: segId,
          file: seg.transcript_file,
          message: `Lỗi tải file ${seg.transcript_file}: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }
    }

    if (!dryRun) {
      try {
        await db
          .insert(sourceSegments)
          .values({
            id: seg.id,
            sourceId: seg.source_id,
            page: seg.page ?? null,
            startSeconds: seg.start_seconds ?? null,
            endSeconds: seg.end_seconds ?? null,
            textContent,
            transcriptContent,
            verifiedTranscript: seg.verified_transcript ?? false,
            language: seg.language ?? "en",
            origin: "drive",
          })
          .onConflictDoUpdate({
            target: sourceSegments.id,
            set: {
              sourceId: seg.source_id,
              page: seg.page ?? null,
              startSeconds: seg.start_seconds ?? null,
              endSeconds: seg.end_seconds ?? null,
              textContent,
              transcriptContent,
              verifiedTranscript: seg.verified_transcript ?? false,
              language: seg.language ?? "en",
              origin: "drive",
            },
          });
      } catch (err) {
        result.errors.push({
          id: segId,
          message: `Lỗi upsert segment: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }
    }

    if (existingOrigin !== undefined) {
      result.updated.push(`segment:${segId}`);
    } else {
      result.added.push(`segment:${segId}`);
    }
  }

  // ── 11. Upsert activities ──
  for (const act of approvedActivities) {
    const existingOrigin = activityOrigins.get(act.id);
    if (existingOrigin === "admin") {
      result.conflicts.push({
        id: act.id,
        kind: "activity",
        reason: `Activity "${act.id}" ("${act.title}") được quản lý bởi admin (origin=admin). Drive sync không được ghi đè.`,
      });
      continue;
    }

    // Download optional text files
    let promptText: string | null = null;
    let rubricJson: unknown = null;

    if (act.prompt_file) {
      try {
        promptText = await driveFileReader(act.prompt_file);
        if (promptText === null) {
          result.errors.push({
            id: act.id,
            file: act.prompt_file,
            message: `Activity "${act.id}" thiếu file đề bài: ${act.prompt_file}`,
          });
          continue;
        }
      } catch (err) {
        result.errors.push({
          id: act.id,
          file: act.prompt_file,
          message: `Lỗi tải ${act.prompt_file}: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }
    }

    if (act.rubric_file) {
      try {
        const rubricContent = await driveFileReader(act.rubric_file);
        if (rubricContent === null) {
          result.errors.push({
            id: act.id,
            file: act.rubric_file,
            message: `Activity "${act.id}" thiếu file rubric: ${act.rubric_file}`,
          });
          continue;
        }
        rubricJson = yaml.parse(rubricContent);
      } catch (err) {
        result.errors.push({
          id: act.id,
          file: act.rubric_file,
          message: `Lỗi tải/parse ${act.rubric_file}: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }
    }

    const activityValues = {
      id: act.id,
      slot: act.slot ?? null,
      mode: act.mode,
      title: act.title,
      objective: act.objective ?? null,
      durationMinutes: act.duration_minutes ?? null,
      difficulty: act.difficulty ?? ("trial" as const),
      promptText,
      feedbackGuide: act.feedback_guide ?? null,
      rubricJson,
      answerReveal: act.answer_reveal ?? ("none" as const),
      purpose: act.purpose ?? null,
      reviewState: act.review_state,
      segmentIds: act.segment_ids ?? [],
      questionsFile: act.questions_file ?? null,
      output: act.output ?? null,
      topic: act.topic ? String(act.topic).trim() || null : null,
      origin: "drive" as const,
    };

    if (!dryRun) {
      try {
        await db
          .insert(activities)
          .values(activityValues)
          .onConflictDoUpdate({
            target: activities.id,
            set: {
              slot: activityValues.slot,
              mode: activityValues.mode,
              title: activityValues.title,
              objective: activityValues.objective,
              durationMinutes: activityValues.durationMinutes,
              difficulty: activityValues.difficulty,
              promptText: activityValues.promptText,
              feedbackGuide: activityValues.feedbackGuide,
              rubricJson: activityValues.rubricJson,
              answerReveal: activityValues.answerReveal,
              purpose: activityValues.purpose,
              reviewState: activityValues.reviewState,
              segmentIds: activityValues.segmentIds,
              questionsFile: activityValues.questionsFile,
              output: activityValues.output,
              topic: activityValues.topic,
              origin: "drive",
            },
          });
      } catch (err) {
        result.errors.push({
          id: act.id,
          message: `Lỗi upsert activity: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }
    }

    if (existingOrigin !== undefined) {
      result.updated.push(`activity:${act.id}`);
    } else {
      result.added.push(`activity:${act.id}`);
    }
  }

  // Add any structural warnings as non-blocking errors
  for (const w of structureWarnings) {
    result.errors.push({ message: `[warning] ${w}` });
  }

  return result;
}
