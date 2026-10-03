import { describe, it, expect } from "vitest";
import {
  buildYouGlishFallbackUrl,
  normalizeYouGlishQuery,
  YOUGLISH_MAX_QUERY_LENGTH,
  YOUGLISH_SCRIPT_URL,
} from "@/lib/youglish";

describe("YouGlish helpers", () => {
  it("trỏ tới script widget chính thức qua HTTPS", () => {
    expect(YOUGLISH_SCRIPT_URL).toBe("https://youglish.com/public/emb/widget.js");
  });

  describe("normalizeYouGlishQuery", () => {
    it("trả chuỗi rỗng khi không có dữ liệu", () => {
      expect(normalizeYouGlishQuery(undefined)).toBe("");
      expect(normalizeYouGlishQuery(null)).toBe("");
      expect(normalizeYouGlishQuery("   ")).toBe("");
    });

    it("gộp khoảng trắng và bỏ dấu câu ở hai đầu", () => {
      expect(normalizeYouGlishQuery("  rotator   cuff,  ")).toBe("rotator cuff");
      expect(normalizeYouGlishQuery('"tendinopathy".')).toBe("tendinopathy");
    });

    it("giữ dấu gạch nối và nháy bên trong từ", () => {
      expect(normalizeYouGlishQuery("well-being")).toBe("well-being");
      expect(normalizeYouGlishQuery("don't")).toBe("don't");
    });

    it("cắt truy vấn quá dài ở ranh giới từ", () => {
      const long = Array.from({ length: 40 }, () => "radiculopathy").join(" ");
      const result = normalizeYouGlishQuery(long);
      expect(result.length).toBeLessThanOrEqual(YOUGLISH_MAX_QUERY_LENGTH);
      expect(result.endsWith(" ")).toBe(false);
      expect(result.split(" ").every((w) => w === "radiculopathy")).toBe(true);
    });
  });

  describe("buildYouGlishFallbackUrl", () => {
    it("tạo link pronounce đã encode", () => {
      expect(buildYouGlishFallbackUrl("tendinopathy")).toBe(
        "https://youglish.com/pronounce/tendinopathy/english"
      );
      expect(buildYouGlishFallbackUrl("rotator cuff")).toBe(
        "https://youglish.com/pronounce/rotator%20cuff/english"
      );
    });

    it("không để ký tự đặc biệt phá URL", () => {
      const url = buildYouGlishFallbackUrl("a/b?c=d#e");
      expect(url.startsWith("https://youglish.com/pronounce/")).toBe(true);
      expect(url.endsWith("/english")).toBe(true);
      expect(url.slice("https://youglish.com/pronounce/".length, -"/english".length)).not.toMatch(
        /[/?#]/
      );
    });

    it("về trang chủ khi query rỗng", () => {
      expect(buildYouGlishFallbackUrl("")).toBe("https://youglish.com/");
      expect(buildYouGlishFallbackUrl(undefined)).toBe("https://youglish.com/");
    });
  });
});
