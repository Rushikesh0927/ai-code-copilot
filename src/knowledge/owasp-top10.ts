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
  {
    id: 'A04:2021',
    rank: 4,
    name: 'Insecure Design',
    description: 'Missing or ineffective control design — flaws at architecture level, not implementation',
    detectHints: ['no threat model', 'design flaw', 'trust boundary', 'no rate limit'],
    severity: 'HIGH',
    mitigations: [
      'Use threat modeling during design phase',
      'Implement secure design patterns (defense in depth, least privilege)',
      'Establish and use secure development lifecycle (SDLC)',
    ],
    cweIds: ['CWE-20', 'CWE-116', 'CWE-501'],
  },
  {
    id: 'A06:2021',
    rank: 6,
    name: 'Vulnerable and Outdated Components',
    description: 'Using libraries/frameworks with known vulnerabilities or that are no longer maintained',
    detectHints: ['npm audit', 'outdated', 'CVE-', 'deprecated package'],
    severity: 'HIGH',
    mitigations: [
      'Regularly update all dependencies (npm audit fix)',
      'Use software composition analysis (SCA) tools',
      'Remove unused dependencies and lock versions',
    ],
    cweIds: ['CWE-1035', 'CWE-937', 'CWE-1104'],
  },
  {
    id: 'A08:2021',
    rank: 8,
    name: 'Software and Data Integrity Failures',
    description: 'Code and infra that does not protect against integrity violations — unsigned updates, insecure deserialization',
    detectHints: ['deserialization', 'JSON.parse(user', 'eval(', 'unsigned', 'CI/CD'],
    severity: 'HIGH',
    mitigations: [
      'Verify digital signatures on software updates and dependencies',
      'Use integrity checks (SRI) for client-side resources',
      'Protect CI/CD pipelines with access controls and signing',
    ],
    cweIds: ['CWE-502', 'CWE-345', 'CWE-494'],
  },
  {
    id: 'A09:2021',
    rank: 9,
    name: 'Security Logging and Monitoring Failures',
    description: 'Insufficient logging of security events and ineffective incident response',
    detectHints: ['no logging', 'console.log', 'missing audit', 'no monitoring'],
    severity: 'MEDIUM',
    mitigations: [
      'Log all authentication, access control, and input validation failures',
      'Use centralized log management with alerting',
      'Establish an incident response and recovery plan',
    ],
    cweIds: ['CWE-778', 'CWE-223', 'CWE-532'],
  },
  {
    id: 'A10:2021',
    rank: 10,
    name: 'Server-Side Request Forgery (SSRF)',
    description: 'Application fetches remote resource using user-supplied URL without validation',
    detectHints: ['fetch(req.', 'axios(user', 'proxy(', 'url=http'],
    severity: 'HIGH',
    mitigations: [
      'Validate and sanitize all user-supplied URLs',
      'Use allowlists for permitted domains and IP ranges',
      'Disable HTTP redirections and restrict URL schemes',
    ],
    cweIds: ['CWE-918', 'CWE-20', 'CWE-441'],
  },
];
