// ============================================================
// SECTION: Master Application Configuration
// PURPOSE: Centralized control for all system parameters, AI settings, 
//          UI constraints, and custom knowledge rules. 
//          Editing this file applies changes globally without modifying internal logic.
// ============================================================

export const APP_CONFIG = {
  // ==========================================
  // 1. AI & LLM Settings
  // ==========================================
  AI: {
    // gemini-2.5-flash: best accuracy for complex bug detection + structured JSON
    // Speed gained from prompt consolidation (50KB→2KB category section), not model downgrade
    MODEL_NAME: 'gemini-2.5-flash',
    
    // Controls AI creativity. 
    // 0.0 = Deterministic/Strict (Best for code review)
    // 0.8+ = Creative/Variable
    TEMPERATURE: 0.2, 
    
    // How many files to send to the AI simultaneously
    // ⚡ 60 parallel calls — paid Gemini API tier (1000+ RPM limit)
    // If 429 errors appear in Vercel logs, reduce back to 40
    MAX_CONCURRENT_FILES: 60,
    
    // Max lines of code to send to the AI per file
    // Prevents giant auto-generated files from crashing the context window
    MAX_LINES_PER_FILE: 1000, 
  },

  // ==========================================
  // 2. Repository & System Limits
  // ==========================================
  SYSTEM: {
    // Hard limit on how many files are analyzed per repository/PR
    // Prevents abuse on massive enterprise repositories
    MAX_FILES_TO_ANALYZE: 200, 
    
    // Master kill-switch for the auto-fix feature
    // Set to false if security policies prohibit local code modification
    ENABLE_LOCAL_FIX_APPLICATION: true, 
  },

  // ==========================================
  // 3. Search & Embedding (Vector DB)
  // ==========================================
  VECTOR: {
    // How many files to generate embeddings for at once
    EMBEDDING_BATCH_SIZE: 20,
    
    // Similarity threshold (0.0 to 1.0). Higher means files must be *very* similar to match
    MATCH_THRESHOLD: 0.6, 
    
    // Maximum number of related files to inject into the AI's prompt context
    MAX_CONTEXT_FILES: 2,

    // ⚡ PERFORMANCE: Skip embedding phase for REPO scans entirely.
    // This removes 200 extra API calls and 400 Supabase round-trips.
    // The correlation engine (2nd AI pass) handles cross-file analysis.
    SKIP_REPO_EMBEDDINGS: true,
  },

  // ==========================================
  // 4. UI & Aesthetics
  // ==========================================
  UI: {
    // D3 Force Graph settings 
    // Make this more negative (e.g. -500) to push nodes further apart
    GRAPH_REPULSION_FORCE: -300, 
    
    // Master toggle for the glass UI effects
    ENABLE_GLASSMORPHISM: true,
  },

  // ==========================================
  // 5. Custom Live Knowledge Base 
  // ==========================================
  // These rules are injected directly into the system prompt with highest priority.
  // Useful for live demoing: "Can you teach it our company specific rule?"
  CUSTOM_KNOWLEDGE_RULES: [
    // Example: "Never use Lodash, use native standard library array methods instead. Flag as CODE_SMELL."
    // Example: "All SQL queries must include MUST_LOG comment. Flag as SECURITY risk."
  ]
};
