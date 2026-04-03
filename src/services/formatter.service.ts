// ============================================================
// SECTION: Services — Output Formatter
// PURPOSE: Transforms raw findings into structured navigation views
// MODIFY: Change how data is grouped for the UI here
// ============================================================

import { Finding, ReviewSummary, FileReview, Severity, Category } from '../types/review.types';
import { calculateScore, buildSummary } from '../utils/severity';

export class FormatterService {
  
  // ============================================================
  // SECTION: Generate Summary
  // PURPOSE: Calculates the global score and summary statistics
  // ============================================================
  generateSummary(findings: Finding[]): ReviewSummary {
    const score = calculateScore(findings);
    return buildSummary(findings, score);
  }

  // ============================================================
  // SECTION: Group By File
  // PURPOSE: Transforms flat findings list into file-based tree structure
  // ============================================================
  groupByFile(findings: Finding[]): FileReview[] {
    const fileMap = new Map<string, Finding[]>();

    // Group findings by file path
    for (const finding of findings) {
      if (!fileMap.has(finding.file)) {
        fileMap.set(finding.file, []);
      }
      fileMap.get(finding.file)!.push(finding);
    }

    // Convert to FileReview objects
    const result: FileReview[] = [];
    fileMap.forEach((fileFindings, path) => {
      
      const severityCount: Record<Severity, number> = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        INFORMATIONAL: 0
      };

      fileFindings.forEach(f => {
        severityCount[f.severity]++;
      });

      // Sort findings within the file by line number
      fileFindings.sort((a, b) => (a.line || 0) - (b.line || 0));

      result.push({
        path,
        language: 'Unknown', // This will be set upstream
        lines: 0, // This will be set upstream
        findings: fileFindings,
        severityCount
      });
    });

    // Sort files alphabetically
    return result.sort((a, b) => a.path.localeCompare(b.path));
  }

  // ============================================================
  // SECTION: Group By Category
  // PURPOSE: Transforms flat findings into category-based groups
  // ============================================================
  groupByCategory(findings: Finding[]): Map<Category, Finding[]> {
     const map = new Map<Category, Finding[]>();
     
     for (const finding of findings) {
         if (!map.has(finding.category)) {
             map.set(finding.category, []);
         }
         map.get(finding.category)!.push(finding);
     }
     
     return map;
  }
}
