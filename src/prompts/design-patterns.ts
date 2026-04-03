// ============================================================
// SECTION: Prompts — Design Patterns
// PURPOSE: Design pattern analysis instructions
// MODIFY: Change how the AI looks for patterns here
// ============================================================

export function getDesignPatternsPrompt(): string {
  return `
### DESIGN PATTERNS FOCUS
Analyze the architectural choices and object-oriented/functional design patterns.

Look for violations of:
- SOLID principles (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion)
- DRY (Don't Repeat Yourself) — repeated logic that should be abstracted
- KISS (Keep It Simple, Stupid) — over-engineering
- Encapsulation — exposing internal state

Recommend established patterns (e.g., Factory, Strategy, Observer, Repository) if they would significantly improve the code structure.
Map findings to the 'DESIGN_PATTERN' category.
`.trim();
}
