// ============================================================
// SECTION: Utils — ESLint Static Pre-Pass (Spec A8/B14)
// PURPOSE: Run ESLint programmatically on files before AI analysis
// ============================================================

// @ts-ignore
import { ESLint } from 'eslint';

export interface LintResult {
  file: string;
  line: number;
  column: number;
  message: string;
  ruleId: string | null;
  severity: 1 | 2; // 1 = Warning, 2 = Error
  fixText?: string;
}

export async function runESLintPrePass(code: string, filepath: string): Promise<LintResult[]> {
  // Only lint JS/TS files
  if (!filepath.endsWith('.js') && !filepath.endsWith('.ts') && !filepath.endsWith('.jsx') && !filepath.endsWith('.tsx')) {
    return [];
  }

  try {
    // Create an ESLint instance with minimal generic rules to catch overt syntax/linting bugs universally
    // We use a programmatic approach without requiring a local .eslintrc
    const eslint = new ESLint({
      useEslintrc: false,
      overrideConfig: {
        env: {
          browser: true,
          node: true,
          es2024: true,
        },
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ecmaFeatures: {
            jsx: true,
          },
        },
        rules: {
          'no-unused-vars': 'warn',
          'no-undef': 'error',
          'no-console': 'warn',
          'no-debugger': 'error',
          'eqeqeq': ['error', 'always'],
          'no-empty': 'warn',
          'no-cond-assign': 'error',
          'no-const-assign': 'error',
        },
      },
    });

    const results = await eslint.lintText(code, { filePath: filepath });
    
    if (!results || results.length === 0) {
      return [];
    }
    
    const formatted: LintResult[] = [];
    const lines = code.split('\n');
    for (const result of results) {
      for (const msg of result.messages) {
        let fixSnippet = '';
        if (msg.fix) {
          // If ESLint provides a fix, we can try to extract the fixed line or just use the text
          // For simplicity, we just take the line of code and replace the range roughly (or just dump the new text if it's simple)
          const lineStr = lines[msg.line - 1] || '';
          fixSnippet = lineStr.replace(
            code.substring(msg.fix.range[0], msg.fix.range[1]),
            msg.fix.text
          );
        } else {
          const lineStr = lines[msg.line - 1] || '';
          // Fallback fixes for non-autofixable base rules
          if (msg.ruleId === 'no-console') {
            fixSnippet = lineStr.replace(/console\.(log|error|warn|info)\(/, 'logger.$1(');
          } else if (msg.ruleId === 'no-unused-vars') {
            fixSnippet = '// ' + lineStr.trim();
          } else if (msg.ruleId === 'no-debugger') {
            fixSnippet = '// ' + lineStr.trim();
          } else if (msg.ruleId === 'no-empty') {
            fixSnippet = lineStr.replace('{}', '{ /* TODO: implement */ }');
          }
        }

        formatted.push({
          file: filepath,
          line: msg.line,
          column: msg.column,
          message: msg.message,
          ruleId: msg.ruleId || 'syntax-error',
          severity: msg.severity,
          ...(fixSnippet ? { fixText: fixSnippet } : {})
        } as LintResult & { fixText?: string });
      }
    }
    
    return formatted;
  } catch (err) {
    console.error(`[ESLint Pre-Pass Error for ${filepath}]:`, err);
    return [];
  }
}
