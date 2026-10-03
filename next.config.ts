import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // X-Frame-Options bị BỎ QUA vì app nhúng YouTube IFrame Player.
          // Nếu bật DENY/SAMEORIGIN sẽ chặn iframe YouTube trong bài nghe.
          // Thay thế: dùng CSP frame-ancestors nếu cần sau này.
          //
          // YouGlish (src/components/youglish-widget.tsx): widget render iframe youglish.com
          // (gồm video YouTube bên trong) và nạp script từ youglish.com. Hiện app KHÔNG đặt CSP
          // nên không cần whitelist gì. NẾU sau này thêm Content-Security-Policy thì phải cho phép:
          //   script-src https://youglish.com ; frame-src https://youglish.com https://www.youtube.com
          // Lưu ý: Permissions-Policy bên dưới chặn microphone cho iframe bên thứ ba — chỉ ảnh hưởng
          // tính năng "tự ghi âm" trong widget YouGlish, không ảnh hưởng nghe/xem ví dụ.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
