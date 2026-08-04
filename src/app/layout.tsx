import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Belpa Dashboard",
  description: "Roofer lead inbox for Belpa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
