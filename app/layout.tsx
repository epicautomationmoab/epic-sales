import type { Metadata } from "next";
import "./globals.css";
import Customer360Enhancer from "./customer-360/Customer360Enhancer";

export const metadata: Metadata = {
  title: "EpicC360 — Epic 4X4 Adventures",
  description: "Epic 4X4 Adventures customer communications, sales, history, and service workspace",
  icons: {
    icon: "https://myepicreservation.com/epic-logo.png",
    shortcut: "https://myepicreservation.com/epic-logo.png",
    apple: "https://myepicreservation.com/epic-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><Customer360Enhancer />{children}</body>
    </html>
  );
}
