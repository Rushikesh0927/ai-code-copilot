// ============================================================
// SECTION: Frontend — Home Page
// PURPOSE: Landing page and analysis trigger
// MODIFY: Change landing page copy, hero section here
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InputForm from '../components/InputForm';
import StatusTracker from '../components/StatusTracker';
import { AnalysisJob } from '../types/analysis.types';

export default function Home() {
  const router = useRouter();
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<AnalysisJob | null>(null);

  // Poll for status updates
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status?jobId=${jobId}`);
        if (res.ok) {
          const data: AnalysisJob = await res.json();
          setJobStatus(data);

          if (data.status === 'COMPLETE') {
            clearInterval(interval);
            // Wait a sec so user sees 100%, then redirect
            setTimeout(() => {
              router.push(`/review/${jobId}`);
            }, 1000);
          } else if (data.status === 'ERROR') {
             clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, router]);

  const handleStartReview = async (url: string) => {
    try {
      setJobId(null);
      setJobStatus(null);
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`Error: ${data.error || 'Failed to start analysis'}`);
        return;
      }

      const data = await res.json();
      setJobId(data.jobId);
      
    } catch (err) {
      alert("Network error starting analysis.");
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="gradient-text" style={{ fontSize: '48px', marginBottom: '16px' }}>
          AI Code Review Copilot
        </h1>
        <p style={{ fontSize: '18px', color: '#94a3b8' }}>
           Enterprise-grade static analysis powered by Gemini Flash and MITRE CWE references.
        </p>
      </div>

      <InputForm onSubmit={handleStartReview} isLoading={!!jobId && jobStatus?.status !== 'ERROR'} />
      
      {jobId && <StatusTracker job={jobStatus} />}

      {!jobId && (
        <div style={{ display: 'flex', gap: '24px', marginTop: '40px' }}>
           <div className="glass-card" style={{ padding: '24px', flex: 1 }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🕵️‍♂️</div>
              <h4>Vulnerability Detection</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>Checks against OWASP Top 10 and CWE-Top 25 weaknesses.</p>
           </div>
           <div className="glass-card" style={{ padding: '24px', flex: 1 }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
              <h4>Performance Audit</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>Identifies N+1 queries, synchronous blocking, and more.</p>
           </div>
           <div className="glass-card" style={{ padding: '24px', flex: 1 }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>💡</div>
              <h4>Inline Fixes</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>Generates concrete code suggestions for every issue.</p>
           </div>
        </div>
      )}
    </div>
  );
}
