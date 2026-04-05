// ============================================================
// SECTION: Services — Singleton Exports
// PURPOSE: Shared service instances to prevent duplicate instantiation
// ============================================================

import { AnalyzerService } from './analyzer.service';

// Export a single, shared instance for use across all API routes
export const analyzer = new AnalyzerService();
