// ============================================================
// SECTION: Knowledge Base — Performance Anti-Patterns
// PURPOSE: Known performance problems with code examples
// MODIFY: Add new anti-patterns, adjust severity here
// SOURCE: DACOS dataset, academic performance analysis research
// ============================================================

export interface PerformancePattern {
  id: string;
  name: string;
  description: string;
  detectHints: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: string;         // What fails at scale
  fix: string;
}

export const PERFORMANCE_ANTI_PATTERNS: PerformancePattern[] = [
  {
    id: 'PERF-001',
    name: 'N+1 Query Problem',
    description: 'Database query inside a loop — causes 1 query per item instead of 1 total',
    detectHints: ['for', 'forEach', 'while', '.find(', '.findOne(', 'await db.'],
    severity: 'HIGH',
    impact: 'With 1000 records: 1001 DB calls instead of 1. At 4000 users/s this collapses the DB.',
    fix: 'Use batch queries (findMany with WHERE IN) or join queries outside the loop',
  },
  {
    id: 'PERF-002',
    name: 'Synchronous File I/O',
    description: 'Using blocking file operations (readFileSync, writeFileSync) in request handlers',
    detectHints: ['readFileSync', 'writeFileSync', 'existsSync', 'mkdirSync'],
    severity: 'HIGH',
    impact: 'Blocks the entire Node.js event loop — all concurrent requests freeze',
    fix: 'Use async versions: fs.readFile, fs.writeFile with await',
  },
  {
    id: 'PERF-003',
    name: 'Missing Pagination',
    description: 'Fetching all records from DB/API without limit — grows unbounded',
    detectHints: ['findAll()', 'find({})', 'SELECT *', 'getAll'],
    severity: 'HIGH',
    impact: 'With 1M rows: single query returns all, OOM crash or 30s+ response time',
    fix: 'Always add LIMIT + OFFSET or cursor-based pagination',
  },
  {
    id: 'PERF-004',
    name: 'Redundant Recomputation in Loop',
    description: 'Expensive operation called inside a loop despite returning the same result',
    detectHints: ['for', 'while', '.length', 'Object.keys(', 'JSON.parse('],
    severity: 'MEDIUM',
    impact: 'O(n²) complexity instead of O(n)',
    fix: 'Move invariant computations outside the loop',
  },
  {
    id: 'PERF-005',
    name: 'No Caching',
    description: 'Identical expensive computations or API calls repeated without caching',
    detectHints: ['fetch(', 'axios.get(', 'db.query('],
    severity: 'MEDIUM',
    impact: 'Repeated identical work — unnecessary latency, cost, and rate-limit exposure',
    fix: 'Cache results with Redis or in-memory LRU cache with appropriate TTL',
  },
  {
    id: 'PERF-006',
    name: 'Inefficient String Concatenation',
    description: 'String concatenation in a loop creates O(n²) memory allocations',
    detectHints: ['result +=', 'str = str +'],
    severity: 'LOW',
    impact: 'With 10,000 iterations: massive temporary string allocations',
    fix: 'Use array.join() or string builder pattern',
  },
  {
    id: 'PERF-007',
    name: 'Blocking API Calls in Sequence',
    description: 'Multiple independent async calls awaited sequentially instead of in parallel',
    detectHints: ['await fetch', 'await axios', 'await Promise'],
    severity: 'MEDIUM',
    impact: 'Total time = sum of all calls. Should be max of all calls.',
    fix: 'Use Promise.all([...]) to run independent async operations in parallel',
  },
  {
    id: 'PERF-008',
    name: 'N+1 Query with MongoDB Loop Fetch',
    description: 'Fetching related documents one-by-one in a loop instead of using populate() or aggregation pipeline',
    detectHints: ['for', 'forEach', 'map', 'findById', 'findOne', 'await Model.find'],
    severity: 'HIGH',
    impact: 'With N applications and M tasks: produces N+1 queries. Collapses under load.',
    fix: `Bad:
  const apps = await Application.find({});
  for (let app of apps) {
    app.task = await Task.findById(app.taskId); // N extra queries!
  }
Good:
  const apps = await Application.find({}).populate('taskId', 'title budget');`,
  },
];
