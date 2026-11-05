import type { Metadata } from "next";
import { Kaisei_Decol, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

// 見出しは筆で書いたような丸みのある明朝、本文は読みやすいゴシック。ビルド時に取り込んで自前で配る
const decol = Kaisei_Decol({ weight: ["500", "700"], subsets: ["latin"], preload: false, display: "swap", variable: "--font-head" });
const gothic = Zen_Kaku_Gothic_New({ weight: ["400", "500", "700"], subsets: ["latin"], preload: false, display: "swap", variable: "--font-body" });

const title = "一次創作イベントウォッチャー";
const description = "一次創作（オリジナル作品）の同人誌即売会の開催日とサークル申込の締切をまとめています。";

export const metadata: Metadata = {
  metadataBase: new URL("https://events.subara3.com"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: title,
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${decol.variable} ${gothic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
