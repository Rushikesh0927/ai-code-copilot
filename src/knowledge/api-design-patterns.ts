// ============================================================
// SECTION: Knowledge — API Design Anti-Patterns
// PURPOSE: Common REST/GraphQL API design mistakes
// ============================================================

export interface APIDesignPattern {
  id: string;
  name: string;
  description: string;
  detectHints: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  badExample: string;
  goodExample: string;
}

export const API_DESIGN_PATTERNS: APIDesignPattern[] = [
  {
    id: 'API-001',
    name: 'Missing Input Validation',
    description: 'API endpoint accepts request body without any schema validation (Zod, Joi, Yup)',
    detectHints: ['req.body', 'request.body', 'JSON.parse', 'body.', 'no validation', 'no schema'],
    severity: 'HIGH',
    badExample: `const { name, email } = req.body; db.insert({ name, email });`,
    goodExample: `const result = schema.safeParse(req.body); if (!result.success) return res.status(400).json(result.error);`,
  },
  {
    id: 'API-002',
    name: 'Always 200 OK',
    description: 'Returning 200 status for errors instead of appropriate HTTP error codes',
    detectHints: ['res.status(200)', 'return 200', 'status: 200', 'ok: true'],
    severity: 'MEDIUM',
    badExample: `return res.status(200).json({ success: false, error: 'Not found' });`,
    goodExample: `return res.status(404).json({ error: 'Resource not found' });`,
  },
  {
    id: 'API-003',
    name: 'Missing Pagination',
    description: 'List endpoint returning all records without limit/offset — crashes on large datasets',
    detectHints: ['findAll', 'find({})', 'SELECT *', '.select()', 'no limit', 'no pagination'],
    severity: 'HIGH',
    badExample: `const users = await db.users.findAll(); res.json(users);`,
    goodExample: `const { page = 1, limit = 20 } = req.query; const users = await db.users.findAll({ offset: (page-1)*limit, limit });`,
  },
  {
    id: 'API-004',
    name: 'Verb-Noun Mismatch',
    description: 'Using verbs in URL paths (POST /getUsers) instead of RESTful resource naming',
    detectHints: ['/get', '/fetch', '/create', '/delete', '/update', '/do'],
    severity: 'LOW',
    badExample: `app.post('/api/getUsers', handler);`,
    goodExample: `app.get('/api/users', handler);`,
  },
  {
    id: 'API-005',
    name: 'Unbounded Request Body',
    description: 'No limit on request body size — allows memory exhaustion attacks',
    detectHints: ['bodyParser', 'json()', 'express.json', 'no limit'],
    severity: 'MEDIUM',
    badExample: `app.use(express.json());`,
    goodExample: `app.use(express.json({ limit: '1mb' }));`,
  },
  {
    id: 'API-006',
    name: 'Missing Request Timeout',
    description: 'External API calls without timeout — hangs forever if downstream service is slow',
    detectHints: ['fetch(', 'axios.get(', 'http.request(', 'no timeout'],
    severity: 'MEDIUM',
    badExample: `const data = await fetch('https://external-api.com/data');`,
    goodExample: `const controller = new AbortController(); setTimeout(() => controller.abort(), 5000); const data = await fetch(url, { signal: controller.signal });`,
  },
  {
    id: 'API-007',
    name: 'Inconsistent Error Response Format',
    description: 'Different error formats across endpoints — confusing for API consumers',
    detectHints: ['{ error:', '{ message:', '{ msg:', '{ detail:', '{ err:'],
    severity: 'LOW',
    badExample: `// Route 1: { error: "Not found" }   Route 2: { message: "Invalid" }   Route 3: { err: "Fail" }`,
    goodExample: `// All routes: { error: { code: "NOT_FOUND", message: "Resource not found" } }`,
  },
  {
    id: 'API-008',
    name: 'N+1 API Response',
    description: 'API returns IDs instead of embedded objects, forcing clients to make N additional requests',
    detectHints: ['userId', 'authorId', '_id', 'without include', 'without populate', 'without join'],
    severity: 'MEDIUM',
    badExample: `return res.json({ posts: posts.map(p => ({ ...p, authorId: p.author_id })) });`,
    goodExample: `return res.json({ posts: posts.map(p => ({ ...p, author: { id: p.author_id, name: p.author_name } })) });`,
  },
  {
    id: 'API-009',
    name: 'Missing Rate Limiting',
    description: 'Public API endpoints without rate limiting — vulnerable to DDoS and brute force',
    detectHints: ['app.post', 'app.get', 'router.post', 'public', 'no rate limit'],
    severity: 'HIGH',
    badExample: `app.post('/api/login', loginHandler);`,
    goodExample: `app.post('/api/login', rateLimiter({ windowMs: 15*60*1000, max: 5 }), loginHandler);`,
  },
  {
    id: 'API-010',
    name: 'Sensitive Data in Response',
    description: 'API response includes sensitive fields like passwords, tokens, or internal IDs',
    detectHints: ['password', 'hashedPassword', 'secret', 'token', 'apiKey', 'creditCard'],
    severity: 'HIGH',
    badExample: `return res.json(user); // Includes password_hash, api_key fields`,
    goodExample: `const { password_hash, api_key, ...safeUser } = user; return res.json(safeUser);`,
  },
];
