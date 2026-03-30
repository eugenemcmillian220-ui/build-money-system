/**
 * Learning Store System for AI App Builder
 * Stores training data, AI patterns, and user preferences to improve the model over time
 */

export interface LearningData {
  id: string;
  source: 'feedback' | 'debugger' | 'swarm';
  type: 'pattern' | 'optimization' | 'preference' | 'error-fix';
  content: string;
  impact: 'low' | 'medium' | 'high';
  timestamp: string;
  isApplied: boolean;
}

export class LearningStore {
  private store: LearningData[] = [];

  constructor() {}

  /**
   * Adds new learning data to the store
   * @param data The learning data to add
   * @returns boolean indicating success
   */
  public async addLearningData(data: Omit<LearningData, 'id' | 'timestamp' | 'isApplied'>): Promise<LearningData> {
    const newData: LearningData = {
      ...data,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      isApplied: false,
    };

    this.store.push(newData);
    // In a real app, this would be saved to a database for learning data
    // console.log(`Learning data added: ${data.type} from ${data.source}`);
    
    return newData;
  }

  /**
   * Retrieves all learning data
   * @returns List of all learning data
   */
  public getAllLearningData(): LearningData[] {
    return [...this.store];
  }

  /**
   * Retrieves unapplied learning data
   * @returns List of all learning data that hasn't been applied
   */
  public getPendingLearningData(): LearningData[] {
    return this.store.filter(d => !d.isApplied);
  }

  /**
   * Marks learning data as applied
   * @param learningDataId ID of the learning data to mark
   */
  public markAsApplied(learningDataId: string): void {
    const data = this.store.find(d => d.id === learningDataId);
    if (data) {
      data.isApplied = true;
    }
  }

  /**
   * Searches for learning data by type
   * @param type The type of learning data to find
   * @returns List of matching learning data
   */
  public findByType(type: LearningData['type']): LearningData[] {
    return this.store.filter(d => d.type === type);
  }

  /**
   * Summarizes all learning data by type and impact
   * @returns Summary of all learning data
   */
  public summarizeLearning(): { totalCount: number; appliedCount: number; pendingCount: number; typeDistribution: Record<string, number> } {
    const distribution: Record<string, number> = {};
    let appliedCount = 0;

    this.store.forEach(d => {
      distribution[d.type] = (distribution[d.type] || 0) + 1;
      if (d.isApplied) appliedCount++;
    });

    return {
      totalCount: this.store.length,
      appliedCount,
      pendingCount: this.store.length - appliedCount,
      typeDistribution: distribution,
    };
  }

  /**
   * Clears all learning data from memory (useful for testing)
   */
  public clearAllLearningData(): void {
    this.store = [];
  }
}

export const learningStore = new LearningStore();
