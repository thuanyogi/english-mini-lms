import { WritingFeedbackSchema, EvaluateWritingResult } from "./types";
import { getGeminiClient } from "./client";
import { geminiResponseSchema } from "./writing";

export const READING_SYSTEM_INSTRUCTION = `Bạn là Trợ lý Đánh giá Đọc–Dịch Y khoa dành cho Bác sĩ Minh (chuyên khoa Cơ xương khớp, can thiệp giảm đau siêu âm).
Nhiệm vụ của bạn là đánh giá bản dịch tiếng Việt của bác sĩ từ một đoạn văn bản y khoa tiếng Anh chuẩn mực (sách giáo khoa/chuyên khảo quốc tế).

QUY TẮC BẮT BUỘC:
1. Chỉ nhận xét về độ trung thành của bản dịch so với đoạn gốc tiếng Anh, các câu hoặc ý bị bỏ sót/dịch lệch nghĩa, tính chính xác của các thuật ngữ giải phẫu/can thiệp, và độ tự nhiên của câu văn tiếng Việt chuyên ngành y tế.
2. TUYỆT ĐỐI KHÔNG nhận xét chuyên môn y khoa, KHÔNG đưa ra khuyến nghị điều trị, KHÔNG phỏng đoán ca bệnh lâm sàng hay thuốc điều trị.
3. Trường limitations BẮT BUỘC phải ghi: "Nhận xét của AI chỉ mang tính chất rèn luyện kỹ năng ngôn ngữ và độ trung thành với đoạn gốc; tuyệt đối không phải là khuyến nghị điều trị y khoa."
4. Mỗi observation phải chỉ rõ:
   - category: Phân loại lỗi chính (terminology, fidelity, expression, grammar)
   - location: Vị trí câu trong bài dịch hoặc đoạn gốc
   - original: Câu gốc hoặc câu dịch cần sửa
   - issue: Giải thích tại sao dịch sót, lệch nghĩa hoặc diễn đạt chưa tự nhiên
   - suggestion: Đề xuất cách dịch tối ưu
   - example: Câu dịch mẫu tiếng Việt hoàn chỉnh
   - retry_prompt: Yêu cầu thử thách người học dịch lại câu này
5. Scores chỉ mang kind: "practice_estimate" với các tiêu chí: fidelity (độ trung thành), terminology (thuật ngữ chuyên ngành), expression (cách diễn đạt tiếng Việt). Tuyệt đối không có trường "official IELTS band".
6. Trả về đúng định dạng JSON theo schema.`;

export async function evaluateReading(
  segmentText: string,
  submission: {
    mainIdea?: string;
    translation: string;
    keyTerms?: string;
  },
  modelName = "gemini-2.5-flash"
): Promise<EvaluateWritingResult> {
  const ai = getGeminiClient();

  const userContent = `ĐOẠN VĂN BẢN GỐC TIẾNG ANH (TỪ SÁCH CHUYÊN NGÀNH Y KHOA):
${segmentText}

BÀI LÀM CỦA HỌC VIÊN:
1. Ý CHÍNH CỦA ĐOẠN:
${submission.mainIdea || "(Không có)"}

2. BẢN DỊCH TIẾNG VIỆT:
${submission.translation}

3. CÁC THUẬT NGỮ TỰ GIẢI THÍCH:
${submission.keyTerms || "(Không có)"}

Hãy đối chiếu bản dịch với đoạn gốc và trả về JSON nhận xét chi tiết.`;

  async function callGeminiOnce() {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: userContent,
      config: {
        systemInstruction: READING_SYSTEM_INSTRUCTION,
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

    // Đảm bảo limitations có cảnh báo y khoa
    if (!validated.data.limitations.toLowerCase().includes("khuyến nghị")) {
      validated.data.limitations = "Nhận xét của AI chỉ đánh giá kỹ năng ngôn ngữ và mức độ trung thành với đoạn gốc; tuyệt đối không mang tính chất khuyến nghị điều trị y khoa.";
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
    console.warn("⚠️ Gemini evaluateReading lần 1 thất bại, thử lại lần 2...", firstError);
    try {
      return await callGeminiOnce();
    } catch (secondError) {
      console.error("❌ Gemini evaluateReading lần 2 tiếp tục thất bại:", secondError);
      throw new Error(`Đánh giá bài đọc–dịch thất bại sau 2 lần thử: ${secondError instanceof Error ? secondError.message : String(secondError)}`);
    }
  }
}
