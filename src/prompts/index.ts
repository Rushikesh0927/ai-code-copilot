// ============================================================
// SECTION: Prompt Registry Index
// PURPOSE: Export all prompts and a function to combine them
// MODIFY: Add exports for new categories here
// ============================================================

import { SYSTEM_PROMPT } from './system-prompt';
import { getBugDetectionPrompt } from './bug-detection';
import { getSecurityPrompt } from './security';
import { getCodeSmellPrompt } from './code-smell';
import { getPerformancePrompt } from './performance';
import { getScalabilityPrompt } from './scalability';
import { getLintingPrompt } from './linting';
import { getDesignPatternsPrompt } from './design-patterns';
import { getErrorHandlingPrompt } from './error-handling';
import { getAccessibilityPrompt } from './accessibility';
import { getAPIDesignPrompt } from './api-design';

export * from './system-prompt';

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
  customRules?: string[]
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

  return `
${SYSTEM_PROMPT}

${getBugDetectionPrompt()}
${getSecurityPrompt()}
${getCodeSmellPrompt()}
${getPerformancePrompt()}
${getScalabilityPrompt()}
${getLintingPrompt()}
${getDesignPatternsPrompt()}
${getErrorHandlingPrompt()}
${getAccessibilityPrompt()}
${getAPIDesignPrompt()}

---
${customRulesSection}
${projectSection}
${contextSection}

### TARGET CODE TO REVIEW
File: ${filepath}
Language: ${language}

\`\`\`${language}
${code}
\`\`\`

Now, review the TARGET CODE and output the JSON array of findings.
  `.trim();
}
