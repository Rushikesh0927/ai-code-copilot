// ============================================================
// SECTION: Prompts — API Design
// PURPOSE: Detect REST/GraphQL API design anti-patterns
// ============================================================

export function getAPIDesignPrompt(): string {
  return `
### API DESIGN FOCUS
If this file defines API endpoints (e.g., route handlers, controllers), analyze the API design quality.
SKIP this section for non-API files.

Look for:
- Missing input validation (no schema validation on request body)
- Inconsistent HTTP status codes (using 200 for errors, 404 for validation failures)
- Missing rate limiting on public endpoints
- Returning sensitive data in responses (passwords, tokens, internal IDs)
- Missing pagination on list endpoints that could return unbounded results
- Inconsistent response format (mixing {data} with {result} with {items})
- Missing Content-Type headers
- Accepting unbounded request body sizes
- Missing request timeouts on external API calls
- Missing CORS configuration on public APIs
- Overly permissive CORS (Access-Control-Allow-Origin: *)
- Missing API versioning
- Verb/noun mismatch (POST /getUsers instead of GET /users)
- Returning stack traces or raw error objects to clients

Common REST Anti-Patterns:
- CHATTY_API: Multiple small calls instead of a single batch endpoint
- ANEMIC_RESPONSE: Returning IDs instead of embedded objects, forcing N+1 client calls
- GOD_ENDPOINT: Single endpoint handling multiple resource types
- MISSING_IDEMPOTENCY: PUT/DELETE not idempotent, repeated calls cause side effects

Map findings to 'DESIGN_PATTERN' or 'SECURITY' category depending on severity.
`.trim();
}
