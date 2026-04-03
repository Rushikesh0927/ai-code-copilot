// ============================================================
// SECTION: Review Types
// PURPOSE: Core type definitions for all review findings
// MODIFY: Add new severity levels or categories here
// ============================================================

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';

export type Category =
  | 'BUG'
  | 'SECURITY'
  | 'CODE_SMELL'
  | 'PERFORMANCE'
  | 'SCALABILITY'
  | 'LINTING'
  | 'DESIGN_PATTERN'
  | 'CODE_CORRELATION'
  | 'INLINE_SUGGESTION';

// ============================================================
// SECTION: Finding
// PURPOSE: A single code review finding (one issue detected)
// MODIFY: Add more fields here (e.g., cweId, owaspCategory)
// ============================================================
export interface Finding {
  id: string;
  file: string;
  fn?: string;          // Extracted function or class name (Spec 3.3)
  line?: number;
  endLine?: number;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  suggestion: string;
  impact?: string;      // Impact of applying suggestion (Spec 3.8)
  codeSnippet?: string;
  fixSnippet?: string;
  cweId?: string;        // e.g. "CWE-89"
  owaspCategory?: string; // e.g. "A03:2021 Injection"
  confidence: number;    // 0-100
  relatedIssues?: string[]; // Finding IDs
}

// ============================================================
// SECTION: Correlation
// PURPOSE: A cluster of related issues across files
// ============================================================
export interface Correlation {
  id: string;
  title: string;
  severity: Severity;
  issues: string[]; // List of related Finding IDs
  description: string;
  files: string[];
  relationship: string;
}

// ============================================================
// SECTION: Review Result
// PURPOSE: Complete result for one repository/PR analysis
// MODIFY: Add summary fields, metrics here
// ============================================================
export interface ReviewResult {
  id: string;
  url: string;
  type: 'PR' | 'REPO';
  repoName: string;
  totalFiles: number;
  totalLines: number;
  findings: Finding[];
  correlations: Correlation[]; // (Spec Section 5)
  summary: ReviewSummary;
  createdAt: string;
  durationMs: number;
}

export interface ReviewSummary {
  totalFindings: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<Category, number>;
  topIssues: string[];
  overallScore: number; // 0-100, higher = better
  recommendation: string;
  architectureReview?: string; // (Spec Section 8)
}

// ============================================================
// SECTION: File Review
// PURPOSE: All findings for a single file
// MODIFY: Add file-level metrics here
// ============================================================
export interface FileReview {
  path: string;
  language: string;
  lines: number;
  findings: Finding[];
  severityCount: Record<Severity, number>;
}
