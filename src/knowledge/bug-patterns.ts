// ============================================================
// SECTION: Knowledge Base — Bug Patterns
// PURPOSE: Common functional and non-functional bug patterns
// MODIFY: Add new bug patterns here
// SOURCE: DiverseVul dataset, common bug taxonomy
// ============================================================

export interface BugPattern {
  id: string;
  name: string;
  description: string;
  detectHints: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  example: string;
  fix: string;
}

export const BUG_PATTERNS: BugPattern[] = [
  {
    id: 'BUG-001',
    name: 'Null/Undefined Dereference',
    description: 'Accessing property of potentially null/undefined value without guard',
    detectHints: ['.length', '.map(', '.filter(', '.forEach(', 'response.data'],
    severity: 'HIGH',
    example: `const name = user.profile.displayName; // crashes if user or profile is null`,
    fix: `const name = user?.profile?.displayName ?? 'Anonymous'; // optional chaining`,
  },
  {
    id: 'BUG-002',
    name: 'Unhandled Promise Rejection',
    description: 'Async function or Promise not wrapped in try/catch — errors silently swallowed',
    detectHints: ['async ', 'await ', '.then(', 'fetch('],
    severity: 'HIGH',
    example: `async function getData() { const res = await fetch(url); } // no try/catch`,
    fix: `async function getData() { try { const res = await fetch(url); } catch(e) { /* handle */ } }`,
  },
  {
    id: 'BUG-003',
    name: 'Resource Leak',
    description: 'File handles, DB connections, or network connections not closed after use',
    detectHints: ['open(', 'connect(', 'createReadStream(', 'db.getConnection('],
    severity: 'HIGH',
    example: `const file = fs.createReadStream(path); // never closed`,
    fix: `Use try/finally or 'using' keyword to guarantee resource cleanup`,
  },
  {
    id: 'BUG-004',
    name: 'Incorrect Error Handling',
    description: 'Catch block swallows error without logging or re-throwing',
    detectHints: ['catch', 'except', '} catch (e) {}', 'except: pass'],
    severity: 'MEDIUM',
    example: `try { riskyOp(); } catch(e) {} // error silently swallowed`,
    fix: `try { riskyOp(); } catch(e) { logger.error(e); throw e; } // log and re-throw`,
  },
  {
    id: 'BUG-005',
    name: 'Off-by-One Error',
    description: 'Array index boundary errors — accessing index i when valid range is 0..i-1',
    detectHints: ['arr[i]', 'arr[length]', '<= arr.length', '>= 0'],
    severity: 'HIGH',
    example: `for (let i = 0; i <= arr.length; i++) { arr[i]; } // last iteration: arr[arr.length] = undefined`,
    fix: `for (let i = 0; i < arr.length; i++) { arr[i]; } // correct: strict less-than`,
  },
  {
    id: 'BUG-006',
    name: 'Race Condition',
    description: 'Shared mutable state accessed concurrently without synchronization',
    detectHints: ['global ', 'shared ', 'counter++', 'this.count'],
    severity: 'CRITICAL',
    example: `let count = 0; async function inc() { count++; } // non-atomic in concurrent env`,
    fix: `Use atomic operations, locks, or message-passing to serialize access`,
  },
  {
    id: 'BUG-007',
    name: 'Incorrect Async Return',
    description: 'Missing await causes function to return Promise instead of resolved value',
    detectHints: ['return fetch(', 'return db.', 'return axios.'],
    severity: 'MEDIUM',
    example: `function getUser() { return fetch('/api/user'); } // returns Promise, not data`,
    fix: `async function getUser() { return await fetch('/api/user').then(r => r.json()); }`,
  },
  {
    id: 'BUG-008',
    name: 'Non-Atomic Read-Modify-Write',
    description: 'Reading a document, modifying in JS, then saving back creates a race window where concurrent requests overwrite each other',
    detectHints: ['findById', 'findOne', '.save()', 'task.status =', 'user.balance ='],
    severity: 'CRITICAL',
    example: `const task = await Task.findById(id); task.status = 'done'; await task.save(); // another request can modify between findById and save`,
    fix: `await Task.findByIdAndUpdate(id, { $set: { status: 'done' } }, { new: true }); // atomic update`,
  },
  {
    id: 'BUG-009',
    name: 'Loose Equality Type Coercion',
    description: 'Using == instead of === allows type coercion bugs (e.g. "0" == false is true)',
    detectHints: ['==', '!='],
    severity: 'MEDIUM',
    example: `if (userId == 0) { /* always true for "" and null too */ }`,
    fix: `if (userId === 0) { /* strict comparison, no coercion */ }`,
  },
  {
    id: 'BUG-010',
    name: 'Reflected/Stored XSS via Raw HTML Output',
    description: 'Rendering user input directly to the HTTP response or raw template engines (e.g., EJS <%- ) without escaping allows Script Injection (XSS).',
    detectHints: ['res.send(', 'res.write(', '<%-', '!=', 'innerHTML'],
    severity: 'CRITICAL',
    example: `res.send("<h1>Hello " + req.query.name + "</h1>"); // Attacker payload: <script>alert(1)</script>`,
    fix: `import escapeHtml from 'escape-html'; res.send("<h1>Hello " + escapeHtml(req.query.name) + "</h1>");`,
  },
  {
    id: 'BUG-011',
    name: 'Dead Code / Unused Resource',
    description: 'Variables, objects, or functions are defined or instantiated but never used, wasting memory and cluttering logic.',
    detectHints: ['unused', 'never used', 'new ', 'let '],
    severity: 'LOW',
    example: `const newTile = new Tile(); // instantiated but never actually used`,
    fix: `Remove the unused variable or object, or explicitly integrate it into the business logic.`,
  },
  {
    id: 'BUG-012',
    name: 'Deeply Nested Callbacks (Callback Hell)',
    description: 'Excessive nesting of callbacks makes the code difficult to read, maintain, and leads to structural complexity (Pyramid of Doom).',
    detectHints: ['function(err, res) {', '})', 'setTimeout(function()'],
    severity: 'MEDIUM',
    example: `fs.readFile(path, function(err, data) { db.save(data, function(err, result) { ... }) })`,
    fix: `Refactor using modern async/await syntax or modularize the callbacks into separate named functions.`,
  },
];
