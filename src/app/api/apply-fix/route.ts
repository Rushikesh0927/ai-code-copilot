import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { Octokit } from '@octokit/rest';
import { APP_CONFIG } from '../../../config/app.config';

export async function POST(req: Request) {
  try {
    let { filePath, snippet, replacement, repoUrl } = await req.json();

    if (!filePath || !snippet || !replacement) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    if (!APP_CONFIG.SYSTEM.ENABLE_LOCAL_FIX_APPLICATION) {
      return NextResponse.json({ success: false, error: 'Auto-fix is disabled by system administrator configuration.' }, { status: 403 });
    }

    // Normalize Windows backslashes to forward slashes for GitHub API
    filePath = filePath.replace(/\\/g, '/');

    // --- GITHUB CLOUD FIX ENGINE ---
    if (repoUrl && repoUrl.includes('github.com')) {
      const session: any = await getServerSession(authOptions);
      if (!session || !session.accessToken) {
         return NextResponse.json({ success: false, error: 'Unauthorized. Please login to GitHub.' }, { status: 401 });
      }
      
      const octokit = new Octokit({ auth: session.accessToken });
      const cleanUrl = repoUrl.split('?')[0].replace(/\/$/, "");
      // Robust URL parsing with regex
      const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (!match) {
        return NextResponse.json({ success: false, error: 'Invalid GitHub repository URL format.' }, { status: 400 });
      }
      const owner = match[1];
      const repo = match[2];

      // 1. Fetch file to get SHA and content
      let fileRes;
      try {
        fileRes = await octokit.rest.repos.getContent({ owner, repo, path: filePath });
      } catch (e: unknown) {
         return NextResponse.json({ success: false, error: 'File not found on GitHub.' }, { status: 404 });
      }

      if (Array.isArray(fileRes.data) || fileRes.data.type !== 'file') {
         return NextResponse.json({ success: false, error: 'Target is not a file.' }, { status: 400 });
      }

      const sha = fileRes.data.sha;
      const contentBase64 = fileRes.data.content;
      const decodeContent = Buffer.from(contentBase64, 'base64').toString('utf8');

      if (!decodeContent.includes(snippet)) {
         return NextResponse.json({ success: false, error: 'Snippet match failed. AI format mismatch.' }, { status: 400 });
      }

      const newContent = decodeContent.replaceAll(snippet, replacement);
      const newContentBase64 = Buffer.from(newContent, 'utf8').toString('base64');

      // 2. Commit exactly the new file string
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: `Copilot: Applied AI Security Fix to ${filePath}`,
        content: newContentBase64,
        sha
      });

      return NextResponse.json({ success: true, mode: 'github' });
    }

    // --- LOCAL DISK FIX ENGINE ---
    const absolutePath = path.resolve(process.cwd(), filePath);

    // Path traversal protection: ensure resolved path stays within project root
    const baseDir = process.cwd();
    if (!absolutePath.startsWith(baseDir + path.sep) && absolutePath !== baseDir) {
      return NextResponse.json({ success: false, error: 'Invalid file path — directory traversal blocked' }, { status: 400 });
    }

    try {
      await fs.access(absolutePath);
    } catch {
      return NextResponse.json({ success: false, error: 'File not found on disk' }, { status: 404 });
    }

    let fileContent = await fs.readFile(absolutePath, 'utf8');

    if (fileContent.includes(snippet)) {
      fileContent = fileContent.replaceAll(snippet, replacement);
      await fs.writeFile(absolutePath, fileContent, 'utf8');
      return NextResponse.json({ success: true, mode: 'local' });
    } else {
      return NextResponse.json({ success: false, error: 'Original snippet not found exactly in file' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Error applying fix:', error);
    return NextResponse.json({ success: false, error: 'An internal error occurred while applying the fix.' }, { status: 500 });
  }
}
