import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FlowForge — AI Workflow Automation Hub",
  description:
    "Design, automate, and monetize custom AI workflows. Elite multi-tenant governance, Universal SaaS dashboard, Nano mobile triggers.",
};

export default function FlowForgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
