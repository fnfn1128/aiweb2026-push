"use client";

import { appendEntry, blobToDataUrl, type DiaryWeather } from "@/lib/diary-history";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_CHARS = 1000;
const MAX_TITLE = 40;
/** 원고지 가로 칸 수 */
const MANUSCRIPT_COLS = 16;
/** 칸 너비(100/N cqw)의 ~82% — 열 수가 바뀌어도 글자가 칸에 맞도록 */
const MANUSCRIPT_CELL_FONT_CQW = 82 / MANUSCRIPT_COLS;
type Phase = "idle" | "prompt" | "image";

/* ── 날씨 목록 ── */
const WEATHERS: DiaryWeather[] = [
  { emoji: "☀️", label: "맑음" },
  { emoji: "🌤️", label: "화창함" },
  { emoji: "⛅", label: "구름 조금" },
  { emoji: "🌥️", label: "흐림" },
  { emoji: "🌧️", label: "비 많이 내림" },
  { emoji: "🌨️", label: "눈" },
  { emoji: "🌩️", label: "천둥번개" },
  { emoji: "🌦️", label: "가끔 비" },
];

/* ── 오늘 날짜 YYYY-MM-DD ── */
function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ── 날짜 문자열 → 표시용 파트 ── */
function parseDateStr(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    weekday: new Intl.DateTimeFormat("ko-KR", { weekday: "long" }).format(d),
    iso: d.toISOString(),
  };
}

/* ────────────────────────────────────────
   원고지 입력 컴포넌트
──────────────────────────────────────── */
function ManuscriptInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* value → 원고지 행 배열 */
  const rows: string[][] = [];
  const paragraphs = value.split("\n");
  for (const para of paragraphs) {
    const chars = [...para];
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
  /* 최소 5행 보장 */
  while (rows.length < 5) rows.push(Array<string>(MANUSCRIPT_COLS).fill(""));

  const isEmpty = !value.trim();

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "2px",
        cursor: disabled ? "default" : "text",
      }}
      onClick={() => !disabled && textareaRef.current?.focus()}
    >
      {/* 원고지 격자 */}
      <div
        style={{
          display: "grid",
          containerType: "inline-size",
          gridTemplateColumns: `repeat(${MANUSCRIPT_COLS}, 1fr)`,
          borderTop: "1px solid #1a1a1a",
          borderLeft: "1px solid #1a1a1a",
          background: "#fffefb",
        }}
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
                color: "var(--diary-dark)",
                background: char === "" ? "rgba(240,235,225,0.4)" : "transparent",
                lineHeight: 1,
              }}
            >
              {char}
            </div>
          ))
        )}
      </div>

      {/* 플레이스홀더 */}
      {isEmpty && !disabled && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1.5"
          style={{ zIndex: 5 }}
        >
          <span className="text-3xl">✏️</span>
          <p
            className="font-gaegu text-sm text-center px-4"
            style={{ color: "#C5B49A" }}
          >
            여기를 눌러 일기를 써보세요
          </p>
        </div>
      )}

      {/* 투명 textarea — 입력 캡처 */}
      {!disabled && (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={MAX_CHARS + 200}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "text",
            resize: "none",
            zIndex: 10,
            padding: 0,
            border: "none",
            outline: "none",
            background: "transparent",
          }}
          aria-label="일기 내용 입력"
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────
   메인 컴포넌트
──────────────────────────────────────── */
type WriteDiaryFlowProps = { onGoToGallery?: () => void };

