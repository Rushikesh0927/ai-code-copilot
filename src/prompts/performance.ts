// ============================================================
// SECTION: Prompts — Performance
// PURPOSE: Performance instructions & dataset examples
// MODIFY: Change how the AI looks for performance anti-patterns here
// ============================================================

import { PERFORMANCE_ANTI_PATTERNS } from '../knowledge';

export function getPerformancePrompt(): string {
  const perfContext = PERFORMANCE_ANTI_PATTERNS.map(perf => `- ${perf.name}: ${perf.description} (Impact: ${perf.impact})`).join('\n');
  
  return `
### PERFORMANCE FOCUS
Look for inefficient code that will cause latency or high CPU/Memory usage.
Pay attention to these common anti-patterns:
${perfContext}

Look for:
- N+1 query problems
- Synchronous blocking I/O
- Redundant re-computations
- Missing caching
- Inefficient DOM updates (if frontend)

Map findings to the 'PERFORMANCE' category. Explain the Big-O impact if applicable.
You MUST clearly explain the system latency, scaling bottlenecks, or resource degradation in the \`impact\` field.
`.trim();
}
