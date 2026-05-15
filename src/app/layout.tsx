import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { whiteLabelManager } from "@/lib/white-label";
import { PHProvider } from "@/components/providers/ph-provider";
import PostHogPageView from "@/components/providers/posthog-page-view";
import "./globals.css";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const head = await headers();
  const host = head.get("host") || "";
  const brandConfig = await whiteLabelManager.resolveConfig(host);

  return (
    <html
      lang="en"
      className="dark"
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground selection:bg-brand-500/30">
        <PHProvider>
          <PostHogPageView />
          {brandConfig && (
            <style dangerouslySetInnerHTML={{ __html: `
              :root {
                --brand-500: ${brandConfig.theme_config.primary_color || 'oklch(0.6 0.2 260)'};
              }
            `}} />
          )}
          {children}
        </PHProvider>
      </body>
    </html>
  );
}
