// ============================================================
// SECTION: Prompts — Linting
// PURPOSE: Linting & formatting instructions
// MODIFY: Add custom team conventions here
// ============================================================

export function getLintingPrompt(): string {
  return `
### LINTING & CONVENTIONS FOCUS
Look for standard stylistic issues, idiomatic code violations, and formatting inconsistencies.
Do not report minor white-space issues unless they severely impact readability.

Look for:
- Missing types (in TypeScript/static languages)
- Use of \`any\` instead of proper interfaces
- Mutable state (let/var) where immutable (const) is preferred
- Magic strings that should be enums/constants
- Inconsistent naming conventions (camelCase vs snake_case)

Map findings to the 'LINTING' category, but typically keep severity LOW.
`.trim();
}
