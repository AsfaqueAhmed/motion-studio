import type { Metadata } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "./register-service-worker";

export const metadata: Metadata = {
  title: "Motion Studio",
  description: "Browser-based, offline-capable motion graphics engine.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
