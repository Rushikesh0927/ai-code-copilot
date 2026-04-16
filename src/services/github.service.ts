// ============================================================
// SECTION: Services — GitHub Integration
// PURPOSE: Fetching repositories and pull request data
// MODIFY: Add support for paginated files, or other Git providers here
// ============================================================

import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getCloneUrl } from '../utils/parser';
import { GitHubPRFile, RepoFile } from '../types/github.types';
import { SUPPORTED_EXTENSIONS, SKIP_PATTERNS, EXTENSION_TO_LANGUAGE } from '../utils/constants';

export class GitHubService {
  private octokit: Octokit;
  private token: string | undefined;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN;
    this.octokit = new Octokit({
      auth: this.token,
    });
  }

  // ============================================================
  // SECTION: Clone Repository
  // PURPOSE: Download a full repository for analysis
  // ============================================================
  async cloneRepository(owner: string, repo: string, branch?: string): Promise<string> {
    const cloneDir = path.join(process.cwd(), '.temp_repos', uuidv4());
    await fs.ensureDir(cloneDir);

    const git: SimpleGit = simpleGit();
    const url = getCloneUrl(owner, repo, this.token);

    try {
      const options = ['--depth', '1'];
      if (branch) {
        options.push('--branch', branch);
      }
      
      await git.clone(url, cloneDir, options);
      
      // Remove .git directory to save space and ignore it
      await fs.remove(path.join(cloneDir, '.git'));
      
      return cloneDir;
    } catch (error) {
      await fs.remove(cloneDir); // Cleanup on failure
      throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================
  // SECTION: Fetch PR Files
  // PURPOSE: Get changed files and diffs for a Pull Request
  // ============================================================
  async getPRFiles(owner: string, repo: string, prNumber: number): Promise<GitHubPRFile[]> {
    try {
      const { data } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100, // Handle up to 100 files for now
      });

      return data.filter(file => this.isSupportedFile(file.filename)).map(file => ({
        filename: file.filename,
        status: file.status as any,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
        raw_url: file.raw_url,
        blob_url: file.blob_url,
      }));
    } catch (error) {
       throw new Error(`Failed to fetch PR files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================
  // SECTION: Read Local Repo Files
  // PURPOSE: Traverse the cloned directory and read files
  // ============================================================
  async getLocalFiles(dirPath: string): Promise<RepoFile[]> {
    const allFiles: RepoFile[] = [];

    async function traverse(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden files/dirs and explicitly ignored patterns
        if (entry.name.startsWith('.') || SKIP_PATTERNS.includes(entry.name)) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else if (entry.isFile()) {
           const ext = path.extname(entry.name).toLowerCase();
           if (SUPPORTED_EXTENSIONS.includes(ext)) {
               const content = await fs.readFile(fullPath, 'utf-8');
               const lines = content.split(/\r\n|\r|\n/).length;
               
               allFiles.push({
                 path: path.relative(dirPath, fullPath).replace(/\\\\/g, '/'), // uniform path
                 content,
                 language: EXTENSION_TO_LANGUAGE[ext] || 'PlainText',
                 lines,
                 size: Buffer.byteLength(content, 'utf8')
               });
           }
        }
      }
    }

    await traverse(dirPath);
    return allFiles;
  }
  
  // ============================================================
  // SECTION: Cleanup
  // PURPOSE: Remove the temporary repository
  // ============================================================
  async cleanupRepo(dirPath: string): Promise<void> {
      try {
          await fs.remove(dirPath);
      } catch (err) {
          console.error(`Failed to cleanup ${dirPath}:`, err);
      }
  }

  private isSupportedFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    
    // Check if filename contains any skip patterns
    if (SKIP_PATTERNS.some(pattern => filename.includes(pattern))) {
        return false;
    }
    
    return SUPPORTED_EXTENSIONS.includes(ext);
  }
}
