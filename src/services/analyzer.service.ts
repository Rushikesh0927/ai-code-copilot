// ============================================================
// SECTION: Services — Analyzer Orchestrator
// PURPOSE: Coordinates cloning, analyzing, AI requests, and formatting
// STORAGE: Supabase (Postgres + pgvector) for persistent state & RAG
// ============================================================

import { parseGitHubUrl } from '../utils/parser';
import { extractFunctions } from '../utils/ast';
import { runESLintPrePass } from '../utils/linter';
import { GitHubService } from './github.service';
import { AIReviewService } from './ai-review.service';
import { FormatterService } from './formatter.service';
import { ReviewResult, Finding } from '../types/review.types';
import { AnalysisJob } from '../types/analysis.types';
import { supabase } from './supabase.service';
import { v4 as uuidv4 } from 'uuid';
import { APP_CONFIG } from '../config/app.config';

export class AnalyzerService {
  private github: GitHubService;
  private ai: AIReviewService;
  private formatter: FormatterService;

  constructor() {
    this.github = new GitHubService();
    this.ai = new AIReviewService();
    this.formatter = new FormatterService();
  }

  // ============================================================
  // SECTION: Database Helpers
  // PURPOSE: Read/write job state and results to Supabase
  // ============================================================

  async getJobStatus(id: string): Promise<AnalysisJob | null> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      url: data.url,
      status: data.status,
      progress: data.progress,
      totalFiles: data.total_files,
      processedFiles: data.processed_files,
      startedAt: data.started_at,
      currentFile: data.current_file,
      error: data.error,
    } as AnalysisJob;
  }

  async getResults(id: string): Promise<ReviewResult | null> {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      url: data.url,
      type: data.type,
      repoName: data.repo_name,
      totalFiles: data.total_files,
      totalLines: data.total_lines,
      findings: data.findings,
      correlations: data.correlations,
      summary: data.summary,
      createdAt: data.created_at,
      durationMs: data.duration_ms,
    } as ReviewResult;
  }

  private async updateJob(id: string, fields: Record<string, any>) {
    await supabase.from('jobs').update(fields).eq('id', id);
  }

  // ============================================================
  // SECTION: Start PR Analysis (Async Background Task)
  // ============================================================
  async startPRAnalysis(owner: string, repo: string, prNumber: number, url: string, userId?: string, userName?: string, accessToken?: string): Promise<string> {
    const jobId = uuidv4();

    await supabase.from('jobs').insert({
      id: jobId,
      url,
      status: 'FETCHING',
      progress: 0,
      total_files: 0,
      processed_files: 0,
      started_at: new Date().toISOString(),
      user_id: userId || null,
      user_name: userName || null
    });

    this.processPRBackground(jobId, owner, repo, prNumber, url, accessToken).catch(async (err: any) => {
      console.error(`Job ${jobId} failed:`, err);
      await this.updateJob(jobId, { status: 'ERROR', error: String(err) });
    });

    return jobId;
  }

  // ============================================================
  // SECTION: Start Repo Analysis (Async Background Task)
  // ============================================================
  async startRepoAnalysis(owner: string, repo: string, branch: string | undefined, url: string, userId?: string, userName?: string, accessToken?: string): Promise<string> {
    const jobId = uuidv4();

    await supabase.from('jobs').insert({
      id: jobId,
      url,
      status: 'FETCHING',
      progress: 0,
      total_files: 0,
      processed_files: 0,
      started_at: new Date().toISOString(),
      user_id: userId || null,
      user_name: userName || null
    });

    this.processRepoBackground(jobId, owner, repo, branch, url, accessToken).catch(async (err: any) => {
      console.error(`Job ${jobId} failed:`, err);
      await this.updateJob(jobId, { status: 'ERROR', error: String(err) });
    });

    return jobId;
  }

  // --- Background workers ---

  private async processPRBackground(jobId: string, owner: string, repo: string, prNumber: number, url: string, accessToken?: string) {
    const startTime = Date.now();

    try {
      // 1. Fetch
      await this.updateJob(jobId, { status: 'FETCHING' });
      const github = new GitHubService(accessToken);
      const files = await github.getPRFiles(owner, repo, prNumber);

      // Extract package.json for framework/dependency awareness
      let packageJsonContent: string | undefined;
      try {
        const { data: pkgFile } = await (this.github as any).octokit.repos.getContent({ owner, repo, path: 'package.json' });
        if (pkgFile && !Array.isArray(pkgFile) && pkgFile.type === 'file' && pkgFile.content) {
          packageJsonContent = Buffer.from(pkgFile.content, 'base64').toString('utf-8');
        }
      } catch { /* No package.json — might be non-JS project */ }

      const filesToReview = files.filter(f => (f.status === 'added' || f.status === 'modified') && !!f.patch).slice(0, APP_CONFIG.SYSTEM.MAX_FILES_TO_ANALYZE);
      await this.updateJob(jobId, { total_files: filesToReview.length, status: 'ANALYZING' });

      const allFindings: Finding[] = [];

      // 2. Ingestion Phase — Embed files into Supabase pgvector (BATCHED)
      // ⚡ Guarded by SKIP_REPO_EMBEDDINGS — skips 200 API calls for faster scans
      if (!APP_CONFIG.VECTOR.SKIP_REPO_EMBEDDINGS) {
        const EMBED_BATCH = APP_CONFIG.VECTOR.EMBEDDING_BATCH_SIZE;
        for (let ei = 0; ei < filesToReview.length; ei += EMBED_BATCH) {
          const embedBatch = filesToReview.slice(ei, ei + EMBED_BATCH);
          await Promise.all(embedBatch.map(async (file) => {
            try {
              const textToEmbed = (file.patch || '').substring(0, 5000);
              const vec = await this.ai.generateEmbedding(textToEmbed);
              if (vec.length > 0) {
                await supabase.from('file_embeddings').insert({
                  job_id: jobId,
                  path: file.filename,
                  content: file.patch!.substring(0, 8000),
                  embedding: JSON.stringify(vec),
                });
              }
            } catch (e) { console.error(`Embed error ${file.filename}:`, e); }
          }));
        }
      }

      // 4. Analyze with RAG context from pgvector
      let processedFiles = 0;
      const MAX_CONCURRENT = APP_CONFIG.AI.MAX_CONCURRENT_FILES;
      
      for (let i = 0; i < filesToReview.length; i += MAX_CONCURRENT) {
        const batch = filesToReview.slice(i, i + MAX_CONCURRENT);
        
        await this.updateJob(jobId, { current_file: `Processing Batch ${Math.floor(i/MAX_CONCURRENT) + 1}...` });

        const batchPromises = batch.map(async (file) => {
          try {
            let relatedContext = '';
            
            // Re-use the embedding we just inserted in Phase 2
            const { data: fe } = await supabase.from('file_embeddings').select('embedding').eq('job_id', jobId).eq('path', file.filename).single();
            const currentVecStr = fe?.embedding;

            if (currentVecStr) {
              const { data: matches } = await supabase.rpc('match_related_files', {
                query_embedding: currentVecStr,
                match_threshold: APP_CONFIG.VECTOR.MATCH_THRESHOLD,
                match_count: APP_CONFIG.VECTOR.MAX_CONTEXT_FILES,
                p_job_id: jobId,
              });
              if (matches && matches.length > 0) {
                const filtered = matches.filter((m: any) => m.path !== file.filename);
                relatedContext = filtered.map((m: any) => `FILE: ${m.path}\n${m.content.substring(0, 3000)}`).join('\n\n');
              }
            }

            return await this.ai.reviewFile(file.patch!, file.filename, 'Detect from extension', relatedContext, packageJsonContent);
          } catch (e) {
            console.error(`Error processing file ${file.filename}:`, e);
            return [];
          }
        });

        const results = await Promise.all(batchPromises);
        results.forEach(findings => allFindings.push(...findings));
        
        processedFiles += batch.length;
        const progress = Math.round((processedFiles / filesToReview.length) * 100);
        await this.updateJob(jobId, { processed_files: processedFiles, progress });

        if (APP_CONFIG.AI.BATCH_DELAY_MS > 0 && i + MAX_CONCURRENT < filesToReview.length) {
          await new Promise(resolve => setTimeout(resolve, APP_CONFIG.AI.BATCH_DELAY_MS));
        }
      }

      // 4. Format and Finish
      await this.finalizeJob(jobId, url, 'PR', `${owner}/${repo}`, filesToReview.length, 0, allFindings, startTime);

    } catch (err) {
      throw err;
    }
  }

  private async processRepoBackground(jobId: string, owner: string, repo: string, branch: string | undefined, url: string, accessToken?: string) {
    const startTime = Date.now();
    let cloneDir = '';
    const github = new GitHubService(accessToken);

    try {
      // 1. Clone
      await this.updateJob(jobId, { status: 'FETCHING' });
      cloneDir = await github.cloneRepository(owner, repo, branch);

      // 2. Read Files
      const allLocalFiles = await github.getLocalFiles(cloneDir);
      const filesToReview = allLocalFiles.slice(0, APP_CONFIG.SYSTEM.MAX_FILES_TO_ANALYZE);
      const totalLines = filesToReview.reduce((sum, file) => sum + file.lines, 0);
      await this.updateJob(jobId, { total_files: filesToReview.length });

      // Extract package.json for framework/dependency awareness
      const pkgFile = filesToReview.find(f => f.path === 'package.json');
      const packageJsonContent = pkgFile?.content;

      // 3. Ingestion Phase — Embed files into Supabase pgvector (BATCHED)
      // ⚡ Skip embeddings for REPO scans — saves ~200 API calls + 400 DB round-trips
      if (!APP_CONFIG.VECTOR.SKIP_REPO_EMBEDDINGS) {
        const EMBED_BATCH = APP_CONFIG.VECTOR.EMBEDDING_BATCH_SIZE;
        for (let ei = 0; ei < filesToReview.length; ei += EMBED_BATCH) {
          const embedBatch = filesToReview.slice(ei, ei + EMBED_BATCH);
          await Promise.all(embedBatch.map(async (file) => {
            try {
              const textToEmbed = file.content.substring(0, 5000);
              const vec = await this.ai.generateEmbedding(textToEmbed);
              if (vec.length > 0) {
                await supabase.from('file_embeddings').insert({
                  job_id: jobId,
                  path: file.path,
                  content: file.content.substring(0, 8000),
                  embedding: JSON.stringify(vec),
                });
              }
            } catch (e) { console.error(`Embed error ${file.path}:`, e); }
          }));
        }
      }

      await this.updateJob(jobId, { status: 'ANALYZING' });

      const allFindings: Finding[] = [];

      // 4. Analyze with RAG context from pgvector
      let processedFiles = 0;
      const MAX_CONCURRENT = APP_CONFIG.AI.MAX_CONCURRENT_FILES;

      for (let i = 0; i < filesToReview.length; i += MAX_CONCURRENT) {
        const batch = filesToReview.slice(i, i + MAX_CONCURRENT);
        
        await this.updateJob(jobId, { current_file: `Processing Batch ${Math.floor(i/MAX_CONCURRENT) + 1}...` });

        const batchPromises = batch.map(async (file) => {
          try {
            let relatedContext = '';

            // Only do RAG lookup if embeddings were generated
            if (!APP_CONFIG.VECTOR.SKIP_REPO_EMBEDDINGS) {
              const { data: fe } = await supabase.from('file_embeddings').select('embedding').eq('job_id', jobId).eq('path', file.path).single();
              const currentVecStr = fe?.embedding;
              if (currentVecStr) {
                const { data: matches } = await supabase.rpc('match_related_files', {
                  query_embedding: currentVecStr,
                  match_threshold: APP_CONFIG.VECTOR.MATCH_THRESHOLD,
                  match_count: APP_CONFIG.VECTOR.MAX_CONTEXT_FILES,
                  p_job_id: jobId,
                });
                if (matches && matches.length > 0) {
                  const filtered = matches.filter((m: any) => m.path !== file.path);
                  relatedContext = filtered.map((m: any) => `FILE: ${m.path}\n${m.content.substring(0, 3000)}`).join('\n\n');
                }
              }
            }

            // Extract AST Structure (Spec B12)
            const functions = extractFunctions(file.content, file.language);
            let structureMap = undefined;
            if (functions.length > 0) {
              structureMap = functions.map((f: any) => `- ${f.name} (Lines ${f.startLine}-${f.endLine})`).join('\n');
            }

            // Static Pre-Pass (Spec A8/B14)
            const lintResults = await runESLintPrePass(file.content, file.path);
            const staticFindings: any[] = lintResults.map((l: any) => ({
              id: uuidv4(),
              file: l.file,
              fn: '',
              line: l.line,
              category: 'CODE_SMELLS',
              severity: l.severity === 2 ? 'HIGH' : 'LOW',
              title: `ESLint: ${l.ruleId}`,
              description: l.message,
              suggestion: 'Fix syntax or logical lint error.',
              impact: 'May cause runtime errors or degrade code quality.',
              codeSnippet: file.content.split('\n')[l.line - 1] || '',
              fixSnippet: l.fixText || '',
              confidence: 100,
            }));

            const aiFindings = await this.ai.reviewFile(file.content, file.path, file.language, relatedContext, packageJsonContent, structureMap);
            return [...staticFindings, ...aiFindings];
          } catch (e) {
            console.error(`Error processing file ${file.path}:`, e);
            return [];
          }
        });

        const results = await Promise.all(batchPromises);
        results.forEach(findings => allFindings.push(...findings));

        processedFiles += batch.length;
        // ⚡ Write progress to DB after every batch for snappy UI
        const progress = Math.round((processedFiles / filesToReview.length) * 100);
        await this.updateJob(jobId, { processed_files: processedFiles, progress });

        if (APP_CONFIG.AI.BATCH_DELAY_MS > 0 && i + MAX_CONCURRENT < filesToReview.length) {
          await new Promise(resolve => setTimeout(resolve, APP_CONFIG.AI.BATCH_DELAY_MS));
        }
      }

      // 5. Format and Finish
      await this.finalizeJob(jobId, url, 'REPO', `${owner}/${repo}`, filesToReview.length, totalLines, allFindings, startTime);

    } catch (err) {
      throw err;
    } finally {
      if (cloneDir) {
        await github.cleanupRepo(cloneDir);
      }
    }
  }

  // ============================================================
  // SECTION: ESLint Deduplication
  // PURPOSE: Collapse repeated linting rules into summary findings
  // WHY: ESLint fires the same rule 100× across files — unreadable
  // ============================================================
  private deduplicateLintFindings(findings: Finding[]): Finding[] {
    const DEDUP_THRESHOLD = 5; // if same rule fires >5 times, cap it
    const KEEP_TOP = 3;        // keep the 3 most informative instances

    const linting = findings.filter(f => f.category === 'LINTING' || f.category === 'CODE_SMELL');
    const other = findings.filter(f => f.category !== 'LINTING' && f.category !== 'CODE_SMELL');

    // Group linting findings by rule (first 60 chars of title)
    const ruleGroups = new Map<string, Finding[]>();
    for (const f of linting) {
      const key = (f.title || '').substring(0, 60).trim();
      if (!ruleGroups.has(key)) ruleGroups.set(key, []);
      ruleGroups.get(key)!.push(f);
    }

    const dedupedLinting: Finding[] = [];
    let totalSuppressed = 0;

    for (const [rule, group] of ruleGroups.entries()) {
      if (group.length <= DEDUP_THRESHOLD) {
        // Under threshold — keep all
        dedupedLinting.push(...group);
      } else {
        // Over threshold — keep top N, collapse rest into summary
        const sorted = [...group].sort((a, b) => {
          const sevOrder = ['CRITICAL','HIGH','MEDIUM','LOW','INFORMATIONAL'];
          return sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity);
        });
        const kept = sorted.slice(0, KEEP_TOP);
        const suppressed = group.length - KEEP_TOP;
        totalSuppressed += suppressed;

        dedupedLinting.push(...kept);
        // Add a summary finding for the collapsed ones
        dedupedLinting.push({
          ...kept[0],
          id: `dedup-${kept[0].id}`,
          title: `[+${suppressed} more] ${rule}`,
          description: `This rule triggered ${group.length} times across ${new Set(group.map(f => f.file)).size} files. Showing top ${KEEP_TOP} instances. ${suppressed} similar findings were suppressed to reduce noise.`,
          file: `(${group.length} files affected)`,
          line: 0,
          severity: 'INFORMATIONAL' as any,
          confidence: 100,
        });
      }
    }

    if (totalSuppressed > 0) {
      console.log(`[Dedup] Suppressed ${totalSuppressed} redundant linting findings`);
    }

    return [...other, ...dedupedLinting];
  }

  private async finalizeJob(jobId: string, url: string, type: 'PR' | 'REPO', repoName: string, totalFiles: number, totalLines: number, rawFindings: Finding[], startTime: number) {
    await this.updateJob(jobId, { status: 'REVIEWING' });

    // ⚡ Deduplicate repeated linting noise before correlating
    const findings = this.deduplicateLintFindings(rawFindings);
    const deduplicatedCount = rawFindings.length - findings.length;

    const { correlations, architectureReview } = await this.ai.correlateFindings(findings);

    // ⚡ Payload Compaction: Prevent Supabase from rejecting massive payloads!
    let compressedFindings = findings;
    
    // Sort so we definitely keep the most dangerous bugs if we exceed limits
    const sevScore = { 'CRITICAL': 5, 'HIGH': 4, 'MEDIUM': 3, 'LOW': 2, 'INFORMATIONAL': 1 };
    compressedFindings.sort((a, b) => sevScore[b.severity] - sevScore[a.severity]);

    // Cap to 100 findings total, and strictly truncate long AST strings.
    compressedFindings = compressedFindings.slice(0, 100).map(f => ({
       ...f,
       description: f.description?.substring(0, 1500) || '',
       suggestion: f.suggestion?.substring(0, 1500) || '',
       codeSnippet: f.codeSnippet?.substring(0, 3000) || '',
       fixSnippet: f.fixSnippet?.substring(0, 3000) || ''
    }));

    const duration_ms = Date.now() - startTime;
    const summary = this.formatter.generateSummary(compressedFindings);
    summary.architectureReview = architectureReview;
    // @ts-ignore
    summary.durationMs = duration_ms;
    // @ts-ignore
    summary.rawFindingsCount = rawFindings.length;
    // @ts-ignore
    summary.deduplicatedCount = deduplicatedCount;

    // Fetch the user data from the job to persist into the result
    const { data: job } = await supabase.from('jobs').select('user_id, user_name').eq('id', jobId).single();

    const { error: insertError } = await supabase.from('results').insert({
      id: jobId,
      url,
      type,
      repo_name: repoName,
      total_files: totalFiles,
      total_lines: totalLines,
      findings: compressedFindings, // ⚡ Insert the safely compressed payload
      correlations,
      summary,
      created_at: new Date().toISOString(),
      duration_ms,
      user_id: job?.user_id || null,
      user_name: job?.user_name || null,
    });

    if (insertError) {
      console.error(`[DB ERROR] Failed to insert final results for job ${jobId}:`, insertError);
      await this.updateJob(jobId, { status: 'ERROR', error: 'Failed to save analysis results to database. Payload may be too large.' });
      return;
    }

    await this.updateJob(jobId, { status: 'COMPLETE', progress: 100 });
  }
}
