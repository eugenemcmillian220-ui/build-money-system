import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AI App Builder | Elite Production Suite",
    template: "%s | AI App Builder",
  },
  description:
    "The world's first autonomous AI platform for building, deploying, and optimizing full-stack applications.",
  keywords: ["AI", "Next.js", "React", "Autonomous", "SaaS Builder", "Tailwind CSS"],
  authors: [{ name: "AI App Builder" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground selection:bg-brand-500/30">
        {children}
      </body>
    </html>
  );
}
