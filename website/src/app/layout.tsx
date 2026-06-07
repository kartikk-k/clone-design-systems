import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Design Grab - Clone any website's design system",
  description:
    "Open source tool to extract and clone the design system of any website. Get colors, typography, spacing, and components in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
