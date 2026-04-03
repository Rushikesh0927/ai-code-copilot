// ============================================================
// SECTION: API — Review Results Route
// PURPOSE: Endpoint to fetch the final review results by Job ID
// MODIFY: Change result shape for frontend here
// ============================================================

import { NextResponse } from 'next/server';
import { AnalyzerService } from '../../../services/analyzer.service';

const analyzer = new AnalyzerService();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId parameter is required' }, { status: 400 });
  }

  const results = await analyzer.getResults(jobId);

  if (!results) {
    return NextResponse.json({ error: 'Review results not found or not complete yet.' }, { status: 404 });
  }

  return NextResponse.json(results);
}
