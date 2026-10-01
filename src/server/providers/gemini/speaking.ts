import {
  SpeakingFeedbackSchema,
  EvaluateSpeakingAudio,
  EvaluateSpeakingResult,
} from "./types";
import { getGeminiClient } from "./client";

export const SPEAKING_SYSTEM_INSTRUCTION = `Bạn là Giảng viên Cố vấn Speaking tiếng Anh Y khoa & Giao tiếp Hội nghị dành cho Bác sĩ Minh (chuyên ngành Cơ xương khớp và can thiệp giảm đau siêu âm).
Nhiệm vụ: Đánh giá bài nói (Speaking / Shadowing) từ âm thanh trực tiếp của bác sĩ.

QUY TẮC BẮT BUỘC:
1. Bóc băng chính xác từng từ mà người nói đã phát âm thành văn bản tiếng Anh vào trường "transcript".
2. Tối đa 3 observations ưu tiên (observations.length <= 3): tập trung vào từ vựng chuyên ngành, cấu trúc diễn đạt, hoặc lỗi phát âm/ngắt nghỉ quan trọng nhất. Mỗi observation phải có category (pronunciation, grammar, vocabulary, fluency, tone, structure).
3. Đánh giá phát âm (pronunciation):
   - Nếu có âm thanh: status là "assessed", nhận xét cụ thể về trọng âm từ (word stress), ngữ điệu (intonation), hoặc các phụ âm cuối (ending sounds).
   - TUYỆT ĐỐI: Nếu không có file âm thanh thật (hoặc đầu vào chỉ là văn bản), trường pronunciation.status BẮT BUỘC phải là "not_assessable" và notes nêu rõ: "Không thể chấm phát âm do thiếu dữ liệu âm thanh thực tế."
4. Trường retry_prompt: Đưa ra 1 thử thách nói lại ngắn gọn, trọng tâm vào điểm cần cải thiện nhất.
5. Scores: Chỉ mang kind "practice_estimate" cho các tiêu chí như fluency, pronunciation, vocabulary. Tuyệt đối không sinh "official IELTS band".
6. Limitations: Ghi rõ nhận xét chỉ phục vụ mục đích rèn luyện phản xạ ngôn ngữ.
7. Trả về đúng định dạng JSON tuân thủ schema.`;

export const speakingJsonSchema = {
  type: "object",
  properties: {
    transcript: { type: "string" },
    transcript_confidence: { type: "number" },
    observations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Phân loại lỗi: pronunciation | grammar | vocabulary | fluency | tone | structure",
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
  const ai = getGeminiClient();

  // BẤT BIẾN SỐ 3: Nếu không có file audio (hoặc rỗng), TUYỆT ĐỐI không chấm phát âm từ transcript
  if (!audioFile || !audioFile.buffer || audioFile.buffer.length === 0) {
    const textPrompt = `ĐỀ BÀI HOẶC NGỮ CẢNH:
${prompt}

${verifiedTranscript ? `BẢN TRANSCRIPT MẪU ĐƯỢC DUYỆT:\n${verifiedTranscript}\n` : ""}
LƯU Ý: Người dùng nộp bài dạng văn bản, KHÔNG CÓ FILE ÂM THANH THỰC TẾ.
Bắt buộc đặt pronunciation.status = "not_assessable".`;

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
