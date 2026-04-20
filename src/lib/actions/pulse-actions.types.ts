export interface ErrorCluster {
  id: string;
  errorMessage: string;
  errorType: string;
  severity: string;
  occurrenceCount: number;
  lastOccurrenceAt: string;
  impactScore: number;
}
