// ============================================================
// SECTION: API — Status Route
// PURPOSE: Endpoint to check progress of an ongoing analysis job
// MODIFY: Add additional progress metrics here
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

  const status = await analyzer.getJobStatus(jobId);

  if (!status) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(status);
}
