// Service Worker tối thiểu cho English Mini LMS
// BẢO MẬT: Chỉ cache App Shell, TUYỆT ĐỐI KHÔNG cache audio, bài nộp cá nhân, hay API endpoints.

const CACHE_NAME = "english-lms-shell-v1";
const APP_SHELL_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// Install: Cache các tài nguyên app shell tĩnh
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Dọn dẹp cache cũ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Kiểm soát chặt chẽ chính sách bộ nhớ đệm
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Tuyệt đối không cache API, Audio, Supabase Storage, và dữ liệu người học
  const isExcluded =
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.hostname.includes("supabase.co") ||
    url.pathname.includes("learner-media") ||
    url.pathname.endsWith(".webm") ||
    url.pathname.endsWith(".mp4") ||
    url.pathname.endsWith(".mp3") ||
    url.pathname.endsWith(".wav") ||
    event.request.method !== "GET";

  if (isExcluded) {
    // Trực tiếp gọi mạng, không lưu bất kỳ dữ liệu nhạy cảm nào vào cache trình duyệt
    return;
  }

  // 2. Với các tài nguyên tĩnh (CSS, JS, Fonts, App Shell Icons)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }

  // 3. Với các trang HTML khác: Network first
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
