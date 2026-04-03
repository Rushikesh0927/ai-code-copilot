// ============================================================
// SECTION: App Constants
// PURPOSE: App-wide constants, labels, color mappings
// MODIFY: Change severity colors, category labels, thresholds here
// ============================================================

import { Severity, Category } from '@/types/review.types';

// ============================================================
// SECTION: Severity Config
// PURPOSE: Display colors and labels per severity level
// MODIFY: Change colors, icons, or score weights here
// ============================================================
export const SEVERITY_CONFIG: Record<Severity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  scoreWeight: number;
  icon: string;
}> = {
  CRITICAL: {
    label: 'Critical',
    color: '#ff4444',
    bgColor: 'rgba(255,68,68,0.12)',
    borderColor: 'rgba(255,68,68,0.4)',
    scoreWeight: 25,
    icon: '🔴',
  },
  HIGH: {
    label: 'High',
    color: '#ff8800',
    bgColor: 'rgba(255,136,0,0.12)',
    borderColor: 'rgba(255,136,0,0.4)',
    scoreWeight: 10,
    icon: '🟠',
  },
  MEDIUM: {
    label: 'Medium',
    color: '#ffcc00',
    bgColor: 'rgba(255,204,0,0.12)',
    borderColor: 'rgba(255,204,0,0.4)',
    scoreWeight: 4,
    icon: '🟡',
  },
  LOW: {
    label: 'Low',
    color: '#4488ff',
    bgColor: 'rgba(68,136,255,0.12)',
    borderColor: 'rgba(68,136,255,0.4)',
    scoreWeight: 1,
    icon: '🔵',
  },
  INFORMATIONAL: {
    label: 'Info',
    color: '#aaaaaa',
    bgColor: 'rgba(170,170,170,0.12)',
    borderColor: 'rgba(170,170,170,0.4)',
    scoreWeight: 0,
    icon: '⚪',
  },
};

// ============================================================
// SECTION: Category Config
// PURPOSE: Labels and icons per review category
// MODIFY: Add new categories here (add to Category type too)
// ============================================================
export const CATEGORY_CONFIG: Record<Category, { label: string; icon: string; description: string }> = {
  BUG:              { label: 'Bug Detection',      icon: '🐛', description: 'Functional & non-functional bugs' },
  SECURITY:         { label: 'Security',           icon: '🔒', description: 'Vulnerabilities, injections, secrets' },
  CODE_SMELL:       { label: 'Code Smell',         icon: '💨', description: 'Structural quality issues' },
  PERFORMANCE:      { label: 'Performance',        icon: '⚡', description: 'Inefficient algorithms & operations' },
  SCALABILITY:      { label: 'Scalability',        icon: '📈', description: 'Issues at high load / large scale' },
  LINTING:          { label: 'Linting',            icon: '✏️', description: 'Formatting & coding standards' },
  DESIGN_PATTERN:   { label: 'Design Patterns',   icon: '🏗️', description: 'Pattern violations & anti-patterns' },
  CODE_CORRELATION: { label: 'Code Correlation',  icon: '🔗', description: 'Cross-file dependencies & coupling' },
  INLINE_SUGGESTION:{ label: 'Suggestion',        icon: '💡', description: 'Inline code improvement suggestions' },
};

// ============================================================
// SECTION: File Extension to Language Map
// PURPOSE: Detect programming language from file extension
// MODIFY: Add more languages/extensions here
// ============================================================
export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts':   'TypeScript',
  '.tsx':  'TypeScript',
  '.js':   'JavaScript',
  '.jsx':  'JavaScript',
  '.py':   'Python',
  '.java': 'Java',
  '.go':   'Go',
  '.rs':   'Rust',
  '.cpp':  'C++',
  '.c':    'C',
  '.cs':   'C#',
  '.rb':   'Ruby',
  '.php':  'PHP',
  '.swift':'Swift',
  '.kt':   'Kotlin',
  '.sql':  'SQL',
  '.sh':   'Shell',
};

// ============================================================
// SECTION: Code Review Limits
// PURPOSE: Thresholds for code smell detection
// MODIFY: Change line limits, nesting depth here
// ============================================================
export const CODE_LIMITS = {
  MAX_FILE_LINES: 300,        // Files over this are flagged
  MAX_FUNCTION_LINES: 100,    // Functions over this are flagged
  MAX_NESTING_DEPTH: 4,       // Nesting depth over this is flagged
  MAX_PARAMS: 5,              // Function params over this are flagged
  MAX_COGNITIVE_COMPLEXITY: 15,
};

// Supported file extensions for analysis
export const SUPPORTED_EXTENSIONS = Object.keys(EXTENSION_TO_LANGUAGE);

// Files/dirs to skip during analysis
export const SKIP_PATTERNS = [
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
  '.env', '.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock',
  '__pycache__', '.pyc', 'venv', '.venv',
];
