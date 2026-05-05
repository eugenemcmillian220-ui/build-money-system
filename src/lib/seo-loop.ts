import { callLLM, cleanJson } from "./llm";
import { Project } from "./types";
import { createClient } from "./supabase/server";

export interface SEOArticle {
  title: string;
  slug: string;
  content: string;
  keywords: string[];
}

/**
 * SEO Loop: Autonomously generates SEO-optimized content for projects
 */
export class SEOLoop {
  /**
   * Generates a batch of SEO articles for a project
   */
  async generateArticles(project: Project, count: number = 3): Promise<SEOArticle[]> {
    const systemPrompt = `You are an SEO and Content Marketing expert. Generate ${count} high-quality, SEO-optimized blog articles for a new software project.
    
Project Description: ${project.description || "Next.js 15 Full-Stack App"}
Core Features: ${project.integrations?.join(", ") || "Next.js 15, Tailwind CSS v4, AI-Powered"}
Target Audience: Developers, SaaS Founders, Enterprise CTOs.

Each article must include:
- A compelling title.
- A URL-friendly slug.
- Full markdown content (500+ words).
- A list of target keywords.

Return ONLY a JSON object:
{
  "articles": [
    { "title": "...", "slug": "...", "content": "...", "keywords": ["...", "..."] }
  ]
}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `Generate ${count} articles for: ${project.description}` }
    ];

    const response = await callLLM(messages, { temperature: 0.7, maxTokens: 8192, timeout: 25000 });
    const result = JSON.parse(cleanJson(response));
    return result.articles;
  }

  /**
   * Publishes articles to the database and triggers revalidation
   */
  async publishBatch(projectId: string, articles: SEOArticle[]): Promise<void> {
    const supabase = await createClient();

    for (const article of articles) {
      console.log(`[SEOLoop] Publishing article: ${article.title}...`);
      
      await supabase.from("seo_articles").insert({
        project_id: projectId,
        title: article.title,
        slug: article.slug,
        content: article.content,
        keywords: article.keywords,
        status: "published",
        last_revalidated_at: new Date().toISOString()
      });

      // In production, call Next.js revalidatePath
      // await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate?path=/blog/${article.slug}`);
    }
  }
}

export const seoLoop = new SEOLoop();
