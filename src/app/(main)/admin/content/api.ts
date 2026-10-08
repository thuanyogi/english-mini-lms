import type { FieldError } from "@/lib/content-constants";

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  details: FieldError[];
}

/** Gọi API quản lý nội dung; luôn trả kết quả (không throw) để form hiển thị lỗi. */
export async function sendJson<T>(
  method: "GET" | "POST" | "PATCH",
  url: string,
  body?: unknown
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: json.error || `Lỗi ${res.status}`,
        details: Array.isArray(json.details) ? json.details : [],
      };
    }
    return { ok: true, data: json as T, details: [] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi mạng", details: [] };
  }
}
