import type { Metadata } from "next";
import { ComplianceDashboard } from "../components/ComplianceDashboard";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevGuard AI – SOC2 Compliance Monitor",
  description: "Automated SOC2 compliance monitor for Next.js startups. Scans PRs for PII and security leaks.",
  keywords: ["SOC2", "compliance", "security", "PII", "Next.js", "DevOps"],
  openGraph: {
    title: "DevGuard AI",
    description: "Automated SOC2 compliance monitor for Next.js startups",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950">{children}</body>
    </html>
  );
}
