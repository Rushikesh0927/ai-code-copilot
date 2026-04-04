// ============================================================
// SECTION: Knowledge — Accessibility (a11y) Patterns
// PURPOSE: WCAG 2.1 violations common in web applications
// ============================================================

export interface A11yPattern {
  id: string;
  name: string;
  wcagCriteria: string;
  description: string;
  detectHints: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  badExample: string;
  goodExample: string;
}

export const A11Y_PATTERNS: A11yPattern[] = [
  {
    id: 'A11Y-001',
    name: 'Missing Alt Text',
    wcagCriteria: '1.1.1 Non-text Content',
    description: 'Images without alt attributes are invisible to screen readers',
    detectHints: ['<img', 'Image', 'src=', 'no alt'],
    severity: 'HIGH',
    badExample: `<img src="/logo.png" />`,
    goodExample: `<img src="/logo.png" alt="Company Logo" />`,
  },
  {
    id: 'A11Y-002',
    name: 'Non-Semantic Click Handler',
    wcagCriteria: '4.1.2 Name, Role, Value',
    description: 'Using div/span with onClick instead of button — not keyboard accessible',
    detectHints: ['<div onClick', '<span onClick', 'div role=', 'cursor: pointer'],
    severity: 'HIGH',
    badExample: `<div onClick={handleClick} style={{cursor:'pointer'}}>Click me</div>`,
    goodExample: `<button onClick={handleClick}>Click me</button>`,
  },
  {
    id: 'A11Y-003',
    name: 'Missing Form Label',
    wcagCriteria: '1.3.1 Info and Relationships',
    description: 'Input fields without labels are inaccessible to screen readers',
    detectHints: ['<input', '<select', '<textarea', 'placeholder=', 'no label'],
    severity: 'HIGH',
    badExample: `<input type="text" placeholder="Enter name" />`,
    goodExample: `<label htmlFor="name">Name</label><input id="name" type="text" />`,
  },
  {
    id: 'A11Y-004',
    name: 'Missing Focus Indicator',
    wcagCriteria: '2.4.7 Focus Visible',
    description: 'Removing outline without providing alternative focus styles',
    detectHints: ['outline: none', 'outline: 0', ':focus { outline:', '*:focus'],
    severity: 'MEDIUM',
    badExample: `button:focus { outline: none; }`,
    goodExample: `button:focus { outline: none; box-shadow: 0 0 0 2px #4a90d9; }`,
  },
  {
    id: 'A11Y-005',
    name: 'Missing Keyboard Navigation',
    wcagCriteria: '2.1.1 Keyboard',
    description: 'Interactive elements with onClick but no keyboard event handler',
    detectHints: ['onClick', 'no onKeyDown', 'no onKeyPress', 'tabIndex'],
    severity: 'MEDIUM',
    badExample: `<div onClick={toggle} tabIndex={0}>Toggle</div>`,
    goodExample: `<div onClick={toggle} onKeyDown={(e) => e.key === 'Enter' && toggle()} tabIndex={0} role="button">Toggle</div>`,
  },
  {
    id: 'A11Y-006',
    name: 'Color-Only Information',
    wcagCriteria: '1.4.1 Use of Color',
    description: 'Using only color to convey information (errors, status) without text/icon alternative',
    detectHints: ['color: red', 'color: green', 'background: #ff', 'border-color:'],
    severity: 'LOW',
    badExample: `<span style={{color: 'red'}}>{status}</span>`,
    goodExample: `<span style={{color: 'red'}}>❌ {status}</span>`,
  },
  {
    id: 'A11Y-007',
    name: 'Missing Language Attribute',
    wcagCriteria: '3.1.1 Language of Page',
    description: 'HTML document without lang attribute prevents screen readers from selecting correct pronunciation',
    detectHints: ['<html', 'no lang', '<html>'],
    severity: 'MEDIUM',
    badExample: `<html><head>...`,
    goodExample: `<html lang="en"><head>...`,
  },
  {
    id: 'A11Y-008',
    name: 'Missing ARIA on Dynamic Content',
    wcagCriteria: '4.1.3 Status Messages',
    description: 'Dynamic content changes (loading states, errors) without aria-live for screen readers',
    detectHints: ['isLoading', 'loading', 'spinner', 'toast', 'alert', 'notification'],
    severity: 'LOW',
    badExample: `{isLoading && <div>Loading...</div>}`,
    goodExample: `{isLoading && <div role="status" aria-live="polite">Loading...</div>}`,
  },
];
