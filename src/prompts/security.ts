// ============================================================
// SECTION: Prompts — Security Prompt
// PURPOSE: Security-specific instructions & few-shot examples
// MODIFY: Change how the AI looks for security issues here
// ============================================================

import { CWE_TOP_25, OWASP_TOP_10, SECURITY_EXAMPLES } from '../knowledge';

export function getSecurityPrompt(): string {
  // Take top 3 CWEs and OWASP principles for context
  const cweContext = CWE_TOP_25.map(cwe => `- ${cwe.id} (${cwe.name}): ${cwe.description}`).join('\n');
  const owaspContext = OWASP_TOP_10.map(ow => `- ${ow.id} (${ow.name}): ${ow.description} | Mitigations: ${ow.mitigations.join('; ')}`).join('\n');
  
  // Take 2 specific few-shot examples
  const fewShot = SECURITY_EXAMPLES.map((ex, i) => `
EXAMPLE ${i+1} (${ex.cwe} - ${ex.title}):
Vulnerable Code:
${ex.vulnerableCode}
Fix:
${ex.fixedCode}
Why: ${ex.findingDescription}
`).join('\n');

  return `
### SECURITY ANALYSIS FOCUS
Look specifically for Security Vulnerabilities.
Pay attention to:
${cweContext}
${owaspContext}

### CRITICAL REQUIREMENTS
You must explicitly verify and detect:
- Injection vulnerabilities (SQL, NoSQL, OS Command, XSS)
- Unsafe input handling and Non-Standard Input Vectors (Message Queues, WebSockets, Audio/Image uploads, external API payloads, NLP parsing layers)
- Hardcoded secrets or credentials
- Weak authentication or authorization patterns
- Improper encryption usage
- Insecure network communication
- Dependency vulnerabilities

### FEW-SHOT EXAMPLES (From SecureCode v2.0 Dataset)
${fewShot}

Verify that all user inputs (including audio/speech payloads) are sanitized, queries are parameterized, secrets are not hardcoded, and access control is enforced.
`.trim();
}
