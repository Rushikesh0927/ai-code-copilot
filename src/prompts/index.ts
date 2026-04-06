// ============================================================
// SECTION: Prompt Registry Index
// PURPOSE: Export all prompts and a function to combine them
// MODIFY: Add exports for new categories here
// ============================================================

import { SYSTEM_PROMPT } from './system-prompt';
export { SYSTEM_PROMPT };

// Category prompts consolidated — the system prompt already covers all 11 categories.
// Expanding 50KB of CWE/OWASP/patterns per file was adding 30-40s of AI "thinking" latency.

// ============================================================
// SECTION: Framework Detection from package.json
// PURPOSE: Auto-detect frameworks, versions, and installed deps
// ============================================================
export interface ProjectContext {
  framework: string;
  frameworkVersion: string;
  language: string;
  installedDeps: string[];
  detectedFrameworks: string[];
}

export function detectProjectContext(packageJsonContent?: string): ProjectContext {
  const ctx: ProjectContext = {
    framework: 'Unknown',
    frameworkVersion: 'Unknown',
    language: 'JavaScript',
    installedDeps: [],
    detectedFrameworks: [],
  };

  if (!packageJsonContent) return ctx;

  try {
    const pkg = JSON.parse(packageJsonContent);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    ctx.installedDeps = Object.keys(allDeps);

    // Detect primary framework
    if (allDeps['next']) {
      ctx.framework = 'Next.js';
      ctx.frameworkVersion = allDeps['next'];
      ctx.detectedFrameworks.push('next');
    } else if (allDeps['nuxt']) {
      ctx.framework = 'Nuxt.js';
      ctx.frameworkVersion = allDeps['nuxt'];
      ctx.detectedFrameworks.push('nuxt');
    } else if (allDeps['express']) {
      ctx.framework = 'Express.js';
      ctx.frameworkVersion = allDeps['express'];
      ctx.detectedFrameworks.push('express');
    } else if (allDeps['@nestjs/core']) {
      ctx.framework = 'NestJS';
      ctx.frameworkVersion = allDeps['@nestjs/core'];
      ctx.detectedFrameworks.push('nestjs');
    } else if (allDeps['fastify']) {
      ctx.framework = 'Fastify';
      ctx.frameworkVersion = allDeps['fastify'];
      ctx.detectedFrameworks.push('fastify');
    }

    // Detect additional frameworks/libraries
    if (allDeps['react']) ctx.detectedFrameworks.push('react');
    if (allDeps['vue']) ctx.detectedFrameworks.push('vue');
    if (allDeps['svelte']) ctx.detectedFrameworks.push('svelte');
    if (allDeps['angular'] || allDeps['@angular/core']) ctx.detectedFrameworks.push('angular');
    if (allDeps['next-auth']) ctx.detectedFrameworks.push('next-auth');
    if (allDeps['@supabase/supabase-js']) ctx.detectedFrameworks.push('supabase');
    if (allDeps['prisma'] || allDeps['@prisma/client']) ctx.detectedFrameworks.push('prisma');
    if (allDeps['mongoose']) ctx.detectedFrameworks.push('mongoose');
    if (allDeps['sequelize']) ctx.detectedFrameworks.push('sequelize');
    if (allDeps['typeorm']) ctx.detectedFrameworks.push('typeorm');
    if (allDeps['tailwindcss']) ctx.detectedFrameworks.push('tailwindcss');
    if (allDeps['jest'] || allDeps['vitest'] || allDeps['mocha']) ctx.detectedFrameworks.push('testing');

    // Detect language
    if (allDeps['typescript'] || pkg.devDependencies?.['typescript']) {
      ctx.language = 'TypeScript';
    }

  } catch {
    // Invalid JSON, use defaults
  }

  return ctx;
}

// ============================================================
// SECTION: Build Review Prompt (with project context)
// ============================================================
export function buildReviewPrompt(
  code: string,
  filepath: string,
  language: string,
  relatedContext?: string,
  packageJsonContent?: string,
  customRules?: string[],
  structureMap?: string
): string {
  const ctx = detectProjectContext(packageJsonContent);

  const projectSection = packageJsonContent ? `
### PROJECT CONTEXT
Framework: ${ctx.framework} ${ctx.frameworkVersion}
Language: ${ctx.language}
Detected Libraries: ${ctx.detectedFrameworks.join(', ') || 'None'}
Installed Dependencies: ${ctx.installedDeps.join(', ') || 'None'}

IMPORTANT: Your "suggestion" field must ONLY import from the packages listed above.
If a fix requires a NEW package not listed above, you MUST prefix the suggestion with: /* Requires: npm install <package-name> */
` : '';

  const contextSection = relatedContext ? `
### CROSS-FILE CONTEXT
To help you identify cross-boundary bugs (like data injection or unsafe data hand-offs), here is heavily related code retrieved from the repository using embeddings:

${relatedContext}

Use this context to check if inputs passed into or out of the Target File are properly sanitized entirely within the system.
  ` : '';

  // Inject custom live rules from APP_CONFIG
  const customRulesSection = customRules && customRules.length > 0 ? `
### CUSTOM ORGANIZATION RULES (HIGHEST PRIORITY)
You must enforce the following custom rules perfectly:
${customRules.map(rule => `- ${rule}`).join('\n')}
` : '';

  const structureSection = structureMap ? `
### TARGET FILE FUNCTION STRUCTURE (Spec B12)
The following function boundaries were extracted from the file AST.
Use these boundaries to correctly localize scoped issues (like missing 'await' or resource leaks) directly within specific functions.
${structureMap}
` : '';

  // Number each line so the AI returns accurate line numbers
  const numberedCode = code.split('\n').map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`).join('\n');

  return `
${SYSTEM_PROMPT}

### CATEGORY CHECKLIST (Review EACH)
- BUG: Null refs, unhandled exceptions, resource leaks, concurrency, dead code
- SECURITY: SQL/NoSQL/OS injection, XSS, CSRF, hardcoded secrets, weak auth, insecure deps (OWASP/CWE)
- CODE_SMELL: High complexity, poor naming, duplication, tight coupling
- PERFORMANCE: N+1 queries, sync blocking I/O, missing caching, redundant computation
- SCALABILITY: Single points of failure, unbounded queues, no rate limiting
- LINTING: Style violations, inconsistent formatting
- DESIGN_PATTERN: SOLID violations, missing abstractions, god classes
- ERROR_HANDLING: Empty catch, missing error boundaries, no graceful degradation
- ACCESSIBILITY: Missing ARIA labels, no keyboard nav, poor contrast in UI code
- API_DESIGN: Non-RESTful routes, missing validation, inconsistent response shapes

---
${customRulesSection}
${projectSection}
${contextSection}
${structureSection}

### TARGET CODE TO REVIEW
File: ${filepath}
Language: ${language}

IMPORTANT: The code below has line numbers prepended (e.g. "   1 | code here").
You MUST use these exact line numbers in the "line" field of every finding.
Do NOT guess line numbers — read them directly from the numbered prefix.

\`\`\`${language}
${numberedCode}
\`\`\`

Now, review the TARGET CODE and output the JSON array of findings.
  `.trim();
}
