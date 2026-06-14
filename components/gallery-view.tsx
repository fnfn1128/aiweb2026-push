"use client";

import {
  entriesGroupedByLocalDate,
  formatLocalDateHeading,
  loadEntries,
  removeEntry,
  type DiaryEntry,
} from "@/lib/diary-history";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

function formatSavedTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", { timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return "";
  }
}

/** 날짜 구성 요소 분리 */
function parseDateParts(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { year: "—", month: "—", day: "—", weekday: "—" };
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    weekday: new Intl.DateTimeFormat("ko-KR", { weekday: "long" }).format(d),
  };
}

/** 날씨 목록 — 엔트리 ID 해시 기반으로 결정론적 배정 */
const WEATHERS = [
  { emoji: "☀️", label: "맑음" },
  { emoji: "🌤️", label: "화창함" },
  { emoji: "⛅", label: "구름 조금" },
  { emoji: "🌥️", label: "흐림" },
  { emoji: "🌧️", label: "비 많이 내림" },
  { emoji: "🌨️", label: "눈" },
  { emoji: "🌩️", label: "천둥번개" },
  { emoji: "🌦️", label: "가끔 비" },
];

function getWeather(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return WEATHERS[hash % WEATHERS.length];
}

/** `HH:mm` → 한글 표기 (예: 8시, 9시 30분) */
function formatTimeKorean(hm: string | undefined): string {
  if (!hm?.trim()) return "—";
  const [hs, ms] = hm.split(":");
  const h = parseInt(hs ?? "", 10);
  const m = parseInt(ms ?? "0", 10);
  if (Number.isNaN(h)) return "—";
  if (m === 0) return `${h}시`;
  return `${h}시 ${m}분`;
}

/** 카드마다 살짝 다른 기울기 (폴라로이드 사진처럼) */
function getTiltStyle(id: string): React.CSSProperties {
  const n = id.charCodeAt(0) % 5;
  const tilts = [-2, -1, 0, 1, 2];
  return { transform: `rotate(${tilts[n]}deg)` };
}

