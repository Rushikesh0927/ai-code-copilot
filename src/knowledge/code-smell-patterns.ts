// ============================================================
// SECTION: Knowledge Base — Code Smell Patterns
// PURPOSE: Common code smell detection rules
// MODIFY: Adjust thresholds, add new smell types here
// SOURCE: SmellyCodeDataset (HRI-EU), DACOS, Martin Fowler's Refactoring
// ============================================================

export interface CodeSmellPattern {
  id: string;
  name: string;
  description: string;
  detectHints: string[];      // Keywords, patterns suggesting this smell
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  refactoring: string;        // How to fix it
}

export const CODE_SMELL_PATTERNS: CodeSmellPattern[] = [
  // ---- FILE-LEVEL SMELLS ----
  {
    id: 'SMELL-001',
    name: 'God File / Large File',
    description: 'File exceeds 300 lines — too many responsibilities in one place',
    detectHints: ['file > 300 lines'],
    severity: 'MEDIUM',
    refactoring: 'Split into smaller, single-responsibility modules',
  },
  {
    id: 'SMELL-002',
    name: 'Long Method / God Function',
    description: 'Function exceeds 100 lines — violates Single Responsibility Principle',
    detectHints: ['function > 100 lines'],
    severity: 'MEDIUM',
    refactoring: 'Extract smaller helper functions, each with a single clear purpose',
  },
  // ---- FUNCTION-LEVEL SMELLS ----
  {
    id: 'SMELL-003',
    name: 'Deep Nesting',
    description: 'More than 4 levels of nesting (if/else, loops, try/catch) — hard to read and test',
    detectHints: ['nested if', 'nested for', 'nested try'],
    severity: 'MEDIUM',
    refactoring: 'Use early returns (guard clauses), extract functions, use flat async/await',
  },
  {
    id: 'SMELL-004',
    name: 'Too Many Parameters',
    description: 'Function has more than 5 parameters — hard to call and test',
    detectHints: ['function(a, b, c, d, e, f'],
    severity: 'LOW',
    refactoring: 'Group related params into an object/config struct',
  },
  {
    id: 'SMELL-005',
    name: 'Dead Code',
    description: 'Unreachable code, unused variables, functions never called',
    detectHints: ['TODO', 'FIXME', 'commented code', 'unused import'],
    severity: 'LOW',
    refactoring: 'Remove dead code; use version control if you need history',
  },
  // ---- DESIGN SMELLS ----
  {
    id: 'SMELL-006',
    name: 'Tight Coupling',
    description: 'Module directly depends on implementation details of another — hard to change one without breaking the other',
    detectHints: ['import ... from concrete class', 'new ConcreteClass()'],
    severity: 'HIGH',
    refactoring: 'Depend on interfaces/abstractions, use dependency injection',
  },
  {
    id: 'SMELL-007',
    name: 'Cyclic Dependency',
    description: 'Module A imports Module B which imports Module A — creates tight coupling and makes testing hard',
    detectHints: ['circular import', 'circular dependency'],
    severity: 'HIGH',
    refactoring: 'Extract shared logic to a third module both can import',
  },
  {
    id: 'SMELL-008',
    name: 'Poor Naming Convention',
    description: 'Variables/functions with single letters, abbreviations, or misleading names',
    detectHints: ['def x(', 'var a =', 'let tmp =', 'def foo('],
    severity: 'LOW',
    refactoring: 'Use descriptive, intention-revealing names',
  },
  {
    id: 'SMELL-009',
    name: 'Magic Numbers / Strings',
    description: 'Unexplained literal values embedded in code',
    detectHints: ['== 42', '== "admin"', '* 86400', '/ 1000'],
    severity: 'LOW',
    refactoring: 'Extract as named constants with explanatory names',
  },
  {
    id: 'SMELL-010',
    name: 'Console.log / Print Left in Code',
    description: 'Debug logging statements left in production code',
    detectHints: ['console.log', 'print(', 'System.out.println', 'puts '],
    severity: 'LOW',
    refactoring: 'Use a proper logging library with configurable log levels',
  },
];
