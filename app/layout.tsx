import type { Metadata } from "next";
import { Gaegu, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const gaegu = Gaegu({
  variable: "--font-gaegu",
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  subsets: ["latin"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-kr",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: false,
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "그림일기 — 하루를 그림으로 간직하세요",
  description:
    "한국어 일기를 어린이 그림일기풍 이미지로 변환합니다. AI가 따뜻한 수채화·크레파스 스타일로 그려줍니다.",
  keywords: ["그림일기", "AI 이미지", "일기", "다이어리", "수채화"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${gaegu.variable} ${notoSansKR.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
