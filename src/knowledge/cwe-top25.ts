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
  // ---- RANK 5 ----
  {
    id: 'CWE-434',
    rank: 5,
    name: 'Unrestricted Upload of File with Dangerous Type',
    description: 'File upload without validating file type allows uploading executable scripts',
    detectPattern: ['multer', 'upload', 'file.type', 'req.file', 'FormData'],
    vulnerableExample: `app.post('/upload', upload.single('file'), (req,res) => { /* no type check */ })`,
    fixExample: `const allowed = ['.png','.jpg','.pdf']; if (!allowed.includes(path.extname(file.name))) reject();`,
    severity: 'HIGH',
  },
  // ---- RANK 7 ----
  {
    id: 'CWE-476',
    rank: 7,
    name: 'NULL Pointer Dereference',
    description: 'Accessing properties of null/undefined without checking — causes crashes',
    detectPattern: ['.property', 'undefined.', 'null.', 'Cannot read properties of'],
    vulnerableExample: `const name = user.profile.name; // Crashes if user or profile is null`,
    fixExample: `const name = user?.profile?.name ?? 'Unknown'; // SAFE: optional chaining + fallback`,
    severity: 'MEDIUM',
  },
  // ---- RANK 8 ----
  {
    id: 'CWE-20',
    rank: 8,
    name: 'Improper Input Validation',
    description: 'Accepting input without verifying it meets expected format, length, or type',
    detectPattern: ['req.body.', 'req.query.', 'req.params.', 'parseInt(req', 'JSON.parse(req'],
    vulnerableExample: `const age = req.body.age; db.query("UPDATE users SET age=" + age);`,
    fixExample: `const age = parseInt(req.body.age); if (isNaN(age) || age < 0 || age > 150) return res.status(400).send('Invalid age');`,
    severity: 'HIGH',
  },
  // ---- RANK 10 ----
  {
    id: 'CWE-787',
    rank: 10,
    name: 'Out-of-bounds Write',
    description: 'Writing data past the end of a buffer — can corrupt memory or execute code',
    detectPattern: ['Buffer.alloc', 'buffer.write', 'strcpy', 'memcpy', 'array[index]'],
    vulnerableExample: `buffer.write(userInput, 0, buffer.length + 100); // Writes past buffer`,
    fixExample: `buffer.write(userInput, 0, Math.min(userInput.length, buffer.length));`,
    severity: 'CRITICAL',
  },
  // ---- RANK 11 ----
  {
    id: 'CWE-200',
    rank: 11,
    name: 'Exposure of Sensitive Information',
    description: 'Error messages, logs, or responses reveal internal system details',
    detectPattern: ['stack trace', 'error.message', 'error.stack', 'console.error(err)', 'res.send(error)'],
    vulnerableExample: `res.status(500).json({ error: error.stack }); // Leaks internal details`,
    fixExample: `console.error(error); res.status(500).json({ error: 'Internal server error' });`,
    severity: 'MEDIUM',
  },
  // ---- RANK 12 ----
  {
    id: 'CWE-502',
    rank: 12,
    name: 'Deserialization of Untrusted Data',
    description: 'Deserializing user-controlled data can lead to arbitrary code execution',
    detectPattern: ['JSON.parse(req', 'unserialize', 'pickle.loads', 'yaml.load('],
    vulnerableExample: `const obj = JSON.parse(req.body); eval(obj.callback); // Code execution`,
    fixExample: `const obj = JSON.parse(req.body); if (!isValidSchema(obj)) throw new Error('Invalid data');`,
    severity: 'CRITICAL',
  },
  // ---- RANK 13 ----
  {
    id: 'CWE-287',
    rank: 13,
    name: 'Improper Authentication',
    description: 'Authentication mechanism can be bypassed or is improperly implemented',
    detectPattern: ['login', 'authenticate', 'bcrypt.compare', 'jwt.verify', 'session'],
    vulnerableExample: `if (password === storedPassword) { /* plain text comparison */ }`,
    fixExample: `const match = await bcrypt.compare(password, hashedPassword); if (!match) return 401;`,
    severity: 'CRITICAL',
  },
  // ---- RANK 14 ----
  {
    id: 'CWE-918',
    rank: 14,
    name: 'Server-Side Request Forgery (SSRF)',
    description: 'Application fetches user-supplied URLs without validation — can access internal resources',
    detectPattern: ['fetch(userUrl', 'axios.get(req.', 'http.get(param', 'proxy'],
    vulnerableExample: `const data = await fetch(req.query.url); // Attacker can access http://169.254.169.254/`,
    fixExample: `const url = new URL(req.query.url); if (!allowedDomains.includes(url.hostname)) throw 'Blocked';`,
    severity: 'HIGH',
  },
  // ---- RANK 15 ----
  {
    id: 'CWE-306',
    rank: 15,
    name: 'Missing Authentication for Critical Function',
    description: 'Critical functionality accessible without any authentication check',
    detectPattern: ['admin', 'delete', 'create', 'update', 'no auth check'],
    vulnerableExample: `app.delete('/api/users/:id', (req, res) => { db.deleteUser(req.params.id); });`,
    fixExample: `app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => { db.deleteUser(req.params.id); });`,
    severity: 'CRITICAL',
  },
];
