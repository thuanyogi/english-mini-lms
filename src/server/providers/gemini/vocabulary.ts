import {
  QuickCaptureSchema,
  QuickCaptureResult,
  VocabUsageEvaluationSchema,
  EvaluateVocabUsageResult,
} from "./types";
import { getGeminiClient } from "./client";

export const QUICK_CAPTURE_SYSTEM_INSTRUCTION = `Bạn là Trợ lý Từ vựng Y khoa dành cho Bác sĩ Minh (chuyên ngành Cơ xương khớp và can thiệp giảm đau dưới hướng dẫn siêu âm).
Nhiệm vụ: Khi bác sĩ bôi đen một từ hoặc cụm từ trong tài liệu y khoa, hãy phân tích và trả về đúng định dạng JSON:
{
  "phrase": string (cụm từ chuẩn hóa),
  "ipa": string (phiên âm quốc tế IPA chuẩn),
  "context_meaning": string (nghĩa chính xác và chuyên biệt trong ngữ cảnh lâm sàng Cơ xương khớp / siêu âm can thiệp, không liệt kê nghĩa chung chung),
  "example_sentence": string (câu ví dụ tiếng Anh thực tế trong giao tiếp y khoa hoặc hội nghị)
}
Trả về đúng định dạng JSON, không thêm chữ markdown ngoài JSON.`;

export const quickCaptureJsonSchema = {
  type: "object",
  properties: {
    phrase: { type: "string" },
    ipa: { type: "string" },
    context_meaning: { type: "string" },
    example_sentence: { type: "string" },
  },
  required: ["phrase", "ipa", "context_meaning", "example_sentence"],
};

export async function quickCaptureVocabulary(
  selectedText: string,
  surroundingSentence: string,
  sourceRef?: string,
  modelName = "gemini-2.5-flash"
): Promise<{ result: QuickCaptureResult; tokenInput: number; tokenOutput: number; modelName: string }> {
  const ai = getGeminiClient();

  const userContent = `TỪ / CỤM TỪ ĐƯỢC CHỌN: "${selectedText}"
CÂU NGỮ CẢNH GỐC: "${surroundingSentence}"
NGUỒN THAM KHẢO: "${sourceRef || "Tài liệu y khoa"}"

Hãy phân tích và trả về đúng JSON theo yêu cầu.`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: userContent,
    config: {
      systemInstruction: QUICK_CAPTURE_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseSchema: quickCaptureJsonSchema as any,
      temperature: 0.1,
    },
  });

  const responseText = response.text || "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch (err) {
    throw new Error(`Gemini không trả về JSON hợp lệ: ${err instanceof Error ? err.message : String(err)}`);
  }

  const validated = QuickCaptureSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`JSON từ Gemini không đúng schema: ${validated.error.message}`);
  }

  return {
    result: validated.data,
    tokenInput: response.usageMetadata?.promptTokenCount || 0,
    tokenOutput: response.usageMetadata?.candidatesTokenCount || 0,
    modelName,
  };
}

export const VOCAB_USAGE_SYSTEM_INSTRUCTION = `Bạn là Chuyên gia Ngôn ngữ tiếng Anh Y khoa & Giao tiếp Hội nghị dành cho Bác sĩ Minh (chuyên khoa Cơ xương khớp, can thiệp giảm đau siêu âm).
Nhiệm vụ: Đánh giá câu trả lời của bác sĩ trong bài tập ôn từ vựng ngắt quãng (Spaced Repetition Micro-challenge).

QUY TẮC ĐÁNH GIÁ:
1. resultStatus:
   - "correct": Sử dụng từ/cụm từ đúng ngữ pháp, chuẩn collocation, và phù hợp với tình huống lâm sàng/giao tiếp.
   - "incorrect": Không dùng từ yêu cầu, hoặc dùng sai hoàn toàn về nghĩa/ngữ pháp làm biến dạng thông điệp.
   - "partial": Hiểu nghĩa và dùng được từ, nhưng còn lỗi ngữ pháp nhỏ, sai giới từ hoặc diễn đạt chưa thật tự nhiên.
2. aiAssessment: Đánh giá 1-2 câu thẳng thắn, mang tính khuyến khích chuyên môn.
3. feedbackNotes: Phân tích về cách kết hợp từ (collocation) và sắc thái ngữ nghĩa y tế nếu có.
4. exampleCorrection: Đưa ra 1 câu mẫu tự nhiên, ngắn gọn, chuẩn phong cách y khoa quốc tế.
5. Luôn trả về đúng định dạng JSON tuân thủ schema.`;

export const vocabUsageJsonSchema = {
  type: "object",
  properties: {
    resultStatus: { type: "string", enum: ["correct", "incorrect", "partial"] },
    aiAssessment: { type: "string" },
    feedbackNotes: { type: "string" },
    exampleCorrection: { type: "string" },
  },
  required: ["resultStatus", "aiAssessment", "feedbackNotes"],
};

export async function evaluateVocabUsage(
  phrase: string,
  contextMeaning: string,
  scenario: string,
  userResponse: string,
  modelName = "gemini-2.5-flash"
): Promise<EvaluateVocabUsageResult> {
  const ai = getGeminiClient();

  const prompt = `TỪ / CỤM TỪ CẦN ÔN TẬP: "${phrase}"
Ý NGHĨA TRONG NGỮ CẢNH: "${contextMeaning}"
TÌNH HUỐNG THỬ THÁCH (SCENARIO): "${scenario}"

CÂU TRẢ LỜI CỦA BÁC SĨ MINH:
"${userResponse}"

Hãy đánh giá và trả về kết quả theo đúng JSON schema.`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: VOCAB_USAGE_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseSchema: vocabUsageJsonSchema as any,
      temperature: 0.1,
    },
  });

  const responseText = response.text || "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch (err) {
    throw new Error(`Lỗi parse JSON từ Gemini: ${err instanceof Error ? err.message : String(err)}`);
  }

  const validated = VocabUsageEvaluationSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`JSON từ Gemini không đúng schema: ${validated.error.message}`);
  }

  return {
    result: validated.data,
    tokenInput: response.usageMetadata?.promptTokenCount || 0,
    tokenOutput: response.usageMetadata?.candidatesTokenCount || 0,
    modelName,
  };
}
