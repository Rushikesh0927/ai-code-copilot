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
import { useSession, signIn } from 'next-auth/react';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<AnalysisJob | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);

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
    <>
      {status === 'unauthenticated' && showWelcomeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel" style={{ maxWidth: '500px', width: '90%', padding: '40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '28px', marginBottom: '16px', background: 'linear-gradient(90deg, #3b82f6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Welcome to AI Code Review Copilot
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '32px', lineHeight: '1.6' }}>
              For the best experience, connect your GitHub account. This allows you to automatically select repositories and apply AI bug fixes directly to your code.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button 
                onClick={() => signIn('github')}
                style={{ padding: '14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}
              >
                🔌 Connect GitHub (Recommended)
              </button>
              
              <button 
                onClick={() => setShowWelcomeModal(false)}
                style={{ padding: '14px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}
              >
                Continue Manually
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '800px', margin: '40px auto', filter: (status === 'unauthenticated' && showWelcomeModal) ? 'blur(4px)' : 'none', transition: 'filter 0.3s ease' }}>
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
    </>
  );
}
