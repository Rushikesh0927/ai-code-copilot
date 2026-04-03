// ============================================================
// SECTION: Frontend — Review Results Page
// PURPOSE: Fetches the final results server-side and renders the dashboard
// MODIFY: Change how data is loaded or error states here
// ============================================================

import React from 'react';
import ReviewDashboard from '../../../components/ReviewDashboard';
import { ReviewResult } from '../../../types/review.types';
import Link from 'next/link';

// NOTE: In Next.js App Router, this is a Server Component by default.
// It fetches data before sending HTML to the client.

async function getResults(id: string): Promise<ReviewResult | null> {
  // We need absolute URL for fetch in SSR
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/review?jobId=${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error("Error fetching review results", e);
    return null;
  }
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  // Await params per Next.js 15 breaking changes
  const resolvedParams = await params;
  const result = await getResults(resolvedParams.id);

  if (!result) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>Review Not Found</h2>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>The analysis session {resolvedParams.id} expired or does not exist.</p>
        <Link href="/">
           <button className="btn-primary">← Back to Home</button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
         <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>
           ← Back to Home
         </Link>
      </div>
      <ReviewDashboard result={result} />
    </div>
  );
}
