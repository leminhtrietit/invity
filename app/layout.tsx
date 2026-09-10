import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Invite", template: "%s · Invite" },
  description: "Tạo thiệp mời trực tuyến hiện đại và quản lý phản hồi trong một nơi.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