export function GalleryView() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [focused, setFocused] = useState<DiaryEntry | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(loadEntries());
  }, []);

  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocused(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused]);

  useEffect(() => {
    if (!focused) return;
    const html = document.documentElement;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, [focused]);

  const grouped = entriesGroupedByLocalDate(entries);
  const totalCount = entries.length;

  const handleDeleteEntry = useCallback(
    (id: string) => {
      if (!confirm("이 기록을 삭제할까요?")) return;
      const next = removeEntry(id);
      setEntries(next);
      setFocused((cur) => (cur?.id === id ? null : cur));
    },
    [],
  );

  return (
    <>
      {/* 섹션 헤더 */}
      <div
        className="diary-card mb-5 flex items-center justify-between px-5 py-4"
        style={{ background: "#FFF8E1" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🖼️</span>
          <div>
            <h2
              className="font-gaegu text-2xl font-bold leading-tight"
              style={{ color: "var(--diary-dark)" }}
            >
              내 그림들
            </h2>
            <p className="text-xs" style={{ color: "var(--diary-brown)" }}>
              썸네일을 누르면 자세히 볼 수 있어요
            </p>
          </div>
        </div>
        {totalCount > 0 && (
          <span
            className="font-gaegu rounded-full px-4 py-1.5 text-base font-bold"
            style={{
              background: "var(--diary-orange)",
              color: "#fff",
              border: "2px solid #E64A19",
              boxShadow: "0 2px 0 rgba(0,0,0,0.15)",
            }}
          >
            총 {totalCount}장
          </span>
        )}
      </div>

      {/* 빈 상태 */}
      {grouped.length === 0 ? (
        <div className="diary-card py-14 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p
            className="font-gaegu text-xl font-bold"
            style={{ color: "var(--diary-dark)" }}
          >
            아직 저장된 그림일기가 없어요
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--diary-brown)" }}>
            일기를 쓰면 여기에 자동으로 쌓여요 ✨
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {grouped.map(({ dateKey, entries: dayEntries }) => (
            <section key={dateKey} aria-labelledby={`day-${dateKey}`}>
              {/* 날짜 헤더 */}
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex items-center gap-2 rounded-full px-4 py-1.5"
                  style={{
                    background: "var(--diary-sky)",
                    border: "2px solid #0288D1",
                    boxShadow: "0 2px 0 rgba(0,0,0,0.12)",
                  }}
                >
                  <span className="text-sm">📅</span>
                  <h3
                    id={`day-${dateKey}`}
                    className="font-gaegu text-base font-bold text-white"
                  >
                    {formatLocalDateHeading(dateKey)}
                  </h3>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{
                    background: "#FEF6E4",
                    color: "var(--diary-brown)",
                    border: "1.5px solid var(--diary-border)",
                  }}
                >
                  {dayEntries.length}장
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: "var(--diary-line)" }}
                />
              </div>

              {/* 사진 그리드 */}
              <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {dayEntries.map((entry) => (
                  <li key={entry.id} className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setFocused(entry)}
                      className="group w-full text-left outline-none transition-all duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{ ...getTiltStyle(entry.id) }}
                    >
                      {/* 폴라로이드 프레임 */}
                      <div
                        className="overflow-hidden rounded-sm"
                        style={{
                          background: "#fff",
                          border: "2px solid #e0d8cc",
                          boxShadow: "2px 4px 12px rgba(62,39,35,0.18), 0 1px 3px rgba(0,0,0,0.1)",
                          padding: "6px 6px 28px 6px",
                        }}
                      >
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.imageDataUrl}
                            alt=""
                            width={300}
                            height={300}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                          {/* 호버 오버레이 */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/20">
                            <span className="text-3xl opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              🔍
                            </span>
                          </div>
                        </div>
                        {/* 폴라로이드 텍스트 영역 — 제목 */}
                        <div className="mt-1 px-0.5 min-h-[2.25rem] flex items-start justify-center">
                          <p
                            className="font-gaegu text-[11px] font-bold text-center leading-snug line-clamp-2 w-full"
                            style={{ color: "var(--diary-dark)" }}
                            title={entry.title?.trim() || "제목 없음"}
                          >
                            {entry.title?.trim() || "제목 없음"}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* 상세 모달 — 그림일기 페이지 형식 */}
      {focused &&
        typeof document !== "undefined" &&
        createPortal(
          <DiaryDetailModal
            entry={focused}
            onClose={() => setFocused(null)}
            onDelete={handleDeleteEntry}
          />,
          document.body,
        )}
    </>
  );
}

/* ─────────────────────────────────────────────
   그림일기 상세 모달
───────────────────────────────────────────── */
function DiaryDetailModal({
  entry,
  onClose,
  onDelete,
}: {
  entry: DiaryEntry;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const { year, month, day, weekday } = parseDateParts(entry.savedAt);
  const weather = entry.weather ?? getWeather(entry.id);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center overflow-hidden overscroll-none sm:items-center"
      style={{
        paddingTop: "max(12px, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(12px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(12px, env(safe-area-inset-right, 0px))",
        background: "rgba(62,39,35,0.6)",
        backdropFilter: "blur(4px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="그림일기 상세 보기"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full min-h-0 sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* 그림일기 양식 — 참고 스캔과 유사한 검은 테두리 프레임 */}
        <div
          className="flex max-h-[min(94dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-24px))] w-full flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
          style={{
            background: "#e8dfd4",
            border: "2px solid var(--diary-border)",
            boxShadow: "0 -6px 32px rgba(62,39,35,0.28), 6px 6px 0 rgba(215,196,168,0.5)",
          }}
        >
          {/* ── 스크롤 영역 ── */}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-2 sm:px-3 sm:pt-3">
            <div
              style={{
                border: "3px solid #1a1a1a",
                background: "#fdfaf2",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  background: "#fdfaf2",
                  backgroundImage: `
                    repeating-linear-gradient(
                      transparent,
                      transparent 35px,
                      rgba(26,26,26,0.12) 35px,
                      rgba(26,26,26,0.12) 36px
                    ),
                    linear-gradient(
                      to right,
                      transparent 48px,
                      rgba(244,189,188,0.75) 48px,
                      rgba(244,189,188,0.75) 50px,
                      transparent 50px
                    )
                  `,
                  backgroundAttachment: "local",
                }}
              >
                {/* ① 날짜 · 요일 · 날씨 */}
                <div className="px-3 pt-3 pb-1" style={{ paddingLeft: "56px" }}>
                  <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                    <span className="font-gaegu text-lg font-bold sm:text-xl" style={{ color: "#1a1a1a" }}>
                      {year}년 {month}월 {day}일
                    </span>
                    <span className="font-gaegu text-lg font-bold sm:text-xl" style={{ color: "var(--diary-orange)" }}>
                      {weekday}
                    </span>
                    <span className="font-gaegu text-base font-bold ml-1" style={{ color: "#1a1a1a" }}>
                      날씨:
                    </span>
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-lg"
                      style={{
                        background: "#fff",
                        border: "2px solid #1a1a1a",
                      }}
                      title={weather.label}
                    >
                      {weather.emoji}
                    </span>
                    <span className="font-gaegu text-sm font-bold" style={{ color: "#4a4038" }}>
                      {weather.label}
                    </span>
                  </div>
                </div>

                {/* ② 일어남 / 취침 */}
                <div
                  className="flex flex-wrap gap-x-5 gap-y-1 px-3 py-2 font-gaegu text-sm font-bold"
                  style={{
                    paddingLeft: "56px",
                    color: "#1a1a1a",
                    borderTop: "1px solid rgba(26,26,26,0.2)",
                    borderBottom: "1px solid rgba(26,26,26,0.2)",
                  }}
                >
                  <span>
                    일어난 시간:{" "}
                    <span style={{ fontFamily: "var(--font-noto-kr), sans-serif", fontWeight: 600 }}>
                      {formatTimeKorean(entry.wakeTime)}
                    </span>
                  </span>
                  <span>
                    잠드는 시간:{" "}
                    <span style={{ fontFamily: "var(--font-noto-kr), sans-serif", fontWeight: 600 }}>
                      {formatTimeKorean(entry.sleepTime)}
                    </span>
                  </span>
                </div>

                {/* ③ 그림 칸 */}
                <div className="px-3 py-2">
                  <div
                    className="relative overflow-hidden"
                    style={{
                      border: "2px solid #1a1a1a",
                      background: "#f8f4eb",
                      aspectRatio: "4/3",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.imageDataUrl}
                      alt="그림일기 그림"
                      width={600}
                      height={450}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={onClose}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full font-bold text-white transition hover:scale-110 focus-visible:outline-none"
                      style={{ background: "rgba(0,0,0,0.55)", fontSize: "14px" }}
                      aria-label="닫기"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* ④ 제목 */}
                <div className="px-3 pb-2" style={{ paddingLeft: "56px", paddingRight: "12px" }}>
                  <p className="font-gaegu text-lg font-bold" style={{ color: "#1a1a1a" }}>
                    제목:{" "}
                    <span style={{ borderBottom: "1.5px dashed rgba(26,26,26,0.35)", fontWeight: 500 }}>
                      {entry.title?.trim() || "—"}
                    </span>
                  </p>
                </div>

                {/* ⑤ 원고지 */}
                <div className="px-3 pb-4">
                  <ManuscriptPaper text={entry.diary || ""} />
                </div>
              </div>
            </div>
          </div>

          {/* ── 하단 버튼 영역 ── */}
          <div
            className="shrink-0 flex items-center justify-between px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
            style={{
              borderTop: "2px solid var(--diary-border)",
              background: "#FFF8E1",
            }}
          >
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--diary-brown)" }}
            >
              🕐 {formatSavedTime(entry.savedAt)}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="btn-diary btn-danger"
                style={{ padding: "0.45rem 1.1rem", fontSize: "0.85rem" }}
              >
                🗑️ 삭제
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-diary btn-secondary"
                style={{ padding: "0.45rem 1.1rem", fontSize: "0.85rem" }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   원고지 컴포넌트 — 한 칸에 한 글자
───────────────────────────────────────────── */
const MANUSCRIPT_COLS = 16;
const MANUSCRIPT_CELL_FONT_CQW = 82 / MANUSCRIPT_COLS;

function ManuscriptPaper({ text }: { text: string }) {
  // 단락별로 나누고, 각 단락을 COLS 단위 행으로 쪼갬
  const rows: string[][] = [];

  const paragraphs = text.split("\n");
  for (const para of paragraphs) {
    const chars = [...para]; // 유니코드 안전 분할
    if (chars.length === 0) {
      rows.push(Array<string>(MANUSCRIPT_COLS).fill(""));
      continue;
    }
    for (let i = 0; i < chars.length; i += MANUSCRIPT_COLS) {
      const slice = chars.slice(i, i + MANUSCRIPT_COLS);
      while (slice.length < MANUSCRIPT_COLS) slice.push("");
      rows.push(slice);
    }
  }

  if (rows.length === 0) {
    rows.push(Array<string>(MANUSCRIPT_COLS).fill(""));
  }

  return (
    <div
      style={{
        display: "grid",
        containerType: "inline-size",
        gridTemplateColumns: `repeat(${MANUSCRIPT_COLS}, 1fr)`,
        borderTop: "1px solid #1a1a1a",
        borderLeft: "1px solid #1a1a1a",
        background: "#fffefb",
        width: "100%",
      }}
      aria-label="원고지 형식 일기 내용"
    >
      {rows.map((row, ri) =>
        row.map((char, ci) => (
          <div
            key={`${ri}-${ci}`}
            className="font-gaegu"
            style={{
              borderRight: "1px solid #1a1a1a",
              borderBottom: "1px solid #1a1a1a",
              aspectRatio: "1 / 1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: `clamp(14px, ${MANUSCRIPT_CELL_FONT_CQW}cqw, 28px)`,
              color: "#1a1a1a",
              background:
                char === "" ? "rgba(248,244,235,0.6)" : "transparent",
              lineHeight: 1,
            }}
          >
            {char}
          </div>
        ))
      )}
    </div>
  );
}
