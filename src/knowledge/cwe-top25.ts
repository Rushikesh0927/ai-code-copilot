// ============================================================
// SECTION: Knowledge Base — CWE Top 25 (2025)
// PURPOSE: Real vulnerability patterns from MITRE CWE Top 25
// MODIFY: Add/remove CWE entries, update severity ratings here
// SOURCE: https://cwe.mitre.org/top25/
// ============================================================

export interface CWEPattern {
  id: string;
  name: string;
  rank: number;
  description: string;
  detectPattern: string[];     // Keywords/patterns to look for in code
  vulnerableExample: string;   // Real code example
  fixExample: string;          // Fixed version
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export const CWE_TOP_25: CWEPattern[] = [
  // ---- RANK 1 ----
  {
    id: 'CWE-79',
    rank: 1,
    name: 'Cross-site Scripting (XSS)',
    description: 'Unsanitized user input rendered in browser — attacker can inject scripts',
    detectPattern: ['innerHTML', 'document.write', 'dangerouslySetInnerHTML', 'eval('],
    vulnerableExample: `element.innerHTML = userInput; // VULNERABLE: XSS`,
    fixExample: `element.textContent = userInput; // SAFE: textContent is not parsed as HTML`,
    severity: 'CRITICAL',
  },
  // ---- RANK 2 ----
  {
    id: 'CWE-89',
    rank: 2,
    name: 'SQL Injection',
    description: 'User input concatenated into SQL query — attacker can read/modify database',
    detectPattern: ['+ req.', '+ user', '+ input', 'execute(f"', 'execute("SELECT'],
    vulnerableExample: `query = "SELECT * FROM users WHERE id = " + userId; // VULNERABLE`,
    fixExample: `cursor.execute("SELECT * FROM users WHERE id = %s", (userId,)); // SAFE: parameterized`,
    severity: 'CRITICAL',
  },
  // ---- RANK 3 ----
  {
    id: 'CWE-352',
    rank: 3,
    name: 'Cross-Site Request Forgery (CSRF)',
    description: 'State-changing requests without CSRF token verification',
    detectPattern: ['POST', 'DELETE', 'PUT', 'no csrf', 'no token'],
    vulnerableExample: `app.post('/delete-account', (req, res) => { /* no CSRF check */ })`,
    fixExample: `app.post('/delete-account', csrfProtection, (req, res) => { ... })`,
    severity: 'HIGH',
  },
  // ---- RANK 4 ----
  {
    id: 'CWE-862',
    rank: 4,
    name: 'Missing Authorization',
    description: 'Endpoints accessible without checking user permissions',
    detectPattern: ['no auth', 'TODO: add auth', 'skip auth'],
    vulnerableExample: `app.get('/admin/users', (req, res) => { return db.getAllUsers(); }) // No auth check`,
    fixExample: `app.get('/admin/users', requireAdmin, (req, res) => { return db.getAllUsers(); })`,
    severity: 'CRITICAL',
  },
  // ---- RANK 6 ----
  {
    id: 'CWE-22',
    rank: 6,
    name: 'Path Traversal',
    description: 'Unsanitized file paths allow reading files outside intended directory',
    detectPattern: ['readFile(req.', 'open(request.', '../', 'path.join(userInput'],
    vulnerableExample: `fs.readFile('./uploads/' + req.query.file) // VULNERABLE: ../../../etc/passwd`,
    fixExample: `const safePath = path.resolve('./uploads', path.basename(req.query.file));`,
    severity: 'CRITICAL',
  },
  // ---- RANK 9 ----
  {
    id: 'CWE-78',
    rank: 9,
    name: 'OS Command Injection',
    description: 'User input passed to shell commands',
    detectPattern: ['exec(', 'spawn(', 'system(', 'os.system', 'subprocess.call'],
    vulnerableExample: `exec('ping ' + userInput) // VULNERABLE: userInput = "google.com; rm -rf /"`,
    fixExample: `execFile('ping', [userInput]) // SAFE: arguments are not parsed by shell`,
    severity: 'CRITICAL',
  },
  // ---- HARDCODED SECRETS (CWE-798) ----
  {
    id: 'CWE-798',
    rank: 18,
    name: 'Hard-coded Credentials',
    description: 'Passwords, API keys, or secrets embedded directly in source code',
    detectPattern: ['password =', 'secret =', 'api_key =', 'apiKey =', 'token =', 'AWS_SECRET'],
    vulnerableExample: `const API_KEY = "sk-abc123xyz"; // VULNERABLE: exposed in source`,
    fixExample: `const API_KEY = process.env.API_KEY; // SAFE: loaded from environment`,
    severity: 'CRITICAL',
  },
];
