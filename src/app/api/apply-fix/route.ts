import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { Octokit } from '@octokit/rest';
import { APP_CONFIG } from '../../../config/app.config';

export async function POST(req: Request) {
  try {
    const body = await req.json() as any;
    let { filePath, snippet, replacement, repoUrl } = body;
    const lineNum: number = body.line || 0;

    if (!filePath || !replacement) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    if (!APP_CONFIG.SYSTEM.ENABLE_LOCAL_FIX_APPLICATION) {
      return NextResponse.json({ success: false, error: 'Auto-fix is disabled by system administrator configuration.' }, { status: 403 });
    }

    // Normalize Windows backslashes to forward slashes for GitHub API
    filePath = filePath.replace(/\\/g, '/');

    // Helper: try 3-strategy replacement and return new content
    function applyReplacement(content: string): string | null {
      // Strategy 1: exact match
      if (snippet && content.includes(snippet)) {
        return content.replaceAll(snippet, replacement);
      }
      // Strategy 2: trim-line match (handles indentation differences)
      if (snippet) {
        const fileLines = content.split('\n');
        const snippetLines = snippet.split('\n').map((l: string) => l.trim()).filter(Boolean);
        for (let i = 0; i <= fileLines.length - snippetLines.length; i++) {
          const window = fileLines.slice(i, i + snippetLines.length).map((l: string) => l.trim()).filter(Boolean);
          if (window.join(' ') === snippetLines.join(' ')) {
            const replacementLines = replacement.split('\n');
            fileLines.splice(i, snippetLines.length, ...replacementLines);
            return fileLines.join('\n');
          }
        }
      }
      // Strategy 3: line-number based replacement
      if (lineNum > 0) {
        const fileLines = content.split('\n');
        const snippetLineCount = snippet ? snippet.split('\n').length : 1;
        const replacementLines = replacement.split('\n');
        fileLines.splice(lineNum - 1, snippetLineCount, ...replacementLines);
        return fileLines.join('\n');
      }
      return null;
    }

    // --- GITHUB CLOUD FIX ENGINE ---
    if (repoUrl && repoUrl.includes('github.com')) {
      const session: any = await getServerSession(authOptions);
      if (!session || !session.accessToken) {
        return NextResponse.json({ success: false, error: 'Unauthorized. Please login to GitHub.' }, { status: 401 });
      }

      const octokit = new Octokit({ auth: session.accessToken });
      const cleanUrl = repoUrl.split('?')[0].replace(/\/$/, "");
      const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (!match) {
        return NextResponse.json({ success: false, error: 'Invalid GitHub repository URL format.' }, { status: 400 });
      }
      const owner = match[1];
      const repo = match[2];

      let fileRes;
      try {
        fileRes = await octokit.rest.repos.getContent({ owner, repo, path: filePath });
      } catch {
        return NextResponse.json({ success: false, error: 'File not found on GitHub.' }, { status: 404 });
      }

      if (Array.isArray(fileRes.data) || fileRes.data.type !== 'file') {
        return NextResponse.json({ success: false, error: 'Target is not a file.' }, { status: 400 });
      }

      const sha = fileRes.data.sha;
      const decodeContent = Buffer.from(fileRes.data.content, 'base64').toString('utf8');
      const newContent = applyReplacement(decodeContent);

      if (!newContent) {
        return NextResponse.json({ success: false, error: 'Could not match code to replace — snippet mismatch.' }, { status: 400 });
      }

      await octokit.rest.repos.createOrUpdateFileContents({
        owner, repo, path: filePath,
        message: `Copilot: Applied AI Fix to ${filePath}`,
        content: Buffer.from(newContent, 'utf8').toString('base64'),
        sha
      });

      return NextResponse.json({ success: true, mode: 'github' });
    }

    // --- LOCAL DISK FIX ENGINE ---
    const absolutePath = path.resolve(process.cwd(), filePath);
    const baseDir = process.cwd();
    if (!absolutePath.startsWith(baseDir + path.sep) && absolutePath !== baseDir) {
      return NextResponse.json({ success: false, error: 'Invalid file path — directory traversal blocked' }, { status: 400 });
    }

    try {
      await fs.access(absolutePath);
    } catch {
      return NextResponse.json({ success: false, error: 'File not found on disk' }, { status: 404 });
    }

    const fileContent = await fs.readFile(absolutePath, 'utf8');
    const newContent = applyReplacement(fileContent);
    if (!newContent) {
      return NextResponse.json({ success: false, error: 'Snippet not found in local file' }, { status: 400 });
    }
    await fs.writeFile(absolutePath, newContent, 'utf8');
    return NextResponse.json({ success: true, mode: 'local' });

  } catch (error: unknown) {
    console.error('Error applying fix:', error);
    return NextResponse.json({ success: false, error: 'An internal error occurred while applying the fix.' }, { status: 500 });
  }
}
