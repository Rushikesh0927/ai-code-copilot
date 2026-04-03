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
];
