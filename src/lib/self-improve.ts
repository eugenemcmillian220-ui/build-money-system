import { FeedbackLoop, feedbackLoop } from "./feedback-loop";
import { LearningStore, learningStore } from "./learning-store";
import { callLLM, cleanJson } from "./llm";

/**
 * Self-Improvement Engine - Phase 5 Upgrade
 * Uses LLM to analyze feedback patterns and generate real improvement recommendations
 */

export interface ImprovementResult {
  improved: boolean;
  changesApplied: number;
  newKnowledgeBase: string[];
  recommendations: string[];
  promptImprovements?: string[];
  systemAnalysis?: string;
}

export class SelfImprovementEngine {
  private feedbackLoop: FeedbackLoop;
  private learningStore: LearningStore;

  constructor() {
    this.feedbackLoop = feedbackLoop;
    this.learningStore = learningStore;
  }

  public async runSelfImprovement(): Promise<ImprovementResult> {
    const feedback = this.feedbackLoop.getAllFeedback().filter((f) => !f.isAnalyzed);
    const pendingLearning = this.learningStore.getPendingLearningData();

    if (feedback.length === 0 && pendingLearning.length === 0) {
      return {
        improved: false,
        changesApplied: 0,
        newKnowledgeBase: [],
        recommendations: ["No new data available for improvement."],
      };
    }

    const result: ImprovementResult = {
      improved: true,
      changesApplied: 0,
      newKnowledgeBase: [],
      recommendations: [],
      promptImprovements: [],
    };

    // 1. Analyze feedback and build learning entries
    for (const f of feedback) {
      if (f.rating <= 2) {
        await this.learningStore.addLearningData({
          source: "feedback",
          type: "error-fix",
          content: `Low rating (${f.rating}/5) on ${f.category}: ${f.comment ?? "no comment"}`,
          impact: "high",
        });
      } else if (f.rating >= 4) {
        await this.learningStore.addLearningData({
          source: "feedback",
          type: "pattern",
          content: `High rating (${f.rating}/5) on ${f.category}: ${f.comment ?? "no comment"}`,
          impact: "medium",
        });
      }
      this.feedbackLoop.markAsAnalyzed(f.id);
      result.changesApplied++;
    }

    // 2. Process pending learning data
    const allPending = this.learningStore.getPendingLearningData();
    for (const data of allPending) {
      result.newKnowledgeBase.push(`[${data.source}/${data.type}] ${data.content.slice(0, 80)}`);
      this.learningStore.markAsApplied(data.id);
      result.changesApplied++;
    }

    // 3. Use LLM to synthesize actionable improvements
    if (result.changesApplied > 0) {
      try {
        const analysisPrompt = `You are an AI system optimizer. Analyze this feedback data from an AI code generation platform and provide specific, actionable improvements.

Feedback Summary:
${feedback
  .map(
    (f) =>
      `- Rating: ${f.rating}/5 | Category: ${f.category} | Comment: "${f.comment ?? "none"}"`
  )
  .join("\n")}

Learning Data Applied:
${result.newKnowledgeBase.join("\n")}

Return JSON:
{
  "systemAnalysis": "<2-3 sentence diagnosis of the main quality issues>",
  "recommendations": ["<specific action 1>", "<specific action 2>", "<specific action 3>"],
  "promptImprovements": [
    "<specific prompt engineering improvement to make code generation better>",
    "<another prompt improvement>"
  ]
}`;

        const aiAnalysis = await callLLM([{ role: "user", content: analysisPrompt }], { temperature: 0.3 });
        const cleaned = cleanJson(aiAnalysis);
        const parsed = JSON.parse(cleaned) as {
          systemAnalysis: string;
          recommendations: string[];
          promptImprovements: string[];
        };

        result.systemAnalysis = parsed.systemAnalysis;
        result.recommendations = parsed.recommendations;
        result.promptImprovements = parsed.promptImprovements;
      } catch {
        result.recommendations.push(
          `System processed ${result.changesApplied} data points. AI analysis temporarily unavailable.`
        );
      }
    }

    return result;
  }

  public async getPerformanceReport(): Promise<{
    feedbackTrend: ReturnType<FeedbackLoop["analyzeFeedbackTrends"]>;
    learningSummary: ReturnType<LearningStore["summarizeLearning"]>;
  }> {
    return {
      feedbackTrend: this.feedbackLoop.analyzeFeedbackTrends(),
      learningSummary: this.learningStore.summarizeLearning(),
    };
  }
}

export const selfImprovementEngine = new SelfImprovementEngine();
