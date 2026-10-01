import { WritingFeedbackSchema, EvaluateWritingResult } from "./types";
import { getGeminiClient } from "./client";

export const geminiResponseSchema = {
  type: "object",
  properties: {
    observations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Phân loại lỗi: grammar | vocabulary | structure | pronunciation | tone | fluency",
          },
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

export const WRITING_SYSTEM_INSTRUCTION = `Bạn là Trợ lý Cố vấn Anh ngữ Chuyên biệt dành cho Bác sĩ Minh (chuyên ngành Cơ xương khớp và can thiệp giảm đau dưới hướng dẫn siêu âm).
Nhiệm vụ của bạn là đánh giá bài viết tiếng Anh (writing) của bác sĩ theo đề bài và tiêu chí rubric được cung cấp.

QUY TẮC BẮT BUỘC:
1. Luôn tôn trọng, khuyến khích và chuyên nghiệp. Nhận xét bằng tiếng Việt ngắn gọn, dễ hiểu; các câu ví dụ, sửa mẫu và trích dẫn bằng tiếng Anh.
2. Tập trung tối đa 3-5 điểm góp ý ưu tiên nhất: tính mạch lạc (clarity), cấu trúc email/đoạn (structure), văn phong trang trọng học thuật (formal academic/professional tone), từ vựng chính xác.
3. Mỗi observation bắt buộc phải có đầy đủ:
   - category: Phân loại lỗi chính (grammar, vocabulary, structure, tone, pronunciation, fluency)
   - location: Vị trí cụ thể (ví dụ: "Đoạn 1, câu 2")
   - original: Trích dẫn câu gốc của học viên
   - issue: Vấn đề (tại sao chưa tối ưu, thiếu trang trọng, hay lỗi ngữ pháp)
   - suggestion: Hướng dẫn cách sửa
   - example: Câu mẫu tiếng Anh hoàn chỉnh viết lại
   - retry_prompt: Yêu cầu thử thách người học viết lại câu này
4. Không bao giờ xuất hiện trường "official IELTS band". Điểm số chỉ ở scores với kind="practice_estimate".
5. Trường limitations luôn phải ghi rõ điểm số và góp ý chỉ mang tính tham khảo nội bộ phục vụ rèn luyện, không thay thế giám khảo chính thức.
6. Trả về đúng định dạng JSON được yêu cầu.`;

export async function evaluateWriting(
  prompt: string,
  rubric: unknown,
  submissionText: string,
  modelName = "gemini-2.5-flash"
): Promise<EvaluateWritingResult> {
  const ai = getGeminiClient();

  const userContent = `ĐỀ BÀI:
${prompt}

TIÊU CHÍ ĐÁNH GIÁ (RUBRIC):
${JSON.stringify(rubric, null, 2)}

BÀI VIẾT CỦA BÁC SĨ MINH:
${submissionText}

Hãy đánh giá bài viết và trả về kết quả JSON theo đúng schema quy định.`;

  async function callGeminiOnce() {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: userContent,
      config: {
        systemInstruction: WRITING_SYSTEM_INSTRUCTION,
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

  try {
    return await callGeminiOnce();
  } catch (firstError) {
    console.warn("⚠️ Gemini evaluateWriting lần 1 thất bại, thử lại lần 2...", firstError);
    try {
      return await callGeminiOnce();
    } catch (secondError) {
      console.error("❌ Gemini evaluateWriting lần 2 tiếp tục thất bại:", secondError);
      throw new Error(`Đánh giá bài viết thất bại sau 2 lần thử: ${secondError instanceof Error ? secondError.message : String(secondError)}`);
    }
  }
}
