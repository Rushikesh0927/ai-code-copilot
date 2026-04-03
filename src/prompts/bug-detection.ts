// ============================================================
// SECTION: Prompts — Bug Detection
// PURPOSE: Bug-specific instructions & few-shot examples
// MODIFY: Change how the AI looks for bugs here
// ============================================================

import { BUG_PATTERNS } from '../knowledge';

export function getBugDetectionPrompt(): string {
  const bugContext = BUG_PATTERNS.slice(0, 5).map(bug => `- ${bug.name}: ${bug.description}`).join('\n');
  
  return `
### BUG DETECTION FOCUS
You must detect potential logical errors and programming mistakes.
Detection must include the following categories:
- Null reference risks
- Unhandled exceptions
- Improper resource handling
- Incorrect API usage
- Memory mismanagement patterns
- Concurrency risks
- Dead code

For each bug found, you MUST clearly explain why the issue may cause failure or instability in the \`impact\` field.
Map findings strictly to the 'BUG' category.

Consider these common historical patterns as reference if applicable:
${bugContext}
`.trim();
}
