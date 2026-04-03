// ============================================================
// SECTION: GitHub URL Parser
// PURPOSE: Parse GitHub PR and repo URLs into structured data
// MODIFY: Add GitLab/Bitbucket support here
// ============================================================

import { ParsedGitHubUrl } from '@/types/github.types';

const PR_REGEX = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
const REPO_REGEX = /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:[/?#].*)?$/;

export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  const cleaned = url.trim().replace(/\/$/, '');

  // Check for PR first
  const prMatch = cleaned.match(PR_REGEX);
  if (prMatch) {
    return {
      type: 'PR',
      owner: prMatch[1],
      repo: prMatch[2],
      prNumber: parseInt(prMatch[3], 10),
      fullName: `${prMatch[1]}/${prMatch[2]}`,
    };
  }

  // Check for repo
  const repoMatch = cleaned.match(REPO_REGEX);
  if (repoMatch) {
    return {
      type: 'REPO',
      owner: repoMatch[1],
      repo: repoMatch[2],
      fullName: `${repoMatch[1]}/${repoMatch[2]}`,
    };
  }

  return null;
}

export function isValidGitHubUrl(url: string): boolean {
  return parseGitHubUrl(url) !== null;
}

export function getCloneUrl(owner: string, repo: string, token?: string): string {
  if (token) {
    return `https://${token}@github.com/${owner}/${repo}.git`;
  }
  return `https://github.com/${owner}/${repo}.git`;
}
