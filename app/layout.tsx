import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Epic Sales",
  description: "Sales leads and quoting for Epic 4X4 Adventures",
  icons: {
    icon: "https://myepicreservation.com/epic-logo.png",
    shortcut: "https://myepicreservation.com/epic-logo.png",
    apple: "https://myepicreservation.com/epic-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
