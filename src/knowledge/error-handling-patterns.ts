// ============================================================
// SECTION: Knowledge — Error Handling Anti-Patterns
// PURPOSE: Common error handling mistakes across all languages
// ============================================================

export interface ErrorHandlingPattern {
  id: string;
  name: string;
  description: string;
  detectHints: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  badExample: string;
  goodExample: string;
}

export const ERROR_HANDLING_PATTERNS: ErrorHandlingPattern[] = [
  {
    id: 'ERR-001',
    name: 'Silent Catch Block',
    description: 'Empty catch block that swallows errors completely, making debugging impossible',
    detectHints: ['catch', '{ }', 'catch(e) {}', 'catch (error) {}'],
    severity: 'HIGH',
    badExample: `try { await saveData(); } catch(e) { }`,
    goodExample: `try { await saveData(); } catch(e) { logger.error('Failed to save:', e); throw e; }`,
  },
  {
    id: 'ERR-002',
    name: 'Pokemon Exception Handling',
    description: 'Catching all exceptions with a generic handler — gotta catch em all. Hides specific errors.',
    detectHints: ['catch(Exception', 'catch(Error', 'catch(e: any)', 'catch (error)'],
    severity: 'MEDIUM',
    badExample: `try { ... } catch(error: any) { console.log("error"); }`,
    goodExample: `try { ... } catch(error) { if (error instanceof ValidationError) handleValidation(error); else throw error; }`,
  },
  {
    id: 'ERR-003',
    name: 'Error String Throwing',
    description: 'Throwing a string instead of an Error object — loses stack trace information',
    detectHints: ['throw "', "throw '", 'throw `'],
    severity: 'MEDIUM',
    badExample: `throw "Something went wrong";`,
    goodExample: `throw new Error("Something went wrong");`,
  },
  {
    id: 'ERR-004',
    name: 'Unhandled Promise Rejection',
    description: 'Async function or Promise without .catch() or try/catch — unhandled rejections crash Node.js',
    detectHints: ['async function', '.then(', 'Promise.all', 'no catch', 'no try'],
    severity: 'HIGH',
    badExample: `fetchData().then(data => process(data)); // No .catch()`,
    goodExample: `fetchData().then(data => process(data)).catch(err => handleError(err));`,
  },
  {
    id: 'ERR-005',
    name: 'Leaking Internal Error Details',
    description: 'Sending raw error messages, stack traces, or internal paths to client responses',
    detectHints: ['res.json({ error:', 'res.send(error', 'error.stack', 'error.message'],
    severity: 'HIGH',
    badExample: `res.status(500).json({ error: error.stack });`,
    goodExample: `console.error(error); res.status(500).json({ error: 'Internal server error' });`,
  },
  {
    id: 'ERR-006',
    name: 'Missing Finally for Resource Cleanup',
    description: 'Database connections, file handles, or network sockets not closed in finally block',
    detectHints: ['try {', 'connection', 'open(', 'createReadStream', 'no finally'],
    severity: 'MEDIUM',
    badExample: `const conn = await db.connect(); const data = await conn.query(sql); conn.close();`,
    goodExample: `const conn = await db.connect(); try { return await conn.query(sql); } finally { conn.close(); }`,
  },
  {
    id: 'ERR-007',
    name: 'Swallowed Async Error in Fire-and-Forget',
    description: 'Calling an async function without await and without .catch() — error is silently lost',
    detectHints: ['// fire and forget', 'no await', 'void async'],
    severity: 'HIGH',
    badExample: `sendEmail(user.email); // async but no await, no .catch()`,
    goodExample: `sendEmail(user.email).catch(err => logger.error('Email failed:', err));`,
  },
  {
    id: 'ERR-008',
    name: 'Incorrect Error Type Assertion',
    description: 'Assuming caught error is always an Error instance — in JS, anything can be thrown',
    detectHints: ['(error as Error)', 'error.message', 'error.stack', 'catch (error)'],
    severity: 'LOW',
    badExample: `catch(error) { console.log(error.message); // Crashes if error is a string }`,
    goodExample: `catch(error) { const msg = error instanceof Error ? error.message : String(error); }`,
  },
];
