// ============================================================
// SECTION: Analysis Types
// PURPOSE: Types for analysis progress tracking
// MODIFY: Add more status stages here
// ============================================================

export type AnalysisStatus =
  | 'QUEUED'
  | 'FETCHING'
  | 'ANALYZING'
  | 'REVIEWING'
  | 'COMPLETE'
  | 'ERROR';

export interface AnalysisJob {
  id: string;
  url: string;
  status: AnalysisStatus;
  progress: number;       // 0-100
  currentFile?: string;
  totalFiles: number;
  processedFiles: number;
  startedAt: string;
  estimatedMs?: number;
  error?: string;
}

export interface AnalysisRequest {
  url: string;
  githubToken?: string;
}
