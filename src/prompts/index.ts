// ============================================================
// SECTION: Prompt Registry Index
// PURPOSE: Export all prompts and a function to combine them
// MODIFY: Add exports for new categories here
// ============================================================

import { SYSTEM_PROMPT } from './system-prompt';
import { getBugDetectionPrompt } from './bug-detection';
import { getSecurityPrompt } from './security';
import { getCodeSmellPrompt } from './code-smell';
import { getPerformancePrompt } from './performance';
import { getScalabilityPrompt } from './scalability';
import { getLintingPrompt } from './linting';
import { getDesignPatternsPrompt } from './design-patterns';

export * from './system-prompt';

export function buildReviewPrompt(code: string, filepath: string, language: string, relatedContext?: string): string {
  const contextSection = relatedContext ? `
### CROSS-FILE CONTEXT
To help you identify cross-boundary bugs (like data injection or unsafe data hand-offs), here is heavily related code retrieved from the repository using embeddings:

${relatedContext}

Use this context to check if inputs passed into or out of the Target File are properly sanitized entirely within the system.
  ` : '';

  return `
${SYSTEM_PROMPT}

${getBugDetectionPrompt()}
${getSecurityPrompt()}
${getCodeSmellPrompt()}
${getPerformancePrompt()}
${getScalabilityPrompt()}
${getLintingPrompt()}
${getDesignPatternsPrompt()}

---
${contextSection}

### TARGET CODE TO REVIEW
File: ${filepath}
Language: ${language}

\`\`\`${language}
${code}
\`\`\`

Now, review the TARGET CODE and output the JSON array of findings.
  `.trim();
}
