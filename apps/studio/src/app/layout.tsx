import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motion Studio",
  description: "Browser-based, offline-capable motion graphics engine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
