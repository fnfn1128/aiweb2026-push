"use client";

import { WriteDiaryFlow } from "@/components/write-diary-flow";
import { GalleryView } from "@/components/gallery-view";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

type Tab = "write" | "gallery";

function AppShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab =
    searchParams.get("tab") === "gallery" ? "gallery" : "write";

  const setTab = useCallback(
    (t: Tab) => {
      router.replace(t === "write" ? "/" : "/?tab=gallery", { scroll: false });
    },
    [router],
  );

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl lg:max-w-3xl">

        {/* ── 일기장 커버 헤더 ── */}
        <div className="diary-card mb-6 overflow-hidden">
          {/* 상단 컬러 스트라이프 */}
          <div className="flex h-3">
            {["#FF7043","#FFD54F","#66BB6A","#29B6F6","#AB47BC","#F06292"].map((c, i) => (
              <div key={i} className="flex-1" style={{ background: c }} />
            ))}
          </div>

          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              {/* 타이틀 */}
              <div>
                <h1
                  className="font-gaegu text-4xl font-bold leading-tight sm:text-5xl"
                  style={{ color: "var(--diary-orange)", letterSpacing: "-0.02em" }}
                >
                  나의 그림일기
                </h1>
              </div>

              {/* 연필 아이콘 */}
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: "#FFF8E1", border: "2px solid var(--diary-border)" }}
                aria-hidden
              >
                <span className="text-3xl">✏️</span>
              </div>
            </div>

            {/* 탭 — 노트 탭 스타일 */}
            <div className="mt-5 flex gap-2">
              {(["write", "gallery"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-selected={tab === t}
                  role="tab"
                  className="relative px-5 py-2 text-sm font-bold rounded-t-lg transition-all duration-200 focus-visible:outline-none"
                  style={
                    tab === t
                      ? {
                          background: "var(--diary-orange)",
                          color: "#fff",
                          border: "2px solid #E64A19",
                          borderBottom: "2px solid var(--diary-orange)",
                          boxShadow: "0 -2px 6px rgba(255,112,67,0.3)",
                        }
                      : {
                          background: "#FEF6E4",
                          color: "var(--diary-brown)",
                          border: "2px solid var(--diary-border)",
                          borderBottom: "2px solid var(--diary-border)",
                        }
                  }
                >
                  {t === "write" ? "📝 일기 쓰기" : "🖼️ 내 그림들"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 탭 콘텐츠 ── */}
        <div key={tab} className="tab-fade">
          {tab === "write" ? (
            <WriteDiaryFlow onGoToGallery={() => setTab("gallery")} />
          ) : (
            <GalleryView />
          )}
        </div>

        {/* 하단 장식 */}
        <p
          className="mt-8 text-center text-xs font-medium"
          style={{ color: "var(--diary-brown)", opacity: 0.5 }}
        >
          ✨ AI가 당신의 일기를 따뜻한 그림으로 만들어 드립니다
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p
            className="font-gaegu text-2xl"
            style={{ color: "var(--diary-orange)" }}
          >
            일기장을 펼치는 중...
          </p>
        </div>
      }
    >
      <AppShell />
    </Suspense>
  );
}
