"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON_ACTIVE = "#2563eb";
const ICON_IDLE = "#94a3b8";

const navItems = [
  {
    label: "Hôm nay",
    href: "/today",
    tour: "nav-today",
    icon: (stroke: string) => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Thư viện",
    href: "/library",
    tour: "nav-library",
    icon: (stroke: string) => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    label: "Bài của tôi",
    href: "/my-work",
    tour: "nav-my-work",
    icon: (stroke: string) => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    label: "Sổ từ",
    href: "/vocab",
    tour: "nav-vocab",
    icon: (stroke: string) => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    label: "Tiến độ",
    href: "/progress",
    tour: "nav-progress",
    icon: (stroke: string) => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

function isItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Thanh điều hướng dưới — chỉ hiện ở màn hình hẹp (<1024px). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-50 flex h-[var(--nav-height)] items-start border-t border-slate-200 bg-white pt-2 pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
    >
      {navItems.map((item) => {
        const active = isItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={item.tour}
            aria-current={active ? "page" : undefined}
            className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-1 no-underline"
          >
            {item.icon(active ? ICON_ACTIVE : ICON_IDLE)}
            <span
              className={`text-[0.625rem] leading-none ${
                active ? "font-semibold text-blue-600" : "font-normal text-slate-400"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Sidebar trái — chỉ hiện từ 1024px trở lên. */
export function SideNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-slate-200 bg-white px-3 py-5 lg:flex"
    >
      <div className="mb-6 px-3">
        <p className="text-base font-bold text-slate-900">English Mini LMS</p>
        <p className="text-xs text-slate-500">30–45 phút mỗi ngày</p>
      </div>
      <div className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = isItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={item.tour}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm no-underline transition-colors ${
                active
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.icon(active ? ICON_ACTIVE : ICON_IDLE)}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
