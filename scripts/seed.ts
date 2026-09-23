import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import fs from "fs";
import path from "path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { parseAndValidateManifest } from "../src/server/seed/manifest-parser";

async function main() {
  console.log("🌱 Bắt đầu nạp dữ liệu từ content/english-lab/manifest.yaml...\n");

  const baseDir = path.resolve(process.cwd(), "content/english-lab");
  const manifestPath = path.resolve(baseDir, "manifest.yaml");

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Không tìm thấy file: ${manifestPath}`);
    console.error("Vui lòng tạo manifest.yaml từ manifest.example.yaml trước khi nạp.");
    process.exit(1);
  }

  const manifestContent = fs.readFileSync(manifestPath, "utf-8");

  // 1. Parse & validate — stops immediately on any missing file without touching DB
  console.log("🔍 Đang kiểm tra tính toàn vẹn của manifest và các file văn bản...");
  const parsed = parseAndValidateManifest(baseDir, manifestContent);

  if (!parsed.success) {
    console.error("\n❌ PHÁT HIỆN LỖI — DỪNG NẠP (KHÔNG NẠP NỬA CHỪNG):");
    for (const err of parsed.errors) {
      console.error(`   • ${err}`);
    }
    console.error("\nKhắc phục các lỗi trên rồi chạy lại 'npm run seed'.\n");
    process.exit(1);
  }

  console.log("✅ Toàn bộ file liên quan đều hợp lệ!");
  console.log(`   • Sources hợp lệ: ${parsed.sourcesToUpsert.length}`);
  console.log(`   • Segments hợp lệ: ${parsed.segmentsToUpsert.length}`);
  console.log(`   • Activities đã duyệt (approved): ${parsed.activitiesToUpsert.length}`);

  if (parsed.activitiesToUpsert.length === 0) {
    console.log("⚠️ Không có activity nào có review_state: approved. Không có gì để nạp.");
    process.exit(0);
  }

  // 2. Connect DB
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL chưa được thiết lập trong .env.local");
    process.exit(1);
  }

  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    // 3. Upsert sources
    console.log("\n📦 Đang nạp sources...");
    for (const s of parsed.sourcesToUpsert) {
      await db
        .insert(schema.sources)
        .values({
          id: s.id,
          title: s.title,
          kind: s.kind,
          permission: s.permission,
          locatorType: s.locatorType,
          url: s.url,
          reviewState: s.reviewState,
          notes: s.notes,
        })
        .onConflictDoUpdate({
          target: schema.sources.id,
          set: {
            title: sql`excluded.title`,
            kind: sql`excluded.kind`,
            permission: sql`excluded.permission`,
            locatorType: sql`excluded.locator_type`,
            url: sql`excluded.url`,
            reviewState: sql`excluded.review_state`,
            notes: sql`excluded.notes`,
            updatedAt: new Date(),
          },
        });
      console.log(`   ✔ Source [${s.id}]: ${s.title}`);
    }

    // 4. Upsert source_segments
    console.log("\n📦 Đang nạp source segments...");
    for (const seg of parsed.segmentsToUpsert) {
      await db
        .insert(schema.sourceSegments)
        .values({
          id: seg.id,
          sourceId: seg.sourceId,
          page: seg.page,
          startSeconds: seg.startSeconds,
          endSeconds: seg.endSeconds,
          textContent: seg.textContent,
          transcriptContent: seg.transcriptContent,
          verifiedTranscript: seg.verifiedTranscript,
          language: seg.language,
        })
        .onConflictDoUpdate({
          target: schema.sourceSegments.id,
          set: {
            sourceId: sql`excluded.source_id`,
            page: sql`excluded.page`,
            startSeconds: sql`excluded.start_seconds`,
            endSeconds: sql`excluded.end_seconds`,
            textContent: sql`excluded.text_content`,
            transcriptContent: sql`excluded.transcript_content`,
            verifiedTranscript: sql`excluded.verified_transcript`,
            language: sql`excluded.language`,
            updatedAt: new Date(),
          },
        });
      console.log(`   ✔ Segment [${seg.id}] (Source: ${seg.sourceId})`);
    }

    // 5. Upsert activities
    console.log("\n📦 Đang nạp activities (chỉ approved)...");
    for (const act of parsed.activitiesToUpsert) {
      await db
        .insert(schema.activities)
        .values({
          id: act.id,
          slot: act.slot,
          mode: act.mode,
          title: act.title,
          objective: act.objective,
          durationMinutes: act.durationMinutes,
          difficulty: act.difficulty,
          promptText: act.promptText,
          feedbackGuide: act.feedbackGuide,
          rubricJson: act.rubricJson,
          answerReveal: act.answerReveal,
          purpose: act.purpose,
          reviewState: act.reviewState,
          segmentIds: act.segmentIds,
          questionsFile: act.questionsFile,
          output: act.output,
        })
        .onConflictDoUpdate({
          target: schema.activities.id,
          set: {
            slot: sql`excluded.slot`,
            mode: sql`excluded.mode`,
            title: sql`excluded.title`,
            objective: sql`excluded.objective`,
            durationMinutes: sql`excluded.duration_minutes`,
            difficulty: sql`excluded.difficulty`,
            promptText: sql`excluded.prompt_text`,
            feedbackGuide: sql`excluded.feedback_guide`,
            rubricJson: sql`excluded.rubric_json`,
            answerReveal: sql`excluded.answer_reveal`,
            purpose: sql`excluded.purpose`,
            reviewState: sql`excluded.review_state`,
            segmentIds: sql`excluded.segment_ids`,
            questionsFile: sql`excluded.questions_file`,
            output: sql`excluded.output`,
            updatedAt: new Date(),
          },
        });
      console.log(`   ✔ Activity [${act.id}] (${act.mode}): ${act.title}`);
    }

    console.log("\n🎉 HOÀN TẤT NẠP NỘI DUNG THÀNH CÔNG!");
    console.log(`Đã nạp / cập nhật ${parsed.activitiesToUpsert.length} activities: ${parsed.activitiesToUpsert.map((a) => a.id).join(", ")}`);
  } catch (err) {
    console.error("\n❌ Lỗi khi ghi vào database:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
