import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Epic Sales",
  description: "Sales leads and quoting for Epic 4X4 Adventures",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
