import { z } from "zod";

export const ObservationSchema = z.object({
  category: z
    .string()
    .default("grammar")
    .describe(
      "Phân loại lỗi chính: grammar (ngữ pháp), vocabulary (từ vựng/thuật ngữ), structure (cấu trúc đoạn/câu), pronunciation (phát âm), tone (văn phong trang trọng), fluency (độ trôi chảy)"
    ),
  location: z.string().describe("Vị trí trong bài, ví dụ: 'Đoạn 1, câu 2' hoặc câu gốc"),
  original: z.string().describe("Câu hoặc cụm từ gốc có vấn đề"),
  issue: z.string().describe("Giải thích vấn đề: độ rõ, ngữ pháp, văn phong, từ vựng chưa trang trọng"),
  suggestion: z.string().describe("Đề xuất cách sửa cụ thể"),
  example: z.string().describe("Ví dụ mẫu tiếng Anh đã viết lại chuẩn mực"),
  retry_prompt: z.string().describe("Yêu cầu/thử thách ngắn mời người học tự viết lại câu này"),
});

export const ScoreSchema = z.object({
  kind: z.literal("practice_estimate"),
  dimension: z.string().describe("Tiêu chí đánh giá, ví dụ: clarity, structure, tone_vocabulary"),
  value: z.number().min(0).max(10).describe("Điểm ước tính luyện tập theo thang 0-10"),
  note: z.string().describe("Lý do cho mức điểm"),
});

export const WritingFeedbackSchema = z.object({
  observations: z.array(ObservationSchema).describe("Tối đa 3–5 điểm góp ý ưu tiên nhất, có vị trí rõ ràng"),
  strengths: z.array(z.string()).describe("2–3 điểm sáng người học đã làm tốt"),
  next_action: z.string().describe("Hành động cụ thể người học cần tập trung khi viết bản sửa"),
  limitations: z.string().describe("Cảnh báo giới hạn: Điểm số chỉ là ước tính luyện tập tham khảo, không phải chứng chỉ IELTS/CEFR chính thức"),
  scores: z.array(ScoreSchema).describe("Điểm luyện tập theo từng chiều tiêu chí"),
});

export type WritingFeedback = z.infer<typeof WritingFeedbackSchema>;

export interface EvaluateWritingResult {
  feedback: WritingFeedback;
  tokenInput: number;
  tokenOutput: number;
  modelName: string;
}

export const QuickCaptureSchema = z.object({
  phrase: z.string(),
  ipa: z.string(),
  context_meaning: z.string(),
  example_sentence: z.string(),
});

export type QuickCaptureResult = z.infer<typeof QuickCaptureSchema>;

export const SpeakingFeedbackSchema = z.object({
  transcript: z.string(),
  transcript_confidence: z.number().min(0).max(1).optional(),
  observations: z.array(ObservationSchema).max(3),
  pronunciation: z.object({
    status: z.enum(["assessed", "not_assessable"]),
    notes: z.string(),
  }),
  retry_prompt: z.string(),
  strengths: z.array(z.string()).default([]),
  next_action: z.string().default(""),
  limitations: z.string().default(
    "Nhận xét luyện tập mang tính chất rèn luyện phản xạ ngôn ngữ, không phải điểm thi IELTS chính thức."
  ),
  scores: z
    .array(
      z.object({
        kind: z.literal("practice_estimate"),
        dimension: z.string(),
        value: z.number(),
        note: z.string().optional(),
      })
    )
    .default([]),
});

export type SpeakingFeedback = z.infer<typeof SpeakingFeedbackSchema>;

export interface EvaluateSpeakingAudio {
  buffer: Buffer;
  mimeType: string;
}

export interface EvaluateSpeakingResult {
  feedback: SpeakingFeedback;
  tokenInput: number;
  tokenOutput: number;
  modelName: string;
}

export const VocabUsageEvaluationSchema = z.object({
  resultStatus: z.enum(["correct", "incorrect", "partial"]),
  aiAssessment: z.string(),
  feedbackNotes: z.string(),
  exampleCorrection: z.string().optional(),
});

export type VocabUsageEvaluation = z.infer<typeof VocabUsageEvaluationSchema>;

export interface EvaluateVocabUsageResult {
  result: VocabUsageEvaluation;
  tokenInput: number;
  tokenOutput: number;
  modelName: string;
}
