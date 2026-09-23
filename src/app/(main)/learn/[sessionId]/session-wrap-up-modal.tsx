"use client";

interface SessionWrapUpModalProps {
  targetMinutes: number;
  isOpen: boolean;
  onSaveAndExit: () => void;
  onSubmit?: () => void;
  onExtend: () => void;
  isSaving?: boolean;
  canSubmit?: boolean;
}

export function SessionWrapUpModal({
  targetMinutes,
  isOpen,
  onSaveAndExit,
  onSubmit,
  onExtend,
  isSaving = false,
  canSubmit = true,
}: SessionWrapUpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-2xl mx-auto shadow-inner">
            ⏱️
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Đã đạt mốc {targetMinutes} phút cam kết!
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Phiên học đã tự động tạm dừng đồng hồ. Bạn có thể lưu nháp để khép lại phiên hôm nay mà <strong>hoàn toàn không bị mất nội dung</strong>, hoặc nộp bài để nhận góp ý từ Gemini.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          {onSubmit && (
            <button
              onClick={onSubmit}
              disabled={!canSubmit || isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>🚀</span> Nộp bài & Nhận nhận xét ngay
            </button>
          )}

          <button
            onClick={onSaveAndExit}
            disabled={isSaving}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⏳</span> Đang lưu nháp an toàn...
              </>
            ) : (
              <>
                <span>💾</span> Lưu nháp an toàn & Khép phiên hôm nay
              </>
            )}
          </button>

          <button
            onClick={onExtend}
            disabled={isSaving}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2"
          >
            <span>⏳</span> Học thêm 5 phút nữa
          </button>
        </div>

        <div className="text-[11px] text-slate-400 text-center">
          💡 Bản nháp luôn được bảo lưu trên máy chủ, bạn có thể quay lại tiếp tục bất kỳ lúc nào.
        </div>
      </div>
    </div>
  );
}
