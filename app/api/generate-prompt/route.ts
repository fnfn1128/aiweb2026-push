import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "You convert Korean diary entries into English text-to-image prompts.\n" +
  "Return ONLY the prompt text, no explanation, under 100 words.\n" +
  "Every prompt MUST show the scene as a young child's school drawing diary (그림일기): " +
  "colored pencils and crayons on paper, wobbly uneven outlines, simple rounded shapes, " +
  "slightly wrong perspective, bright flat colors, light paper grain, warm sincere mood.\n" +
  "Never ask for photorealism, cinematic lighting, glossy 3D, polished anime, or professional digital art—" +
  "keep it deliberately naive and handmade.\n" +
  "Describe the diary subject and emotion clearly inside this child-drawing look.";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

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
      !("diary" in body) ||
      typeof (body as { diary: unknown }).diary !== "string"
    ) {
      return NextResponse.json(
        { error: "Request body must include { diary: string }." },
        { status: 400 }
      );
    }

    const diary = (body as { diary: string }).diary.trim();
    if (!diary) {
      return NextResponse.json(
        { error: "Diary text cannot be empty." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      // gemini-1.5-flash는 API에서 종료됨 → GA Flash 모델 사용
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(diary);
    const response = result.response;
    const rawText = response.text()?.trim();

    if (!rawText) {
      return NextResponse.json(
        { error: "Model returned an empty prompt." },
        { status: 502 }
      );
    }

    return NextResponse.json({ prompt: rawText });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate prompt.";
    console.error("[generate-prompt]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
