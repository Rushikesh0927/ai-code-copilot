// ============================================================
// SECTION: Services — Analyzer Orchestrator
// PURPOSE: Coordinates cloning, analyzing, AI requests, and formatting
// STORAGE: Supabase (Postgres + pgvector) for persistent state & RAG
// ============================================================

import { GitHubService } from './github.service';
import { AIReviewService } from './ai-review.service';
import { FormatterService } from './formatter.service';
import { ReviewResult, Finding } from '../types/review.types';
import { AnalysisJob } from '../types/analysis.types';
import { supabase } from './supabase.service';
import { v4 as uuidv4 } from 'uuid';

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
  async startPRAnalysis(owner: string, repo: string, prNumber: number, url: string, userId?: string, userName?: string): Promise<string> {
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

    this.processPRBackground(jobId, owner, repo, prNumber, url).catch(async (err: any) => {
      console.error(`Job ${jobId} failed:`, err);
      await this.updateJob(jobId, { status: 'ERROR', error: String(err) });
    });

    return jobId;
  }

  // ============================================================
  // SECTION: Start Repo Analysis (Async Background Task)
  // ============================================================
  async startRepoAnalysis(owner: string, repo: string, branch: string | undefined, url: string, userId?: string, userName?: string): Promise<string> {
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

    this.processRepoBackground(jobId, owner, repo, branch, url).catch(async (err: any) => {
      console.error(`Job ${jobId} failed:`, err);
      await this.updateJob(jobId, { status: 'ERROR', error: String(err) });
    });

    return jobId;
  }

  // --- Background workers ---

  private async processPRBackground(jobId: string, owner: string, repo: string, prNumber: number, url: string) {
    const startTime = Date.now();

    try {
      // 1. Fetch
      await this.updateJob(jobId, { status: 'FETCHING' });
      const files = await this.github.getPRFiles(owner, repo, prNumber);

      const filesToReview = files.filter(f => (f.status === 'added' || f.status === 'modified') && !!f.patch);
      await this.updateJob(jobId, { total_files: filesToReview.length, status: 'ANALYZING' });

      const allFindings: Finding[] = [];

      // 2. Ingestion Phase — Embed files into Supabase pgvector (BATCHED)
      const EMBED_BATCH = 10;
      for (let ei = 0; ei < filesToReview.length; ei += EMBED_BATCH) {
        const embedBatch = filesToReview.slice(ei, ei + EMBED_BATCH);
        await Promise.all(embedBatch.map(async (file) => {
          try {
            const textToEmbed = (file.patch || "").substring(0, 5000);
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

      // 4. Analyze with RAG context from pgvector
      let processedFiles = 0;
      const MAX_CONCURRENT = 10;
      
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
                match_threshold: 0.6,
                match_count: 2,
                p_job_id: jobId,
              });
              if (matches && matches.length > 0) {
                const filtered = matches.filter((m: any) => m.path !== file.filename);
                relatedContext = filtered.map((m: any) => `FILE: ${m.path}\n${m.content.substring(0, 3000)}`).join('\n\n');
              }
            }

            return await this.ai.reviewFile(file.patch!, file.filename, 'Detect from extension', relatedContext);
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
      }

      // 4. Format and Finish
      await this.finalizeJob(jobId, url, 'PR', `${owner}/${repo}`, filesToReview.length, 0, allFindings, startTime);

    } catch (err) {
      throw err;
    }
  }

  private async processRepoBackground(jobId: string, owner: string, repo: string, branch: string | undefined, url: string) {
    const startTime = Date.now();
    let cloneDir = '';

    try {
      // 1. Clone
      await this.updateJob(jobId, { status: 'FETCHING' });
      cloneDir = await this.github.cloneRepository(owner, repo, branch);

      // 2. Read Files
      const filesToReview = await this.github.getLocalFiles(cloneDir);
      const totalLines = filesToReview.reduce((sum, file) => sum + file.lines, 0);
      await this.updateJob(jobId, { total_files: filesToReview.length });

      // 3. Ingestion Phase — Embed files into Supabase pgvector (BATCHED)
      const EMBED_BATCH = 10;
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

      await this.updateJob(jobId, { status: 'ANALYZING' });

      const allFindings: Finding[] = [];

      // 4. Analyze with RAG context from pgvector
      let processedFiles = 0;
      const MAX_CONCURRENT = 10;

      for (let i = 0; i < filesToReview.length; i += MAX_CONCURRENT) {
        const batch = filesToReview.slice(i, i + MAX_CONCURRENT);
        
        await this.updateJob(jobId, { current_file: `Processing Batch ${Math.floor(i/MAX_CONCURRENT) + 1}...` });

        const batchPromises = batch.map(async (file) => {
          try {
            let relatedContext = '';
            
            // Re-use the embedding we just inserted in Phase 3
            const { data: fe } = await supabase.from('file_embeddings').select('embedding').eq('job_id', jobId).eq('path', file.path).single();
            const currentVecStr = fe?.embedding;

            if (currentVecStr) {
              const { data: matches } = await supabase.rpc('match_related_files', {
                query_embedding: currentVecStr,
                match_threshold: 0.6,
                match_count: 2,
                p_job_id: jobId,
              });
              if (matches && matches.length > 0) {
                const filtered = matches.filter((m: any) => m.path !== file.path);
                relatedContext = filtered.map((m: any) => `FILE: ${m.path}\n${m.content.substring(0, 3000)}`).join('\n\n');
              }
            }

            return await this.ai.reviewFile(file.content, file.path, file.language, relatedContext);
          } catch (e) {
            console.error(`Error processing file ${file.path}:`, e);
            return [];
          }
        });

        const results = await Promise.all(batchPromises);
        results.forEach(findings => allFindings.push(...findings));
        
        processedFiles += batch.length;
        const progress = Math.round((processedFiles / filesToReview.length) * 100);
        await this.updateJob(jobId, { processed_files: processedFiles, progress });
      }

      // 5. Format and Finish
      await this.finalizeJob(jobId, url, 'REPO', `${owner}/${repo}`, filesToReview.length, totalLines, allFindings, startTime);

    } catch (err) {
      throw err;
    } finally {
      if (cloneDir) {
        await this.github.cleanupRepo(cloneDir);
      }
    }
  }

  private async finalizeJob(jobId: string, url: string, type: 'PR' | 'REPO', repoName: string, totalFiles: number, totalLines: number, findings: Finding[], startTime: number) {
    await this.updateJob(jobId, { status: 'REVIEWING' });

    const { correlations, architectureReview } = await this.ai.correlateFindings(findings);

    const durationMs = Date.now() - startTime;
    const summary = this.formatter.generateSummary(findings);
    summary.architectureReview = architectureReview;

    // Fetch the user data from the job to persist into the result
    const { data: job } = await supabase.from('jobs').select('user_id, user_name').eq('id', jobId).single();

    await supabase.from('results').insert({
      id: jobId,
      url,
      type,
      repo_name: repoName,
      total_files: totalFiles,
      total_lines: totalLines,
      findings,
      correlations,
      summary,
      created_at: new Date().toISOString(),
      duration_ms: durationMs,
      user_id: job?.user_id || null,
      user_name: job?.user_name || null,
    });

    await this.updateJob(jobId, { status: 'COMPLETE', progress: 100 });
  }
}
