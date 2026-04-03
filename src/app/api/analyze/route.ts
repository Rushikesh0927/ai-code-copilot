// ============================================================
// SECTION: API — Analyze Route
// PURPOSE: Endpoint to trigger a new codebase or PR analysis
// MODIFY: Change validation rules or error responses here
// ============================================================

import { NextResponse } from 'next/server';
import { parseGitHubUrl, isValidGitHubUrl } from '../../../utils/parser';
import { AnalyzerService } from '../../../services/analyzer.service';

// We instantiate the service here. In a production DI framework, this would be injected.
const analyzer = new AnalyzerService();

export async function POST(req: Request) {
  try {
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
        userName
      );
    } else {
      jobId = await analyzer.startRepoAnalysis(
        parsedUrl.owner,
        parsedUrl.repo,
        parsedUrl.branch,
        url,
        userId,
        userName
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
