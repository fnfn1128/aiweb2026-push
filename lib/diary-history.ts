export type DiaryWeather = { emoji: string; label: string };

export type DiaryEntry = {
  id: string;
  /** ISO 8601 — 정렬·표시용 */
  savedAt: string;
  diary: string;
  englishPrompt: string;
  /** data:image/jpeg;base64,... */
  imageDataUrl: string;
  /** 사용자가 선택한 날씨 (없으면 ID 해시로 폴백) */
  weather?: DiaryWeather;
  /** 그림일기 제목 (선택) */
  title?: string;
  /** 일어난 시간 `HH:mm` (선택) */
  wakeTime?: string;
  /** 잠든 시간 `HH:mm` (선택) */
  sleepTime?: string;
};

const STORAGE_KEY = "diary-to-image-history";
/** localStorage 여유 고려해 상한 유지 */
const MAX_ENTRIES = 80;

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("이미지 읽기 실패"));
    reader.readAsDataURL(blob);
  });
}

function isDiaryEntry(x: unknown): x is DiaryEntry {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  // weather 필드는 선택적이므로 핵심 필드만 검증
  return (
    typeof o.id === "string" &&
    typeof o.savedAt === "string" &&
    typeof o.diary === "string" &&
    typeof o.englishPrompt === "string" &&
    typeof o.imageDataUrl === "string" &&
    o.imageDataUrl.startsWith("data:image/")
  );
}

export function loadEntries(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDiaryEntry);
  } catch {
    return [];
  }
}

function persist(entries: DiaryEntry[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

/** 최신이 앞쪽. 용량 상한 초과 시 오래된 항목 제거 */
export function appendEntry(entry: DiaryEntry): { entries: DiaryEntry[]; saved: boolean } {
  const prev = loadEntries().filter((e) => e.id !== entry.id);
  const next = [entry, ...prev].slice(0, MAX_ENTRIES);
  const saved = persist(next);
  return { entries: next, saved };
}

export function removeEntry(id: string): DiaryEntry[] {
  const next = loadEntries().filter((e) => e.id !== id);
  persist(next);
  return next;
}

/** 로컬 시간대 기준 달력 날짜 키 (YYYY-MM-DD) */
export function localCalendarDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "invalid";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 갤러리 섹션 제목 (예: 2026년 5월 4일 월요일) */
export function formatLocalDateHeading(dateKey: string): string {
  const [ys, ms, ds] = dateKey.split("-");
  const y = Number(ys),
    mo = Number(ms),
    da = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da))
    return dateKey;
  const d = new Date(y, mo - 1, da);
  if (Number.isNaN(d.getTime())) return dateKey;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(d);
}

/** 날짜별로 묶음. 같은 날 안에서는 만들어진 순(최신 먼저) */
export function entriesGroupedByLocalDate(
  entries: DiaryEntry[],
): { dateKey: string; entries: DiaryEntry[] }[] {
  const map = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const k = localCalendarDateKey(e.savedAt);
    if (k === "invalid") continue;
    const bucket = map.get(k);
    if (bucket) bucket.push(e);
    else map.set(k, [e]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }
  return [...map.entries()]
    .sort(([ka], [kb]) => kb.localeCompare(ka))
    .map(([dateKey, list]) => ({ dateKey, entries: list }));
}
