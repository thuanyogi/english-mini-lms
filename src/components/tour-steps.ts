import type { TourPlacement } from "@/lib/tour-position";

export interface TourStep {
  id: string;
  /** Trang mà bước này hiển thị. */
  route: string;
  /** Giá trị của thuộc tính data-tour trên phần tử cần chỉ vào; bỏ trống = thẻ giữa màn hình. */
  target?: string;
  title: string;
  body: string;
  placement?: TourPlacement;
  /** Hướng khi màn hình hẹp (<1024px), nếu khác desktop. */
  placementMobile?: TourPlacement;
}

/**
 * Các bước hướng dẫn. Nếu phần tử đích không xuất hiện (ví dụ Sổ từ còn trống)
 * thì bước đó tự được bỏ qua.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/today",
    title: "Chào mừng đến English Mini LMS 👋",
    body: "Hướng dẫn ngắn này chỉ cho bạn từng khu vực chính. Bấm Tiếp để bắt đầu, hoặc Bỏ qua nếu muốn tự khám phá.",
  },
  {
    id: "nav",
    route: "/today",
    target: "nav-library",
    title: "Thanh điều hướng",
    body: "Chuyển nhanh giữa Hôm nay, Thư viện, Học, Sổ từ và Tiến độ.",
    placement: "right",
    placementMobile: "top",
  },
  {
    id: "today-start",
    route: "/today",
    target: "today-start",
    title: "Bài học hôm nay",
    body: "Hệ thống gợi ý bài phù hợp theo thời lượng 30/45 phút. Bấm nút này để bắt đầu phiên học.",
    placement: "top",
  },
  {
    id: "library-card",
    route: "/library",
    target: "library-card",
    title: "Thư viện bài học",
    body: "Mỗi thẻ là một bài (Viết, Đọc–dịch, Nói, Nghe). Mở thẻ để xem đề rồi bắt đầu phiên học.",
    placement: "bottom",
  },
  {
    id: "vocab-review",
    route: "/vocab",
    target: "vocab-review",
    title: "Ôn từ theo lịch",
    body: "Từ bạn lưu khi đọc sẽ đến hạn ôn theo Spaced Repetition. Mỗi lần chỉ 1–2 phút.",
    placement: "bottom",
  },
  {
    id: "vocab-item",
    route: "/vocab",
    target: "vocab-item",
    title: "Thẻ từ vựng",
    body: "Bấm vào một thẻ để xem nghĩa, câu gốc và nghe người bản xứ phát âm (YouGlish).",
    placement: "bottom",
  },
  {
    id: "progress-chart",
    route: "/progress",
    target: "progress-chart",
    title: "Tiến độ thực tế",
    body: "Xem phút thực học, tỉ lệ làm độc lập và lỗi lặp — chỉ dựa trên bài đã làm, không có điểm IELTS ước lượng.",
    placement: "bottom",
  },
  {
    id: "done",
    route: "/progress",
    title: "Xong rồi 🎉",
    body: "Bạn có thể xem lại hướng dẫn bất cứ lúc nào trong Cài đặt → “Xem lại hướng dẫn”. Chúc học tốt!",
  },
];
