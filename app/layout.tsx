import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Start Browser",
  description: "Launch your browser session",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
