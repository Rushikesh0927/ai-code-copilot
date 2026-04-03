import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { Octokit } from '@octokit/rest';

export async function POST(req: Request) {
  try {
    let { filePath, snippet, replacement, repoUrl } = await req.json();

    if (!filePath || !snippet || !replacement) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
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
      const urlParts = cleanUrl.split('/');
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];

      // 1. Fetch file to get SHA and content
      let fileRes;
      try {
        fileRes = await octokit.rest.repos.getContent({ owner, repo, path: filePath });
      } catch (e: any) {
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

      const newContent = decodeContent.replace(snippet, replacement);
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

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ success: false, error: 'File not found on disk' }, { status: 404 });
    }

    let fileContent = fs.readFileSync(absolutePath, 'utf8');

    if (fileContent.includes(snippet)) {
      fileContent = fileContent.replace(snippet, replacement);
      fs.writeFileSync(absolutePath, fileContent, 'utf8');
      return NextResponse.json({ success: true, mode: 'local' });
    } else {
      return NextResponse.json({ success: false, error: 'Original snippet not found exactly in file' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error applying fix:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
