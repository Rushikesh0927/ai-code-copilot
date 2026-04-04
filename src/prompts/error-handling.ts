// ============================================================
// SECTION: Prompts — Error Handling
// PURPOSE: Catch missing error boundaries, silent failures, unsafe catches
// ============================================================

export function getErrorHandlingPrompt(): string {
  return `
### ERROR HANDLING FOCUS
Analyze the error handling strategy for robustness and reliability.

Look for:
- Empty catch blocks that silently swallow errors
- catch(error: any) without proper type narrowing
- Missing error boundaries in React component trees
- Unhandled promise rejections (missing .catch() or try/catch on await)
- Generic error messages that leak internal details to users
- Missing finally blocks for resource cleanup
- Retry logic without exponential backoff or circuit breakers
- Errors logged to console.log instead of proper logging service
- Missing HTTP error status codes (always returning 200)
- Unchecked null/undefined returns from async operations

Common Anti-Patterns:
- SILENT_CATCH: catch(e) { } — error is completely ignored
- LOG_AND_FORGET: catch(e) { console.log(e) } — no recovery action
- THROW_GENERIC: throw new Error("something went wrong") — unhelpful message
- MISSING_FINALLY: database/file handles not closed on error path
- UNSAFE_JSON_PARSE: JSON.parse() without try/catch — crashes on invalid input

Map findings to the 'BUG' category with impact explaining reliability consequences.
`.trim();
}
