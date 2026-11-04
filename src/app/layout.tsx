import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "一次創作イベントウォッチャー",
  description: "一次創作（オリジナル作品）の同人誌即売会の開催日とサークル申込の締切をまとめています。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
