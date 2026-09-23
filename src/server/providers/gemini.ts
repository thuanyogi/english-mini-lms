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

// ──────────────────────────────────────────────
// Reading Evaluation
// ──────────────────────────────────────────────

const READING_SYSTEM_INSTRUCTION = `Bạn là Chuyên gia Cố vấn Ngôn ngữ Y khoa hỗ trợ Bác sĩ Minh (chuyên ngành Cơ xương khớp và can thiệp giảm đau siêu âm).
Nhiệm vụ: Đánh giá bài đọc–dịch y khoa từ tiếng Anh sang tiếng Việt của học viên.

QUY TẮC BẮT BUỘC:
1. Chỉ nhận xét về độ trung thành của bản dịch so với đoạn gốc tiếng Anh, các câu hoặc ý bị bỏ sót/dịch lệch nghĩa, tính chính xác của các thuật ngữ giải phẫu/can thiệp, và độ tự nhiên của câu văn tiếng Việt chuyên ngành y tế.
2. TUYỆT ĐỐI KHÔNG nhận xét chuyên môn y khoa, KHÔNG đưa ra khuyến nghị điều trị, KHÔNG phỏng đoán ca bệnh lâm sàng hay thuốc điều trị.
3. Trường limitations BẮT BUỘC phải ghi: "Nhận xét của AI chỉ mang tính chất rèn luyện kỹ năng ngôn ngữ và độ trung thành với đoạn gốc; tuyệt đối không phải là khuyến nghị điều trị y khoa."
4. Mỗi observation phải chỉ rõ:
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  const ai = new GoogleGenAI({ apiKey });

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

// ──────────────────────────────────────────────
// Vocabulary Quick-Capture
// ──────────────────────────────────────────────

export const QuickCaptureSchema = z.object({
  phrase: z.string(),
  ipa: z.string(),
  context_meaning: z.string(),
  example_sentence: z.string(),
});

export type QuickCaptureResult = z.infer<typeof QuickCaptureSchema>;

const QUICK_CAPTURE_SYSTEM_INSTRUCTION = `Bạn là Trợ lý Từ vựng Y khoa dành cho Bác sĩ Minh (chuyên ngành Cơ xương khớp và can thiệp giảm đau dưới hướng dẫn siêu âm).
Nhiệm vụ: Khi bác sĩ bôi đen một từ hoặc cụm từ trong tài liệu y khoa, hãy phân tích và trả về đúng định dạng JSON:
{
  "phrase": string (cụm từ chuẩn hóa),
  "ipa": string (phiên âm quốc tế IPA chuẩn),
  "context_meaning": string (nghĩa chính xác và chuyên biệt trong ngữ cảnh lâm sàng Cơ xương khớp / siêu âm can thiệp, không liệt kê nghĩa chung chung),
  "example_sentence": string (câu ví dụ tiếng Anh thực tế trong giao tiếp y khoa hoặc hội nghị)
}
Trả về đúng định dạng JSON, không thêm chữ markdown ngoài JSON.`;

const quickCaptureJsonSchema = {
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  const ai = new GoogleGenAI({ apiKey });

  const userContent = `TỪ / CỤM TỪ ĐƯỢC CHỌN: "${selectedText}"
CÂU NGỮ CẢNH GỐC: "${surroundingSentence}"
NGUỒN THAM KHẢO: "${sourceRef || "Tài liệu y khoa"}"

Hãy tra cứu và trả về JSON theo đúng schema.`;

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
  const tokenInput = response.usageMetadata?.promptTokenCount || 0;
  const tokenOutput = response.usageMetadata?.candidatesTokenCount || 0;

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch (err) {
    throw new Error(`Lỗi parse JSON từ Gemini: ${err instanceof Error ? err.message : String(err)}`);
  }

  const validated = QuickCaptureSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`JSON từ Gemini không đúng schema: ${validated.error.message}`);
  }

  return {
    result: validated.data,
    tokenInput,
    tokenOutput,
    modelName,
  };
}

// ──────────────────────────────────────────────
// Speaking Evaluation (Multimodal Audio Input)
// ──────────────────────────────────────────────

export const SpeakingFeedbackSchema = z.object({
  transcript: z.string(),
  transcript_confidence: z.number().min(0).max(1).optional(),
  observations: z
    .array(
      z.object({
        location: z.string(),
        original: z.string(),
        issue: z.string(),
        suggestion: z.string(),
        example: z.string(),
        retry_prompt: z.string(),
      })
    )
    .max(3),
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

const SPEAKING_SYSTEM_INSTRUCTION = `Bạn là Giảng viên Cố vấn Speaking tiếng Anh Y khoa & Giao tiếp Hội nghị dành cho Bác sĩ Minh (chuyên ngành Cơ xương khớp và can thiệp giảm đau siêu âm).
Nhiệm vụ: Đánh giá bài nói (Speaking / Shadowing) từ âm thanh trực tiếp của bác sĩ.

QUY TẮC BẮT BUỘC:
1. Bóc băng chính xác từng từ mà người nói đã phát âm thành văn bản tiếng Anh vào trường "transcript".
2. Tối đa 3 observations ưu tiên (observations.length <= 3): tập trung vào từ vựng chuyên ngành, cấu trúc diễn đạt, hoặc lỗi phát âm/ngắt nghỉ quan trọng nhất.
3. Đánh giá phát âm (pronunciation):
   - Nếu có âm thanh: status là "assessed", nhận xét cụ thể về trọng âm từ (word stress), ngữ điệu (intonation), hoặc các phụ âm cuối (ending sounds).
   - TUYỆT ĐỐI: Nếu không có file âm thanh thật (hoặc đầu vào chỉ là văn bản), trường pronunciation.status BẮT BUỘC phải là "not_assessable" và notes nêu rõ: "Không thể chấm phát âm do thiếu dữ liệu âm thanh thực tế."
