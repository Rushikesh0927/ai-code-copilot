// ============================================================
// SECTION: Knowledge Base — Security Few-Shot Examples
// PURPOSE: Real vulnerable + fixed datasets for few-shot prompting
// MODIFY: Add examples here to teach the AI what vulnerabilities look like
// SOURCE: SecureCode v2.0 dataset (CWE grounded examples)
// ============================================================

export interface SecurityExample {
  title: string;
  cwe: string;
  vulnerableCode: string;
  fixedCode: string;
  findingDescription: string;
  suggestion: string;
}

export const SECURITY_EXAMPLES: SecurityExample[] = [
  // Example 1: CWE-89 SQL Injection
  {
    title: 'SQL Injection in User Lookup',
    cwe: 'CWE-89',
    vulnerableCode: `
function getUser(userId) {
  const query = "SELECT * FROM users WHERE id = " + userId;
  return db.execute(query);
}
    `.trim(),
    fixedCode: `
function getUser(userId) {
  const query = "SELECT * FROM users WHERE id = ?";
  return db.execute(query, [userId]);
}
    `.trim(),
    findingDescription: `The \`userId\` parameter is directly concatenated into the SQL query string. This is a classic CWE-89 SQL Injection vulnerability. An attacker can pass \`1 OR 1=1\` as the userId to bypass authentication or access records they shouldn't see.`,
    suggestion: `Use parameterized queries or prepared statements. The database driver will safely escape the input, completely mitigating SQL injection.`,
  },
  
  // Example 2: CWE-79 XSS
  {
    title: 'Reflected Cross-site Scripting (XSS)',
    cwe: 'CWE-79',
    vulnerableCode: `
app.get('/search', (req, res) => {
  const query = req.query.q;
  res.send('<h1>Search results for ' + query + '</h1>');
});
    `.trim(),
    fixedCode: `
app.get('/search', (req, res) => {
  const query = req.query.q;
  // Using a templating engine that auto-escapes or a dedicated sanitization library
  const safeQuery = escapeHtml(query);
  res.send('<h1>Search results for ' + safeQuery + '</h1>');
});
    `.trim(),
    findingDescription: `Untrusted user input from \`req.query.q\` is directly rendered into the HTML response without sanitization. This is a CWE-79 Reflected XSS vulnerability. An attacker can craft a malicious URL containing a \`<script>\` payload which will execute in the victim's browser.`,
    suggestion: `Never render unsanitized user input into HTML. Use a context-aware output encoding library (like DOMPurify on the frontend or a robust templating engine on the backend) to escape HTML entities before rendering.`,
  },

  // Example 3: CWE-22 Path Traversal
  {
    title: 'Path Traversal in File Download',
    cwe: 'CWE-22',
    vulnerableCode: `
app.get('/download', (req, res) => {
  const filename = req.query.file;
  const filePath = path.join(__dirname, 'public/downloads', filename);
  res.download(filePath);
});
    `.trim(),
    fixedCode: `
app.get('/download', (req, res) => {
  const filename = req.query.file;
  // Ensure the filename doesn't contain directory traversal characters
  const safeFilename = path.basename(filename);
  const filePath = path.join(__dirname, 'public/downloads', safeFilename);
  res.download(filePath);
});
    `.trim(),
    findingDescription: `The \`req.query.file\` variable is used to construct a file path without validation. This is a CWE-22 Path Traversal vulnerability. An attacker can provide a payload like \`../../../../etc/passwd\` to access sensitive files outside the intended \`public/downloads\` directory.`,
    suggestion: `Sanitize the user input. In Node.js, use \`path.basename()\` to extract only the filename portion of the input, stripping out any traversal characters like \`../\`. Alternatively, resolve the absolute path and verify it starts with the expected base directory.`,
  },
  
  // Example 4: CWE-798 Hardcoded Secrets
  {
    title: 'Hardcoded JWT Secret',
    cwe: 'CWE-798',
    vulnerableCode: `
function signToken(user) {
  const secretKey = "super_secret_jwt_key_do_not_share"; // Hardcoded secret
  return jwt.sign({ id: user.id }, secretKey, { expiresIn: '1h' });
}
    `.trim(),
    fixedCode: `
function signToken(user) {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ id: user.id }, secretKey, { expiresIn: '1h' });
}
    `.trim(),
    findingDescription: `The application uses a hardcoded secret key (\`"super_secret_jwt_key_do_not_share"\`) to sign JWT tokens. This is a CWE-798 Hardcoded Credentials vulnerability. Anyone with access to the source code can forge valid JWT tokens and impersonate any user.`,
    suggestion: `Never hardcode secrets in source code. Load sensitive configuration values from environment variables or a dedicated secrets management service (e.g., AWS Secrets Manager, HashiCorp Vault).`,
  }
];
