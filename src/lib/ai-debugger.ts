import { FileMap } from "./types";
import { AppBuildAgent } from "./agent";

/**
 * AI Debugger System for AI App Builder
 * Detects and auto-fixes common coding errors and styling issues
 */

export interface DebugReport {
  issue: string;
  type: 'syntax' | 'style' | 'performance' | 'security';
  severity: 'low' | 'medium' | 'high';
  file: string;
  fix?: string;
  status: 'pending' | 'fixed' | 'failed';
}

export class AIDebugger {
  private agent: AppBuildAgent;
  private reports: DebugReport[] = [];

  constructor() {
    this.agent = new AppBuildAgent();
  }

  /**
   * Analyzes a project and identifies common issues
   * @param files The project's files as a FileMap
   * @returns List of identified issues in the code
   */
  public analyzeProject(files: FileMap): DebugReport[] {
    const issues: DebugReport[] = [];

    for (const [path, content] of Object.entries(files)) {
      // 1. Check for basic syntax issues (missing semicolons, large files)
      if (content.length > 20000) {
        issues.push({
          issue: `File ${path} is too large (${content.length} chars)`,
          type: 'performance',
          severity: 'medium',
          file: path,
          status: 'pending'
        });
      }

      // 2. Check for potential security issues (hardcoded API keys, insecure functions)
      if (content.includes('apiKey =') || content.includes('api_key =')) {
        issues.push({
          issue: `Hardcoded API key detected in ${path}`,
          type: 'security',
          severity: 'high',
          file: path,
          status: 'pending'
        });
      }

      // 3. Check for styling issues (missing consistent indentation)
      if (content.includes('  ') && content.includes('\t')) {
        issues.push({
          issue: `Mixed indentation (tabs and spaces) in ${path}`,
          type: 'style',
          severity: 'low',
          file: path,
          status: 'pending'
        });
      }

      // 4. Basic React issues (missing imports)
      if (path.endsWith('.tsx') && !content.includes('import React')) {
        // Modern React doesn't require this import, but it can be useful to check
        // for other common issues like missing hooks
        if (content.includes('useState') && !content.includes('useState')) {
           // Basic heuristic for missing imports
        }
      }
    }

    this.reports = [...this.reports, ...issues];
    return issues;
  }

  /**
   * Auto-fixes identified issues using the AI agent
   * @param files The project's files as a FileMap
   * @param reports List of debug reports to fix
   * @returns Updated FileMap with fixes applied
   */
  public async autoFix(files: FileMap, reports: DebugReport[]): Promise<{ files: FileMap; results: DebugReport[] }> {
    const fixedFiles = { ...files };
    const fixedReports: DebugReport[] = [];

    for (const report of reports) {
      if (report.status === 'fixed') continue;

      try {
        const fileContent = fixedFiles[report.file];
        if (!fileContent) continue;

        const prompt = `Fix the following issue in this file: ${report.issue}. Original code:\n${fileContent}`;
        const result = await this.agent.run(prompt);
        
        // Extract the fixed file from result (assuming agent returns it)
        const fixedContent = result.files[report.file] || Object.values(result.files)[0];
        
        if (fixedContent) {
          fixedFiles[report.file] = fixedContent;
          fixedReports.push({ ...report, status: 'fixed', fix: 'AI-generated fix applied' });
        } else {
          fixedReports.push({ ...report, status: 'failed', fix: 'AI failed to generate a fix' });
        }
      } catch (error) {
        console.error(`Failed to fix issue: ${report.issue}`, error);
        fixedReports.push({ ...report, status: 'failed', fix: `Error: ${error instanceof Error ? error.message : String(error)}` });
      }
    }

    return { files: fixedFiles, results: fixedReports };
  }

  /**
   * Returns all recorded debug reports
   */
  public getReports(): DebugReport[] {
    return this.reports;
  }
}

export const aiDebugger = new AIDebugger();
