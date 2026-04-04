// ============================================================
// SECTION: Prompts — Accessibility (a11y)
// PURPOSE: Detect WCAG violations in UI code
// ============================================================

export function getAccessibilityPrompt(): string {
  return `
### ACCESSIBILITY (a11y) FOCUS
If this file contains UI/frontend code (HTML, JSX, Vue templates, Svelte), check for accessibility violations.
SKIP this section entirely for backend/server-only files.

WCAG 2.1 Level AA Violations to detect:
- Missing alt text on images: <img> without alt attribute
- Non-semantic HTML: <div onClick> instead of <button>
- Missing form labels: <input> without associated <label> or aria-label
- Missing ARIA attributes on interactive elements
- Insufficient color contrast (if hardcoded colors are visible)
- Missing keyboard navigation: onClick without onKeyDown/onKeyPress
- Missing focus indicators: outline: none without replacement focus style
- Missing lang attribute on <html>
- Auto-playing media without controls
- Missing skip-to-content links for screen readers
- Interactive elements without accessible names
- Missing role attributes on custom interactive components

Only report these if the file clearly contains UI rendering code.
Map findings to 'CODE_SMELL' category with severity LOW or MEDIUM.
Do NOT flag accessibility issues in API routes, services, or data files.
`.trim();
}
