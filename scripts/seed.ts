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

    console.log("\n🎉 HOÀN TẤT NẠP NỘI DUNG ACTIVITIES THÀNH CÔNG!");
    console.log(`Đã nạp / cập nhật ${parsed.activitiesToUpsert.length} activities: ${parsed.activitiesToUpsert.map((a) => a.id).join(", ")}`);

    // 6. Upsert demo vocabulary items for existing learners
    console.log("\n📦 Đang nạp danh mục từ vựng mẫu (Vocabulary Vault)...");
    const existingLearners = await db
      .select({ id: schema.learners.id })
      .from(schema.learners);

    if (existingLearners.length > 0) {
      const demoVocabularies = [
        {
          phrase: "suprascapular nerve",
          ipa: "/ˌsuːprəˈskæpjələr nɜːrv/",
          contextMeaning:
            "Thần kinh trên vai (chi phối vận động cơ trên gai, dưới gai và cảm giác khớp vai)",
          originalSentence:
            "When performing a suprascapular nerve block, dynamic high-resolution imaging enables precise localization.",
          sourceType: "book",
          sourceRef: "Sổ tay siêu âm tr.42",
          myAttempt:
            "I routinely use ultrasound to identify the suprascapular nerve for chronic shoulder pain.",
          masteryLevel: 2,
        },
        {
          phrase: "hydrodissection",
          ipa: "/ˌhaɪdroʊdɪˈsɛkʃən/",
          contextMeaning:
            "Thủ thuật bóc tách bằng thủy dịch (dùng áp lực dịch lỏng giải phóng chèn ép dính thần kinh)",
          originalSentence:
            "Ultrasound-guided median nerve hydrodissection provides immediate decompressive relief.",
          sourceType: "article",
          sourceRef: "Carpal Tunnel Protocol",
          myAttempt:
            "Hydrodissection is effective for liberating entrapped peripheral nerves without surgery.",
          masteryLevel: 1,
        },
        {
          phrase: "radicular pain",
          ipa: "/rəˈdɪkjələr peɪn/",
          contextMeaning:
            "Đau rễ thần kinh (cơn đau buốt nhói lan dọc theo dải cảm giác da tương ứng do chèn ép rễ)",
          originalSentence:
            "That classic dermatomal radiation points strongly toward an L5-S1 lumbar radiculopathy.",
          sourceType: "clinical",
          sourceRef: "Clinical consultation",
          myAttempt:
            "The patient complained of severe radicular pain radiating down the posterior thigh.",
          masteryLevel: 3,
        },
        {
          phrase: "anechoic",
          ipa: "/ˌæn.ɛˈkoʊ.ɪk/",
          contextMeaning:
            "Không có hồi âm / trống âm (vùng đen tuyền trên siêu âm, đặc trưng cho chất lỏng như máu, dịch khớp)",
          originalSentence:
            "The effusion appears as an anechoic fluid collection distending the joint capsule.",
          sourceType: "book",
          sourceRef: "Musculoskeletal Ultrasound Handbook",
          myAttempt:
            "We identified an anechoic pocket of fluid inside the suprapatellar bursa.",
          masteryLevel: 2,
        },
        {
          phrase: "in-plane needle trajectory",
          ipa: "/ɪn pleɪn ˈniːdl trəˈdʒɛktəri/",
          contextMeaning:
            "Kỹ thuật đưa kim trong mặt phẳng (quan sát toàn bộ thân kim và đầu kim theo trục dọc đầu dò)",
          originalSentence:
            "An in-plane needle trajectory represents a critical technical principle for achieving safety.",
          sourceType: "book",
          sourceRef: "Ultrasound Handbook p.42",
          myAttempt:
            "Maintaining an in-plane needle trajectory prevents accidental vascular penetration.",
          masteryLevel: 1,
        },
        {
          phrase: "subacromial impingement",
          ipa: "/ˌsʌb.əˈkroʊ.mi.əl ɪmˈpɪndʒ.mənt/",
          contextMeaning: "Hội chứng xung đột / chèn ép dưới mỏm cùng vai",
          originalSentence:
            "Notice how dynamic scanning easily identifies subacromial impingement during active abduction.",
          sourceType: "video",
          sourceRef: "Conference talk 01",
          myAttempt:
            "Dynamic ultrasound is helpful for confirming painful subacromial impingement.",
          masteryLevel: 0,
        },
        {
          phrase: "paresthesia",
          ipa: "/ˌpær.ɪsˈθiː.ʒə/",
          contextMeaning: "Dị cảm (cảm giác tê rần rần, châm chích như kiến bò)",
          originalSentence:
            "The patient reported numbness and paresthesia in the distribution of the median nerve.",
          sourceType: "clinical",
          sourceRef: "Clinical rounds",
          myAttempt:
            "She experienced nocturnal paresthesia affecting the thumb and index finger.",
          masteryLevel: 2,
        },
        {
          phrase: "point-of-care ultrasound",
          ipa: "/pɔɪnt əv ker ˈʌltrəsaʊnd/",
          contextMeaning:
            "Siêu âm tại giường bệnh / siêu âm tức thì (POCUS)",
          originalSentence:
            "Point-of-care ultrasound has transitioned to an indispensable diagnostic pillar in pain management.",
          sourceType: "video",
          sourceRef: "Symposium 2026",
          myAttempt:
            "Integrating point-of-care ultrasound allows prompt intervention during clinical evaluation.",
          masteryLevel: 3,
        },
      ];

      for (const learner of existingLearners) {
        for (const item of demoVocabularies) {
          const [exists] = await db
            .select({ id: schema.vocabularyVault.id })
            .from(schema.vocabularyVault)
            .where(
              sql`${schema.vocabularyVault.learnerId} = ${learner.id} AND ${schema.vocabularyVault.phrase} = ${item.phrase}`
            )
            .limit(1);

          if (!exists) {
            await db.insert(schema.vocabularyVault).values({
              learnerId: learner.id,
              phrase: item.phrase,
              ipa: item.ipa,
              contextMeaning: item.contextMeaning,
              originalSentence: item.originalSentence,
              sourceType: item.sourceType,
              sourceRef: item.sourceRef,
              myAttempt: item.myAttempt,
              masteryLevel: item.masteryLevel,
              dueAt: new Date(),
            });
            console.log(
              `   ✔ Added vocabulary "${item.phrase}" for learner ${learner.id}`
            );
          }
        }
      }
    } else {
      console.log(
        "   ℹ Chưa có learner nào trong DB. Từ vựng sẽ được nạp sau khi người dùng đăng nhập lần đầu."
      );
    }
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
