// ============================================================
// SECTION: Knowledge Base — OWASP Top 10 (2025)
// PURPOSE: OWASP web application security risks
// MODIFY: Update categories, add detection patterns here
// SOURCE: https://owasp.org/www-project-top-ten/
// ============================================================

export interface OWASPCategory {
  id: string;
  rank: number;
  name: string;
  description: string;
  detectHints: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  mitigations: string[];
  cweIds: string[];
}

export const OWASP_TOP_10: OWASPCategory[] = [
  {
    id: 'A01:2021',
    rank: 1,
    name: 'Broken Access Control',
    description: 'Users acting outside of their intended permissions — missing auth checks',
    detectHints: ['no auth', 'skip auth', 'isAdmin', 'req.user', 'role'],
    severity: 'CRITICAL',
    mitigations: [
      'Deny by default — every endpoint requires explicit permission grant',
      'Implement role-based access control (RBAC)',
      'Log access control failures and alert on repeated failures',
    ],
    cweIds: ['CWE-862', 'CWE-863', 'CWE-284'],
  },
  {
    id: 'A02:2021',
    rank: 2,
    name: 'Cryptographic Failures',
    description: 'Weak or absent encryption for sensitive data in transit or at rest',
    detectHints: ['MD5', 'SHA1', 'base64', 'btoa(', 'http://', 'no https'],
    severity: 'HIGH',
    mitigations: [
      'Use strong algorithms: AES-256, SHA-256 or better',
      'Never use MD5 or SHA1 for passwords or sensitive data',
      'Enforce HTTPS everywhere',
    ],
    cweIds: ['CWE-327', 'CWE-328', 'CWE-311'],
  },
  {
    id: 'A03:2021',
    rank: 3,
    name: 'Injection',
    description: 'SQL, NoSQL, OS, LDAP injection via untrusted user input',
    detectHints: ['+ req.', '+ userInput', 'execute(f"', "f'SELECT", '`SELECT'],
    severity: 'CRITICAL',
    mitigations: [
      'Use parameterized queries / prepared statements — never string concat',
      'Validate and sanitize all inputs',
      'Use ORM with built-in injection protection',
    ],
    cweIds: ['CWE-89', 'CWE-77', 'CWE-78'],
  },
  {
    id: 'A05:2021',
    rank: 5,
    name: 'Security Misconfiguration',
    description: 'Default configs, unnecessary features enabled, verbose error messages',
    detectHints: ['DEBUG=True', 'debug: true', 'CORS: *', 'allow_all', 'showStack'],
    severity: 'HIGH',
    mitigations: [
      'Disable debug mode in production',
      'Remove default accounts and credentials',
      'Configure CORS explicitly, not with wildcard *',
    ],
    cweIds: ['CWE-16', 'CWE-312'],
  },
  {
    id: 'A07:2021',
    rank: 7,
    name: 'Identification and Authentication Failures',
    description: 'Weak passwords, missing MFA, improper session management',
    detectHints: ['password', 'session', 'token', 'cookie', 'jwt'],
    severity: 'HIGH',
    mitigations: [
      'Enforce strong password policies',
      'Implement account lockout after repeated failures',
      'Use secure, HttpOnly, SameSite cookies',
    ],
    cweIds: ['CWE-287', 'CWE-798', 'CWE-306'],
  },
];
