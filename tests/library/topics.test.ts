import { describe, it, expect } from "vitest";
import {
  getTopicMeta,
  compareTopicKeys,
  isValidTopicKey,
  UNCATEGORIZED_TOPIC,
} from "@/lib/topics";

describe("Topic registry", () => {
  it("returns icon + name for the agreed topics", () => {
    expect(getTopicMeta("giao-tiep-hoi-nghi")).toMatchObject({
      icon: "🎤",
      name: "Hội nghị & email học thuật",
    });
    expect(getTopicMeta("luyen-ielts").icon).toBe("📝");
  });

  it("maps null / uncategorized to 'Chưa phân loại'", () => {
    expect(getTopicMeta(null).name).toBe("Chưa phân loại");
    expect(getTopicMeta(UNCATEGORIZED_TOPIC).name).toBe("Chưa phân loại");
  });

  it("derives a readable name for an unknown key", () => {
    const meta = getTopicMeta("tieng-anh-du-lich");
    expect(meta.key).toBe("tieng-anh-du-lich");
    expect(meta.name).toBe("Tieng anh du lich");
  });

  it("orders known topics first, unknown ABC, uncategorized last", () => {
    const keys: Array<string | null> = [
      null,
      "zeta",
      "luyen-ielts",
      "alpha",
      "giao-tiep-hoi-nghi",
    ];
    expect(keys.sort(compareTopicKeys)).toEqual([
      "giao-tiep-hoi-nghi",
      "luyen-ielts",
      "alpha",
      "zeta",
      null,
    ]);
  });

  it("validates slug format", () => {
    expect(isValidTopicKey("doc-sach-y-khoa")).toBe(true);
    expect(isValidTopicKey("Doc Sach")).toBe(false);
    expect(isValidTopicKey("-bad")).toBe(false);
    expect(isValidTopicKey("")).toBe(false);
  });
});
