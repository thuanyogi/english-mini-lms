import { GoogleGenAI } from "@google/genai";

export const GEMINI_TIMEOUT_MS = 55_000; // 55 giây (dưới maxDuration=60s của Vercel)

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }
  return new GoogleGenAI({ apiKey });
}
