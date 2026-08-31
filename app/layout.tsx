import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Tool Dashboard",
  description: "Local dashboard for Job Tool runs, decisions, history, logs, and candidate profile settings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
