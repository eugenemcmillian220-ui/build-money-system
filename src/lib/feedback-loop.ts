/**
 * Feedback Loop System for AI App Builder
 * Collects, stores, and processes user feedback on generated projects
 */

export interface UserFeedback {
  id: string;
  projectId: string;
  rating: number; // 1 to 5
  comment?: string;
  timestamp: string;
  category: 'accuracy' | 'performance' | 'style' | 'completeness' | 'other';
  isAnalyzed: boolean;
}

export class FeedbackLoop {
  private feedbackStore: UserFeedback[] = [];

  constructor() {}

  /**
   * Records user feedback for a project
   * @param feedback The feedback to record
   * @returns boolean indicating if the feedback was recorded successfully
   */
  public async recordFeedback(feedback: Omit<UserFeedback, 'id' | 'timestamp' | 'isAnalyzed'>): Promise<UserFeedback> {
    const newFeedback: UserFeedback = {
      ...feedback,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      isAnalyzed: false,
    };

    this.feedbackStore.push(newFeedback);

    // In a real app, this would be saved to a database table for feedback
    // console.log(`Feedback recorded for project ${feedback.projectId}: ${feedback.rating}/5 stars`);
    
    return newFeedback;
  }

  /**
   * Retrieves all recorded feedback
   * @returns List of all feedback
   */
  public getAllFeedback(): UserFeedback[] {
    return [...this.feedbackStore];
  }

  /**
   * Retrieves feedback for a specific project
   * @param projectId The ID of the project to retrieve feedback for
   * @returns List of feedback for the project
   */
  public getFeedbackForProject(projectId: string): UserFeedback[] {
    return this.feedbackStore.filter(f => f.projectId === projectId);
  }

  /**
   * Analyzes feedback trends to identify common issues
   * @returns Summary of feedback analysis
   */
  public analyzeFeedbackTrends(): { averageRating: number; commonComplaints: Record<string, number> } {
    if (this.feedbackStore.length === 0) {
      return { averageRating: 0, commonComplaints: {} };
    }

    const totalRating = this.feedbackStore.reduce((sum, f) => sum + f.rating, 0);
    const complaints: Record<string, number> = {};

    this.feedbackStore.forEach(f => {
      if (f.rating <= 3) {
        complaints[f.category] = (complaints[f.category] || 0) + 1;
      }
    });

    return {
      averageRating: totalRating / this.feedbackStore.length,
      commonComplaints: complaints,
    };
  }

  /**
   * Marks feedback as analyzed
   * @param feedbackId ID of the feedback to mark
   */
  public markAsAnalyzed(feedbackId: string): void {
    const feedback = this.feedbackStore.find(f => f.id === feedbackId);
    if (feedback) {
      feedback.isAnalyzed = true;
    }
  }

  /**
   * Clears all feedback from memory (useful for testing)
   */
  public clearAllFeedback(): void {
    this.feedbackStore = [];
  }
}

export const feedbackLoop = new FeedbackLoop();
