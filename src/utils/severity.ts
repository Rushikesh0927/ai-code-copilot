// ============================================================
// SECTION: Severity Scorer
// PURPOSE: Calculate code health score from findings
// MODIFY: Adjust scoring formula, thresholds here
// ============================================================

import { Finding, Severity, ReviewSummary, Category } from '@/types/review.types';
import { SEVERITY_CONFIG, CATEGORY_CONFIG } from './constants';

export function calculateScore(findings: Finding[]): number {
  // ============================================================
  // SECTION: Score Calculation
  // PURPOSE: Penalise score based on finding severity weights logarithmically
  // MODIFY: Change formula, max penalty per finding here
  // ============================================================
  
  let severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFORMATIONAL: 0 };
  for (const f of findings) {
    if (f.severity in severityCounts) severityCounts[f.severity]++;
  }

  // Base deductions
  let penalty = (severityCounts.CRITICAL * 15) 
              + (severityCounts.HIGH * 8) 
              + (severityCounts.MEDIUM * 4) 
              + (severityCounts.LOW * 1);
              
  // Logarithmic damping for massive repositories so it rarely hits absolute 0
  if (penalty > 80) {
    penalty = 80 + (Math.log10(penalty - 79) * 5); 
  }

  return Math.max(0, Math.round(100 - penalty));
}

export function buildSummary(findings: Finding[], score: number): ReviewSummary {
  const bySeverity = {} as Record<Severity, number>;
  const byCategory = {} as Record<Category, number>;

  const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
  const categories = Object.keys(CATEGORY_CONFIG) as Category[];

  severities.forEach(s => (bySeverity[s] = 0));
  categories.forEach(c => (byCategory[c] = 0));

  for (const f of findings) {
    bySeverity[f.severity]++;
    byCategory[f.category]++;
  }

  // Top issues = most critical findings titles
  const topIssues = findings
    .filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')
    .slice(0, 5)
    .map(f => f.title);

  const recommendation =
    score >= 80 ? 'Code is in good shape. Address remaining issues when possible.' :
    score >= 60 ? 'Moderate issues found. Prioritize CRITICAL and HIGH severity items.' :
    score >= 40 ? 'Significant issues detected. Review required before merging.' :
                  'Critical issues present. This code needs substantial rework.';

  return {
    totalFindings: findings.length,
    bySeverity,
    byCategory,
    topIssues,
    overallScore: score,
    recommendation,
  };
}
