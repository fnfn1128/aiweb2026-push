import { NextResponse } from "next/server";

/** 일기 앱 고정 스타일: 사용자 프롬프트와 무관하게 어린이 그림일기 느낌을 강하게 유지 */
const CHILD_DRAWING_DIARY_STYLE =
  "child's drawing diary style, crayon and colored pencil on textured paper, " +
  "naive doodle, wobbly lines, simple cute shapes, flat bright colors, imperfect proportions, " +
  "no photorealism, no cinematic, no glossy 3D";

/** Pollinations 레거시 엔드포인트는 응답이 매우 느릴 수 있어 브라우저 img 직링크보다 서버 프록시가 안정적입니다. */
const POLLINATIONS_TIMEOUT_MS = 180_000;

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      !("prompt" in body) ||
      typeof (body as { prompt: unknown }).prompt !== "string"
    ) {
      return NextResponse.json(
        { error: "Request body must include { prompt: string }." },
        { status: 400 }
      );
    }

    const prompt = (body as { prompt: string }).prompt.trim();
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt cannot be empty." },
        { status: 400 }
      );
    }

    const fullPrompt = `${prompt}, ${CHILD_DRAWING_DIARY_STYLE}`;

    const seed = (Math.random() * 99999) | 0;
    const upstream = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=768&height=512&nologo=true&seed=${seed}`;

    const controller = new AbortController();
    const kill = setTimeout(() => controller.abort(), POLLINATIONS_TIMEOUT_MS);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(upstream, {
        signal: controller.signal,
        headers: {
          Accept: "image/*,*/*;q=0.8",
          "User-Agent": "diary-to-image/1.0",
        },
        cache: "no-store",
      });
    } finally {
      clearTimeout(kill);
    }

    if (!upstreamRes.ok) {
      const snippet = await upstreamRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Pollinations responded with ${upstreamRes.status}.`,
          detail: snippet.slice(0, 200),
        },
        { status: 502 }
      );
    }

    const buf = await upstreamRes.arrayBuffer();
    const contentType =
      upstreamRes.headers.get("content-type") ?? "image/jpeg";

    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        {
          error: "Pollinations returned a non-image response.",
          detail: new TextDecoder().decode(buf.slice(0, 200)),
        },
        { status: 502 }
      );
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    const message = aborted
      ? "이미지 생성이 시간 초과되었습니다. 잠시 후 다시 시도해 주세요."
      : err instanceof Error
        ? err.message
        : "Failed to fetch image.";
    console.error("[pollinations-image]", err);
    const status = aborted ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const maxDuration = 180;
