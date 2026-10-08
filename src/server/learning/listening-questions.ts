import fs from "fs";
import path from "path";
import yaml from "yaml";

type RawQuestion = Record<string, unknown>;

/**
 * Nguồn câu hỏi nghe cho một activity (dùng chung cho màn học và chấm điểm):
 *  1. `activities.questions` (DB, admin nhập) — mảng rỗng nghĩa là "không có câu hỏi".
 *  2. File yaml `questionsFile` (hoặc mặc định l1 như hành vi cũ) khi cột DB là null.
 */
export function loadListeningQuestions(activity: {
  questions?: unknown;
  questionsFile?: string | null;
}): RawQuestion[] {
  if (Array.isArray(activity.questions)) {
    return activity.questions.filter(
      (q): q is RawQuestion => typeof q === "object" && q !== null
    );
  }

  const baseDir = path.resolve(process.cwd(), "content/english-lab");
  const qFile = path.resolve(baseDir, activity.questionsFile || "texts/l1-questions.yaml");
  if (!fs.existsSync(qFile)) return [];
  try {
    const parsed = yaml.parse(fs.readFileSync(qFile, "utf-8"));
    return Array.isArray(parsed?.questions) ? parsed.questions : [];
  } catch (err) {
    console.warn("Could not parse listening questions file:", err);
    return [];
  }
}
