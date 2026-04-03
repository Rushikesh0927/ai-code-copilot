// ============================================================
// SECTION: Prompts — Scalability
// PURPOSE: Scalability instructions
// MODIFY: Change how the AI looks for scalability issues here
// ============================================================

export function getScalabilityPrompt(): string {
  return `
### SCALABILITY FOCUS
Analyze how this code will behave when scaling from 100 users to 100,000+ users or massive data volumes.

Look for:
- In-memory state holding (should be in Redis/distributed cache)
- Missing pagination on large datasets
- Unbounded queues or arrays
- Un-indexed database queries
- Single points of failure
- Stateful connections preventing horizontal scaling

Map findings to the 'SCALABILITY' category.
`.trim();
}
