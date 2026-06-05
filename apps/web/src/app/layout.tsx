import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "禹都投标AI助手 | YuDu_Bidkit",
  description: "面向招投标业务的 AI 标书工作台"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
