// ============================================================
// SECTION: API — Analyze Route
// PURPOSE: Endpoint to trigger a new codebase or PR analysis
// MODIFY: Change validation rules or error responses here
// ============================================================

import { NextResponse } from 'next/server';
import { parseGitHubUrl, isValidGitHubUrl } from '../../../utils/parser';
import { analyzer } from '../../../services';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken; // NextAuth injects this from OAuth
    
    const body = await req.json();
    const { url, userId, userName } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!isValidGitHubUrl(url)) {
      return NextResponse.json({ error: 'Invalid GitHub URL. Must be a repository or Pull Request URL.' }, { status: 400 });
    }

    const parsedUrl = parseGitHubUrl(url)!;

    let jobId: string;

    if (parsedUrl.type === 'PR') {
      jobId = await analyzer.startPRAnalysis(
        parsedUrl.owner,
        parsedUrl.repo,
        parsedUrl.prNumber!,
        url,
        userId,
        userName,
        accessToken
      );
    } else {
      jobId = await analyzer.startRepoAnalysis(
        parsedUrl.owner,
        parsedUrl.repo,
        parsedUrl.branch,
        url,
        userId,
        userName,
        accessToken
      );
    }

    return NextResponse.json({ jobId, message: 'Analysis started successfully' }, { status: 202 });

  } catch (error) {
    console.error('Failed to start analysis:', error);
    return NextResponse.json(
      { error: 'Failed to start analysis', details: String(error) }, // Careful with internal details in Prod
      { status: 500 }
    );
  }
}