export function WriteDiaryFlow({ onGoToGallery }: WriteDiaryFlowProps = {}) {
  const [diary, setDiary] = useState("");
  const [title, setTitle] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [sleepTime, setSleepTime] = useState("");
  const [dateStr, setDateStr] = useState(getTodayStr);
  const [weatherIdx, setWeatherIdx] = useState(0);
  const [englishPrompt, setEnglishPrompt] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const dateParts = parseDateStr(dateStr);
  const weather = WEATHERS[weatherIdx];
  const busy = phase !== "idle";
  const done = imageUrl !== null;
  const charCount = diary.length;
  const isOverLimit = charCount > MAX_CHARS;

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => revokeBlobUrl(), [revokeBlobUrl]);

  /* 이미지 완성 후 결과 영역으로 스크롤 */
  useEffect(() => {
    if (imageUrl && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [imageUrl]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    revokeBlobUrl();
    setEnglishPrompt(null);
    setImageUrl(null);
    setPhase("prompt");

    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diary }),
      });

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : `프롬프트 생성 실패 (${res.status})`;
        throw new Error(msg);
      }

      if (
        !data || typeof data !== "object" ||
        !("prompt" in data) ||
        typeof (data as { prompt: unknown }).prompt !== "string"
      ) throw new Error("서버 응답 형식이 올바르지 않습니다.");

      const prompt = (data as { prompt: string }).prompt.trim();
      if (!prompt) throw new Error("생성된 프롬프트가 비어 있습니다.");

      setEnglishPrompt(prompt);
      setPhase("image");

      const imgRes = await fetch("/api/pollinations-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!imgRes.ok) {
        const errBody: unknown = await imgRes.json().catch(() => null);
        const msg =
          errBody && typeof errBody === "object" && "error" in errBody &&
          typeof (errBody as { error: unknown }).error === "string"
            ? (errBody as { error: string }).error
            : `이미지 생성 실패 (${imgRes.status})`;
        throw new Error(msg);
      }

      const blob = await imgRes.blob();
      if (blob.type.length > 0 && !blob.type.startsWith("image/")) {
        throw new Error("이미지 데이터가 아닙니다.");
      }

      revokeBlobUrl();
      const dataUrl = await blobToDataUrl(blob);
      setImageUrl(dataUrl);

      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      const { saved } = appendEntry({
        id,
        savedAt: dateParts.iso,
        diary: diary.trim(),
        englishPrompt: prompt,
        imageDataUrl: dataUrl,
        weather,
        title: title.trim() || undefined,
        wakeTime: wakeTime || undefined,
        sleepTime: sleepTime || undefined,
      });

      if (!saved) {
        setError("브라우저에 기록을 남기지 못했습니다. 저장 공간이 부족하거나 로컬 저장이 차단되었을 수 있습니다.");
      }

      setPhase("idle");
    } catch (e) {
      setPhase("idle");
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    }
  }, [diary, dateParts.iso, weather, revokeBlobUrl, title, wakeTime, sleepTime]);

  const handleReset = useCallback(() => {
    revokeBlobUrl();
    setDiary("");
    setTitle("");
    setWakeTime("");
    setSleepTime("");
    setDateStr(getTodayStr());
    setWeatherIdx(0);
    setEnglishPrompt(null);
    setImageUrl(null);
    setError(null);
    setPhase("idle");
  }, [revokeBlobUrl]);

  return (
    <div className="flex flex-col gap-5">

      {/* ══════════════════════════════════════
          그림일기 페이지 카드
      ══════════════════════════════════════ */}
      <div
        className="overflow-hidden"
        ref={resultRef}
        style={{
          background: "var(--diary-paper)",
          border: "2.5px solid var(--diary-border)",
          borderRadius: "12px",
          boxShadow: "4px 4px 0 rgba(215,196,168,0.6), 8px 8px 0 rgba(215,196,168,0.3)",
        }}
      >
        {/* 상단 무지개 줄 */}
        <div className="flex h-2.5">
          {["#FF7043","#FFD54F","#66BB6A","#29B6F6","#AB47BC","#F06292"].map((c, i) => (
            <div key={i} className="flex-1" style={{ background: c }} />
          ))}
        </div>

        {/* 카드 타이틀 */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ background: "#FFF8E1", borderBottom: "2px solid var(--diary-border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📖</span>
            <span className="font-gaegu text-xl font-bold" style={{ color: "var(--diary-dark)" }}>
              오늘의 일기
            </span>
          </div>
          <span
            className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full border ${
              isOverLimit
                ? "bg-red-50 border-red-300 text-red-600"
                : charCount > MAX_CHARS * 0.85
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "border-[var(--diary-border)]"
            }`}
            style={!(isOverLimit || charCount > MAX_CHARS * 0.85) ? { background: "#FEF6E4", color: "var(--diary-brown)" } : {}}
          >
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}자
          </span>
        </div>

        {/* 실제 그림일기 시트 — 참고 양식(검은 테두리) */}
        <div className="px-3 pb-3 pt-1">
          <div
            style={{
              border: "3px solid #1a1a1a",
              background: "#fdfaf2",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.5)",
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
              {/* ① 날짜 · 요일 · 날씨(아이콘) */}
              <div className="relative px-3 pt-3 pb-1" style={{ paddingLeft: "58px" }}>
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                  <button
                    type="button"
                    onClick={() => !busy && dateInputRef.current?.showPicker?.()}
                    disabled={busy}
                    className="group inline-flex items-baseline gap-x-0.5 rounded px-0.5 transition hover:bg-white/70 disabled:pointer-events-none"
                    title="날짜 변경"
                  >
                    <span className="font-gaegu text-lg font-bold sm:text-xl" style={{ color: "#1a1a1a" }}>
                      {dateParts.year}년 {dateParts.month}월 {dateParts.day}일
                    </span>
                    <span className="font-gaegu text-lg font-bold sm:text-xl ml-0.5" style={{ color: "var(--diary-orange)" }}>
                      {dateParts.weekday}
                    </span>
                    {!busy && (
                      <span className="text-[10px] ml-0.5 opacity-0 group-hover:opacity-50" style={{ color: "var(--diary-brown)" }}>
                        ✎
                      </span>
                    )}
                  </button>
                  <span className="font-gaegu text-base font-bold ml-1" style={{ color: "#1a1a1a" }}>
                    날씨:
                  </span>
                  <div className="inline-flex flex-wrap items-center gap-1" role="group" aria-label="날씨 선택">
                    {WEATHERS.map((w, i) => (
                      <button
                        key={i}
                        type="button"
                        title={w.label}
                        aria-label={w.label}
                        aria-pressed={i === weatherIdx}
                        onClick={() => !busy && setWeatherIdx(i)}
                        disabled={busy}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg transition-transform disabled:opacity-45"
                        style={
                          i === weatherIdx
                            ? {
                                background: "#fff",
                                border: "2.5px solid #E64A19",
                                boxShadow: "0 0 0 2px rgba(255,112,67,0.25)",
                              }
                            : {
                                background: "rgba(255,255,255,0.7)",
                                border: "1.5px solid #1a1a1a",
                              }
                        }
                      >
                        {w.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  ref={dateInputRef}
                  type="date"
                  value={dateStr}
                  onChange={(e) => e.target.value && setDateStr(e.target.value)}
                  max={getTodayStr()}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>

              {/* ② 일어남 / 취침 시간 */}
              <div
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2"
                style={{
                  paddingLeft: "58px",
                  borderTop: "1px solid rgba(26,26,26,0.2)",
                  borderBottom: "1px solid rgba(26,26,26,0.2)",
                }}
              >
                <label className="flex items-center gap-2 font-gaegu text-sm font-bold" style={{ color: "#1a1a1a" }}>
                  일어난 시간:
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    disabled={busy}
                    className="rounded border px-1 py-0.5 text-sm font-sans"
                    style={{ borderColor: "#1a1a1a", background: "rgba(255,255,255,0.85)" }}
                  />
                </label>
                <label className="flex items-center gap-2 font-gaegu text-sm font-bold" style={{ color: "#1a1a1a" }}>
                  잠드는 시간:
                  <input
                    type="time"
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                    disabled={busy}
                    className="rounded border px-1 py-0.5 text-sm font-sans"
                    style={{ borderColor: "#1a1a1a", background: "rgba(255,255,255,0.85)" }}
                  />
                </label>
              </div>

              {/* ③ 그림 칸 */}
              <div className="px-3 py-2">
                <div
                  className="relative overflow-hidden"
                  style={{
                    border: "2px solid #1a1a1a",
                    background: "#f8f4eb",
                    aspectRatio: "4 / 3",
                  }}
                >
                  {busy && !imageUrl && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#f5f0e8]">
                      <div className="text-5xl animate-bounce">
                        {phase === "prompt" ? "🤔" : "🖌️"}
                      </div>
                      <p className="font-gaegu text-xl font-bold text-center px-4" style={{ color: "var(--diary-orange)" }}>
                        {phase === "prompt" ? "AI가 그림을 구상하고 있어요..." : "그림을 그리고 있어요!"}
                      </p>
                      {phase === "image" && (
                        <p className="text-xs text-center" style={{ color: "var(--diary-brown)" }}>
                          최대 2~3분 정도 걸릴 수 있어요 ☕
                        </p>
                      )}
                    </div>
                  )}

                  {imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imageUrl}
                      alt="완성된 그림일기 이미지"
                      width={600}
                      height={450}
                      className="h-full w-full object-cover"
                    />
                  )}

                  {!busy && !imageUrl && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 select-none pointer-events-none">
                      <span className="text-5xl opacity-25">🖼️</span>
                      <p className="font-gaegu text-base text-center px-6" style={{ color: "#6d5d4e", opacity: 0.75 }}>
                        일기를 쓰고 그림일기 만들기를 누르면<br />여기에 그림이 나타나요!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ④ 제목 */}
              <div className="px-3 pb-2" style={{ paddingLeft: "58px", paddingRight: "14px" }}>
                <label className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-gaegu text-lg font-bold shrink-0" style={{ color: "#1a1a1a" }}>
                    제목:
                  </span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                    disabled={busy}
                    placeholder="오늘 일기 제목"
                    maxLength={MAX_TITLE}
                    className="min-w-0 flex-1 bg-transparent font-gaegu text-lg font-bold outline-none placeholder:opacity-40 disabled:opacity-50"
                    style={{
                      color: "#1a1a1a",
                      borderBottom: "1.5px dashed rgba(26,26,26,0.35)",
                      paddingBottom: "2px",
                    }}
                  />
                </label>
              </div>

              {/* ⑤ 원고지 본문 */}
              <div className="px-3 pb-4">
                <ManuscriptInput
                  value={diary}
                  onChange={setDiary}
                  disabled={busy}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div
            role="alert"
            className="mx-4 mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium"
            style={{ background: "#FFF0F0", border: "1.5px solid #FFCDD2", color: "#C62828" }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 하단 액션 */}
        <div
          className="px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-wrap items-center gap-3"
          style={{ borderTop: "2px solid var(--diary-border)", background: "#FFF8E1" }}
        >
          {!done ? (
            <>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={busy || !diary.trim() || isOverLimit}
                className="btn-diary btn-primary flex-1 sm:flex-none"
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    생성 중...
                  </span>
                ) : (
                  "🎨 그림일기 만들기"
                )}
              </button>

              {/* 갤러리 이동 */}
              <span className="flex-1 text-right text-sm">
                {onGoToGallery ? (
                  <button
                    type="button"
                    onClick={onGoToGallery}
                    className="font-semibold underline underline-offset-4 hover:opacity-70 transition-opacity"
                    style={{ color: "var(--diary-sky)", textDecorationColor: "var(--diary-sky)" }}
                  >
                    🖼️ 내 그림들 보기 →
                  </button>
                ) : (
                  <Link
                    href="/?tab=gallery"
                    className="font-semibold underline underline-offset-4 hover:opacity-70 transition-opacity"
                    style={{ color: "var(--diary-sky)", textDecorationColor: "var(--diary-sky)" }}
                  >
                    🖼️ 내 그림들 보기 →
                  </Link>
                )}
              </span>
            </>
          ) : (
            <>
              <a
                href={imageUrl!}
                download="diary-image.jpg"
                className="btn-diary btn-green"
              >
                💾 이미지 저장
              </a>
              {onGoToGallery ? (
                <button type="button" onClick={onGoToGallery} className="btn-diary btn-sky">
                  🖼️ 갤러리에서 보기
                </button>
              ) : (
                <Link href="/?tab=gallery" className="btn-diary btn-sky">
                  🖼️ 갤러리에서 보기
                </Link>
              )}
              <button type="button" onClick={handleReset} className="btn-diary btn-secondary ml-auto">
                ✏️ 새 일기 쓰기
              </button>
            </>
          )}
        </div>

        {/* AI 프롬프트 (접기/펼치기) */}
        {englishPrompt && (
          <details
            className="mx-4 mb-4 overflow-hidden rounded-xl"
            style={{ border: "1.5px solid var(--diary-border)" }}
          >
            <summary
              className="cursor-pointer select-none px-4 py-3 text-sm font-semibold transition hover:opacity-80"
              style={{ background: "#FEF6E4", color: "var(--diary-brown)" }}
            >
              🤖 AI 이미지 프롬프트 확인하기
            </summary>
            <p
              className="px-4 pb-4 pt-3 text-xs leading-relaxed whitespace-pre-wrap"
              style={{ background: "#FFFDF4", color: "var(--diary-dark)" }}
            >
              {englishPrompt}
            </p>
          </details>
        )}
      </div>
    </div>
  );
}
