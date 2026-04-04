// ============================================================
// SECTION: Prompts — Code Smell
// PURPOSE: Code smell instructions & dataset examples
// MODIFY: Change how the AI looks for code smells here
// ============================================================

import { CODE_SMELL_PATTERNS } from '../knowledge';

export function getCodeSmellPrompt(): string {
  const smellContext = CODE_SMELL_PATTERNS.map(smell => `- ${smell.name}: ${smell.description} (Fix: ${smell.refactoring})`).join('\n');
  
  return `
### CODE SMELL FOCUS
Look for maintainability and readability issues.
Pay attention to these common patterns (From SmellyCodeDataset):
${smellContext}

Look for:
- Deeply nested control flow
- God objects/functions
- High cyclomatic complexity
- Tight coupling
- Poor naming conventions
- Duplicate code

Map findings to the 'CODE_SMELL' category. Provide clear refactoring suggestions.
You MUST clearly explain the long term maintainability consequences or technical debt introduced in the \`impact\` field.
`.trim();
}