4. Trường retry_prompt: Đưa ra 1 thử thách nói lại ngắn gọn, trọng tâm vào điểm cần cải thiện nhất.
5. Scores: Chỉ mang kind "practice_estimate" cho các tiêu chí như fluency, pronunciation, vocabulary. Tuyệt đối không sinh "official IELTS band".
6. Limitations: Ghi rõ nhận xét chỉ phục vụ mục đích rèn luyện phản xạ ngôn ngữ.
7. Trả về đúng định dạng JSON tuân thủ schema.`;

const speakingJsonSchema = {
  type: "object",
  properties: {
    transcript: { type: "string" },
    transcript_confidence: { type: "number" },
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
      maxItems: 3,
    },
    pronunciation: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["assessed", "not_assessable"] },
        notes: { type: "string" },
      },
      required: ["status", "notes"],
    },
    retry_prompt: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
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
        required: ["kind", "dimension", "value"],
      },
    },
  },
  required: ["transcript", "observations", "pronunciation", "retry_prompt", "limitations"],
};

export async function evaluateSpeaking(
  audioFile: EvaluateSpeakingAudio | null,
  prompt: string,
  verifiedTranscript?: string,
  modelName = "gemini-2.5-flash"
): Promise<EvaluateSpeakingResult> {
  // BẤT BIẾN SỐ 3: Nếu không có file audio (hoặc rỗng), TUYỆT ĐỐI không chấm phát âm từ transcript
  if (!audioFile || !audioFile.buffer || audioFile.buffer.length === 0) {
    const textPrompt = `ĐỀ BÀI HOẶC NGỮ CẢNH:
${prompt}

${verifiedTranscript ? `BẢN TRANSCRIPT MẪU ĐƯỢC DUYỆT:\n${verifiedTranscript}\n` : ""}
LƯU Ý: Người dùng nộp bài dạng văn bản, KHÔNG CÓ FILE ÂM THANH THỰC TẾ.
Bắt buộc đặt pronunciation.status = "not_assessable".`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment");
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: textPrompt,
      config: {
        systemInstruction: SPEAKING_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseSchema: speakingJsonSchema as any,
        temperature: 0.2,
      },
    });

    const responseText = response.text || "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Gemini không trả về JSON hợp lệ: ${e instanceof Error ? e.message : String(e)}`);
    }

    const validated = SpeakingFeedbackSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`JSON không đúng schema: ${validated.error.message}`);
    }

    // Đảm bảo nghiêm ngặt bất biến not_assessable
    validated.data.pronunciation = {
      status: "not_assessable",
      notes: "Không thể chấm phát âm do thiếu dữ liệu âm thanh thực tế.",
    };

    return {
      feedback: validated.data,
      tokenInput: response.usageMetadata?.promptTokenCount || 0,
      tokenOutput: response.usageMetadata?.candidatesTokenCount || 0,
      modelName,
    };
  }

  // Trường hợp CÓ FILE AUDIO THỰC TẾ: Gửi trực tiếp audio buffer qua multimodal inlineData
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  const ai = new GoogleGenAI({ apiKey });

  const promptText = `ĐỀ BÀI NÓI / BỐI CẢNH HỘI NGHỊ:
${prompt}

${verifiedTranscript ? `TRANSCRIPT CHUẨN CẦN NHẠI GIỌNG (SHADOWING):\n${verifiedTranscript}\n` : ""}
Hãy lắng nghe trực tiếp tệp âm thanh đính kèm, bóc băng chính xác vào transcript, đánh giá phát âm (pronunciation), nhận xét tối đa 3 điểm ưu tiên và trả về JSON theo schema.`;

  async function callGeminiAudioOnce() {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: audioFile!.mimeType,
                data: audioFile!.buffer.toString("base64"),
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        systemInstruction: SPEAKING_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseSchema: speakingJsonSchema as any,
        temperature: 0.2,
      },
    });

    const responseText = response.text || "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Lỗi parse JSON phản hồi từ Gemini: ${e instanceof Error ? e.message : String(e)}`);
    }

    const validated = SpeakingFeedbackSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`Phản hồi Speaking không đúng schema: ${validated.error.message}`);
    }

    // Đảm bảo tối đa 3 observations
    if (validated.data.observations.length > 3) {
      validated.data.observations = validated.data.observations.slice(0, 3);
    }

    return {
      feedback: validated.data,
      tokenInput: response.usageMetadata?.promptTokenCount || 0,
      tokenOutput: response.usageMetadata?.candidatesTokenCount || 0,
      modelName,
    };
  }

  try {
    return await callGeminiAudioOnce();
  } catch (firstErr) {
    console.warn("⚠️ evaluateSpeaking lần 1 thất bại, thử lại lần 2...", firstErr);
    try {
      return await callGeminiAudioOnce();
    } catch (secondErr) {
      console.error("❌ evaluateSpeaking lần 2 tiếp tục thất bại:", secondErr);
      throw new Error(
        `Đánh giá bài nói thất bại sau 2 lần thử: ${secondErr instanceof Error ? secondErr.message : String(secondErr)}`
      );
    }
  }
}

// ──────────────────────────────────────────────
// Vocabulary Review / Spaced Repetition Evaluation
// ──────────────────────────────────────────────

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

const VOCAB_USAGE_SYSTEM_INSTRUCTION = `Bạn là Chuyên gia Ngôn ngữ tiếng Anh Y khoa & Giao tiếp Hội nghị dành cho Bác sĩ Minh (chuyên khoa Cơ xương khớp, can thiệp giảm đau siêu âm).
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

const vocabUsageJsonSchema = {
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  const ai = new GoogleGenAI({ apiKey });

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


