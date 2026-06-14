"use client";

import Link from "next/link";

type NavPage = "write" | "gallery";

const baseLink =
  "rounded-full px-4 py-1.5 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/60";
const activeLink = `${baseLink} bg-white/70 text-teal-900 shadow-sm`;
const inactiveLink = `${baseLink} bg-white/20 text-white backdrop-blur-sm hover:bg-white/35`;

export function SiteNav({ current }: { current?: NavPage }) {
  return (
    <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href="/"
        className="inline-flex shrink-0 items-center gap-2.5 group"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/25 ring-1 ring-white/40 backdrop-blur-sm transition group-hover:bg-white/40">
          <svg
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
            aria-hidden
          >
            <path
              d="M3 14.5C3 13.12 4.12 12 5.5 12H9v2H5.5a.5.5 0 0 0-.5.5v1c0 .28.22.5.5.5H14.5a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5H11v-2h3.5C15.88 12 17 13.12 17 14.5v1A2.5 2.5 0 0 1 14.5 18h-9A2.5 2.5 0 0 1 3 15.5v-1z"
              fill="white"
              fillOpacity="0.9"
            />
            <path
              d="M7 2h6a1 1 0 0 1 .93.63l1.5 4A1 1 0 0 1 14.5 8h-9a1 1 0 0 1-.93-1.37l1.5-4A1 1 0 0 1 7 2z"
              fill="white"
              fillOpacity="0.7"
            />
            <rect x="9" y="7" width="2" height="5" rx="1" fill="white" fillOpacity="0.9" />
          </svg>
        </span>
        <span className="text-base font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)] transition group-hover:text-white/90">
          그림일기
        </span>
      </Link>

      <nav aria-label="주 메뉴" className="flex flex-wrap gap-2">
        <Link
          href="/write"
          aria-current={current === "write" ? "page" : undefined}
          className={current === "write" ? activeLink : inactiveLink}
        >
          일기 작성
        </Link>
        <Link
          href="/gallery"
          aria-current={current === "gallery" ? "page" : undefined}
          className={current === "gallery" ? activeLink : inactiveLink}
        >
          그림 갤러리
        </Link>
        {current && (
          <Link href="/" className={inactiveLink}>
            홈
          </Link>
        )}
      </nav>
    </header>
  );
}
