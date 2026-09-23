"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OnboardingProfileData } from "@/server/onboarding/service";

interface OnboardingViewProps {
  initialProfile: OnboardingProfileData | null;
}

const PRIORITY_OPTIONS = [
  "Giao tiếp công việc & lâm sàng hàng ngày",
  "Đọc - dịch sách và bài báo y khoa chuyên ngành",
  "Báo cáo & trao đổi tại hội nghị quốc tế",
  "Luyện thi IELTS mục tiêu 7.5 - 8.0",
];

export default function OnboardingView({ initialProfile }: OnboardingViewProps) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(
    initialProfile?.displayName || "Bác sĩ Minh"
  );
  const [priorities, setPriorities] = useState<string[]>(
    initialProfile?.priorities && initialProfile.priorities.length > 0
      ? initialProfile.priorities
      : [PRIORITY_OPTIONS[0], PRIORITY_OPTIONS[1]]
  );
  const [selfAssessment, setSelfAssessment] = useState(
    initialProfile?.selfAssessment || {
      writing: 3,
      reading: 4,
      speaking: 3,
      listening: 3,
    }
  );
  const [workContext, setWorkContext] = useState(
    initialProfile?.workContext ||
      "Bác sĩ chuyên khoa Cơ Xương Khớp / Siêu âm can thiệp, thường xuyên đọc tài liệu tiếng Anh và trao đổi hội nghị."
  );
  const [ieltsVariant, setIeltsVariant] = useState<"academic" | "general" | "none">(
    initialProfile?.ieltsVariant || "none"
  );
  const [currentBook, setCurrentBook] = useState(
    initialProfile?.currentBook || "Musculoskeletal Ultrasound Handbook"
  );
  const [preferredStudyTime, setPreferredStudyTime] = useState(
    initialProfile?.preferredStudyTime || "21:00"
  );
  const [targetMinutesDefault, setTargetMinutesDefault] = useState<number>(
    initialProfile?.targetMinutesDefault || 30
  );

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const togglePriority = (opt: string) => {
    setPriorities((prev) =>
      prev.includes(opt) ? prev.filter((p) => p !== opt) : [...prev, opt]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          priorities,
          selfAssessment,
          workContext,
          ieltsVariant: ieltsVariant === "none" ? null : ieltsVariant,
          currentBook,
          preferredStudyTime,
          targetMinutesDefault,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => {
          router.push("/today");
          router.refresh();
        }, 1200);
      } else {
        const err = await res.json();
        alert(err.error || "Không thể lưu thông tin hồ sơ");
      }
    } catch (err) {
      console.error("Lỗi lưu hồ sơ onboarding:", err);
      alert("Lỗi kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link
          href="/today"
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition"
        >
          ← Quay lại Hôm nay
        </Link>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <span>🎯</span> Thiết lập Hồ sơ Học tập (Onboarding)
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Cung cấp thông tin bối cảnh công việc và mục tiêu cá nhân để hệ thống gợi ý bài học sát với nhu cầu thực tế của Bác sĩ.
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs">
          <span>✅</span> Đã lưu hồ sơ thành công! Đang chuyển hướng về trang Hôm nay...
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* 1. Tên hiển thị */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            1. Tên hiển thị
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ví dụ: Bác sĩ Minh"
            required
          />
        </div>

        {/* 2. Mục tiêu ưu tiên */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            2. Mục tiêu ưu tiên (chọn một hoặc nhiều)
          </label>
          <div className="space-y-2">
            {PRIORITY_OPTIONS.map((opt) => {
              const checked = priorities.includes(opt);
              return (
                <button
                  type="button"
                  key={opt}
                  onClick={() => togglePriority(opt)}
                  className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between ${
                    checked
                      ? "border-blue-500 bg-blue-50/60 font-semibold text-blue-900"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <span>{opt}</span>
                  <span className="text-base">{checked ? "☑️" : "⬜"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Tự đánh giá 4 kỹ năng (1-5) */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            3. Tự đánh giá năng lực hiện tại (Thang điểm 1 - 5)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                { key: "writing", label: "✍️ Viết (Writing)" },
                { key: "reading", label: "📖 Đọc (Reading)" },
                { key: "speaking", label: "🎙️ Nói (Speaking)" },
                { key: "listening", label: "🎧 Nghe (Listening)" },
              ] as const
            ).map((skill) => (
              <div
                key={skill.key}
                className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl space-y-1.5"
              >
                <div className="flex justify-between text-xs font-semibold text-slate-800">
                  <span>{skill.label}</span>
                  <span className="text-blue-600 font-bold">
                    {selfAssessment[skill.key]} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={selfAssessment[skill.key]}
                  onChange={(e) =>
                    setSelfAssessment((prev) => ({
                      ...prev,
                      [skill.key]: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>1 (Cơ bản)</span>
                  <span>3 (Khá)</span>
                  <span>5 (Thành thạo)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Bối cảnh công việc */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            4. Bối cảnh chuyên môn & công việc
          </label>
          <textarea
            value={workContext}
            onChange={(e) => setWorkContext(e.target.value)}
            rows={3}
            className="w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            placeholder="Mô tả chuyên khoa, công việc thường ngày cần tiếng Anh..."
          />
        </div>

        {/* 5. Biến thể IELTS (Tuỳ chọn - cho phép bỏ trống) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            5. Biến thể IELTS (Tùy chọn - có thể bỏ trống)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "academic", label: "Academic" },
              { id: "general", label: "General" },
              { id: "none", label: "Không thi / Bỏ qua" },
            ].map((variant) => (
              <button
                type="button"
                key={variant.id}
                onClick={() =>
                  setIeltsVariant(variant.id as "academic" | "general" | "none")
                }
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition ${
                  ieltsVariant === variant.id
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                {variant.label}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Sách đang đọc */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            6. Sách / Tài liệu y khoa đang đọc
          </label>
          <input
            type="text"
            value={currentBook}
            onChange={(e) => setCurrentBook(e.target.value)}
            className="w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tên giáo trình hoặc sách chuyên khảo đang tham khảo..."
          />
        </div>

        {/* 7. Giờ học quen & Thời lượng mặc định */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              7. Khung giờ học quen thuộc
            </label>
            <input
              type="text"
              value={preferredStudyTime}
              onChange={(e) => setPreferredStudyTime(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ví dụ: 21:00 hoặc 06:30 sáng"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              8. Thời lượng phiên học mặc định
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetMinutesDefault(30)}
                className={`flex-1 py-3 rounded-xl border text-xs sm:text-sm font-semibold transition ${
                  targetMinutesDefault === 30
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                ⏱️ 30 phút
              </button>
              <button
                type="button"
                onClick={() => setTargetMinutesDefault(45)}
                className={`flex-1 py-3 rounded-xl border text-xs sm:text-sm font-semibold transition ${
                  targetMinutesDefault === 45
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                ⏱️ 45 phút
              </button>
            </div>
          </div>
        </div>

        {/* Nút Submit */}
        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-50 text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span> Đang lưu hồ sơ...
              </>
            ) : (
              <>
                <span>💾</span> Lưu hồ sơ và hoàn tất Onboarding
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
