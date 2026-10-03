/**
 * Bố cục 2 cột cho các màn học trên desktop (≥1024px):
 * cột trái = nội dung/đề (dính khi cuộn), cột phải = phần làm bài.
 * Dưới 1024px: xếp 1 cột như cũ (trái trước, phải sau).
 */
export function SessionGrid({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-x-6 lg:grid-cols-2">
      <div className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
        {left}
      </div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}
