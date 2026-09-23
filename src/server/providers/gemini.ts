import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const ObservationSchema = z.object({
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

const geminiResponseSchema = {
  type: "object",
  properties: {
    observations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          location: { type: "string" },
          original: { type: "string" },
          issue: { type: "string" },
          suggestion: { type: "string" },
          example: { type: "string" },
          retry_prompt: { type: "string" },
        },
        required: ["location", "original", "issue", "suggestion", "example", "retry_prompt"],
      },
    },
    strengths: {
      type: "array",
      items: { type: "string" },
    },
    next_action: { type: "string" },
    limitations: { type: "string" },
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["practice_estimate"] },
          dimension: { type: "string" },
          value: { type: "number" },
          note: { type: "string" },
        },
        required: ["kind", "dimension", "value", "note"],
      },
    },
  },
  required: ["observations", "strengths", "next_action", "limitations", "scores"],
};

const SYSTEM_INSTRUCTION = `Bạn là Trợ lý Cố vấn Anh ngữ Chuyên biệt dành cho Bác sĩ Minh (chuyên ngành Cơ xương khớp và can thiệp giảm đau dưới hướng dẫn siêu âm).
Nhiệm vụ của bạn là đánh giá bài viết tiếng Anh (writing) của bác sĩ theo đề bài và tiêu chí rubric được cung cấp.

QUY TẮC BẮT BUỘC:
1. Luôn tôn trọng, khuyến khích và chuyên nghiệp. Nhận xét bằng tiếng Việt ngắn gọn, dễ hiểu; các câu ví dụ, sửa mẫu và trích dẫn bằng tiếng Anh.
2. Tập trung tối đa 3-5 điểm góp ý ưu tiên nhất: tính mạch lạc (clarity), cấu trúc email/đoạn (structure), văn phong trang trọng học thuật (formal academic/professional tone), từ vựng chính xác.
3. Mỗi observation bắt buộc phải có đầy đủ:
   - location: Vị trí cụ thể (ví dụ: "Đoạn 1, câu 2")
   - original: Trích dẫn câu gốc của học viên
   - issue: Vấn đề (tại sao chưa tối ưu, thiếu trang trọng, hay lỗi ngữ pháp)
   - suggestion: Hướng dẫn cách sửa
   - example: Câu mẫu tiếng Anh hoàn chỉnh viết lại
   - retry_prompt: Yêu cầu thử thách người học viết lại câu này
4. Không bao giờ xuất hiện trường "official IELTS band". Điểm số chỉ ở scores với kind="practice_estimate".
5. Trường limitations luôn phải ghi rõ điểm số và góp ý chỉ mang tính tham khảo nội bộ phục vụ rèn luyện, không thay thế giám khảo chính thức.
6. Trả về đúng định dạng JSON được yêu cầu.`;

/**
 * Đánh giá bài viết sử dụng Gemini API với structured output và Zod validation.
 * Nếu JSON không khớp schema, tự động retry 1 lần.
 */
export async function evaluateWriting(
  promptText: string,
  rubricJson: unknown,
  submissionText: string,
  modelName = "gemini-2.5-flash"
): Promise<EvaluateWritingResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  const ai = new GoogleGenAI({ apiKey });

  const rubricDescription = rubricJson
    ? typeof rubricJson === "string"
      ? rubricJson
      : JSON.stringify(rubricJson, null, 2)
    : "Đánh giá theo 3 tiêu chí: clarity (độ rõ), structure (cấu trúc), tone_vocabulary (văn phong & từ vựng).";

  const userContent = `ĐỀ BÀI HOẠT ĐỘNG:
${promptText}

TIÊU CHÍ RUBRIC:
${rubricDescription}

BÀI LÀM CỦA HỌC VIÊN (BS. MINH):
${submissionText}

Hãy phân tích bài viết trên và trả về kết quả JSON theo đúng schema.`;

  // Helper hàm gọi API một lần
  async function callGeminiOnce() {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: userContent,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseSchema: geminiResponseSchema as any,
        temperature: 0.2,
      },
    });

    const responseText = response.text || "";
    const tokenInput = response.usageMetadata?.promptTokenCount || 0;
    const tokenOutput = response.usageMetadata?.candidatesTokenCount || 0;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Gemini không trả về JSON hợp lệ: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    const validated = WritingFeedbackSchema.safeParse(parsedJson);
    if (!validated.success) {
      throw new Error(`JSON không đúng schema: ${validated.error.message}`);
    }

    return {
      feedback: validated.data,
      tokenInput,
      tokenOutput,
      modelName,
    };
  }

  // Gọi lần 1
  try {
    return await callGeminiOnce();
  } catch (firstError) {
    console.warn("⚠️ Gemini evaluateWriting lần 1 thất bại, đang thử lại lần 2...", firstError);
    // Retry 1 lần
    try {
      return await callGeminiOnce();
    } catch (secondError) {
      console.error("❌ Gemini evaluateWriting lần 2 tiếp tục thất bại:", secondError);
      throw new Error(`Đánh giá bài viết thất bại sau 2 lần thử: ${secondError instanceof Error ? secondError.message : String(secondError)}`);
    }
  }
}
