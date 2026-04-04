// ============================================================
// SECTION: Knowledge — Testing Anti-Patterns
// PURPOSE: Common testing gaps and test quality issues
// ============================================================

export interface TestingPattern {
  id: string;
  name: string;
  description: string;
  detectHints: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  badExample: string;
  goodExample: string;
}

export const TESTING_PATTERNS: TestingPattern[] = [
  {
    id: 'TEST-001',
    name: 'No Assertions in Test',
    description: 'Test function that runs code but never asserts anything — always passes',
    detectHints: ['it(', 'test(', 'describe(', 'no expect', 'no assert'],
    severity: 'HIGH',
    badExample: `test('should work', () => { fetchUsers(); }); // No assertion!`,
    goodExample: `test('should return users', async () => { const users = await fetchUsers(); expect(users.length).toBeGreaterThan(0); });`,
  },
  {
    id: 'TEST-002',
    name: 'Testing Implementation Details',
    description: 'Test asserts internal state instead of observable behavior — breaks on refactoring',
    detectHints: ['private', 'internal', 'spy', 'mock', 'implementation'],
    severity: 'MEDIUM',
    badExample: `expect(component.state.isOpen).toBe(true);`,
    goodExample: `expect(screen.getByRole('dialog')).toBeVisible();`,
  },
  {
    id: 'TEST-003',
    name: 'Flaky Test (Time-Dependent)',
    description: 'Test that depends on wall-clock time, timeouts, or network calls — intermittent failures',
    detectHints: ['setTimeout', 'Date.now', 'new Date()', 'sleep', 'delay'],
    severity: 'MEDIUM',
    badExample: `test('expires', () => { const token = createToken(); sleep(5000); expect(token.isExpired()).toBe(true); });`,
    goodExample: `test('expires', () => { const token = createToken({ expiresAt: Date.now() - 1000 }); expect(token.isExpired()).toBe(true); });`,
  },
  {
    id: 'TEST-004',
    name: 'Shared Mutable State Between Tests',
    description: 'Tests modify global/shared state without cleanup — test order dependencies',
    detectHints: ['global.', 'let counter', 'module.exports.state', 'beforeAll'],
    severity: 'HIGH',
    badExample: `let db = []; test('adds', () => { db.push(1); }); test('counts', () => { expect(db.length).toBe(1); }); // Order-dependent!`,
    goodExample: `test('adds', () => { const db = []; db.push(1); expect(db.length).toBe(1); }); // Self-contained`,
  },
  {
    id: 'TEST-005',
    name: 'Missing Edge Case Coverage',
    description: 'Only testing happy path — missing null, empty, boundary, and error cases',
    detectHints: ['valid input', 'success', 'happy path', 'no error test'],
    severity: 'MEDIUM',
    badExample: `test('parses', () => { expect(parse("123")).toBe(123); }); // Only valid input!`,
    goodExample: `test('parses null', () => { expect(parse(null)).toBe(0); }); test('parses empty', () => { expect(parse("")).toBe(0); });`,
  },
  {
    id: 'TEST-006',
    name: 'Snapshot Overuse',
    description: 'Large snapshot tests that nobody reads — approved without review on any change',
    detectHints: ['toMatchSnapshot', 'toMatchInlineSnapshot', '.snap'],
    severity: 'LOW',
    badExample: `test('renders', () => { expect(render(<App />)).toMatchSnapshot(); }); // 500-line snapshot`,
    goodExample: `test('renders title', () => { render(<App />); expect(screen.getByRole('heading')).toHaveTextContent('Welcome'); });`,
  },
];
