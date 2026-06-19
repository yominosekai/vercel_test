import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ファイルマネージャー",
  description: "GitHub + Vercel 自動デプロイ検証",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
