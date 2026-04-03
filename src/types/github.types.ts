// ============================================================
// SECTION: GitHub Types
// PURPOSE: Type definitions for GitHub API responses
// MODIFY: Add more GitHub API response fields as needed
// ============================================================

export interface GitHubPRFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string; // The actual diff
  raw_url: string;
  blob_url: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  body: string;
  state: string;
  base: { ref: string; sha: string; repo: { full_name: string } };
  head: { ref: string; sha: string; repo: { full_name: string } };
  files: GitHubPRFile[];
  mergeable?: boolean;
  diff_url: string;
}

// ============================================================
// SECTION: Parsed GitHub URL
// PURPOSE: Result of parsing a GitHub URL input
// MODIFY: Add support for GitLab/Bitbucket here
// ============================================================
export interface ParsedGitHubUrl {
  type: 'PR' | 'REPO';
  owner: string;
  repo: string;
  prNumber?: number;
  branch?: string;
  fullName: string; // owner/repo
}

export interface RepoFile {
  path: string;
  content: string;
  language: string;
  lines: number;
  size: number;
}
