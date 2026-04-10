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
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();           //check login
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<AnalysisJob | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState('');

  // Poll for status updates & check guest status
  useEffect(() => {
    if (status === 'unauthenticated' && !localStorage.getItem('guestName')) {
      setShowWelcomeModal(true);
    }
    
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
  }, [jobId, router, status]);

  const handleStartReview = async (url: string) => {
    try {
      setJobId(null);
      setJobStatus(null);
      
      let userId = '';
      let userName = '';
      
      if (session?.user) {
         userId = session.user.email || 'github-user';
         userName = session.user.name || 'GitHub User';
      } else {
         userName = localStorage.getItem('guestName') || 'Anonymous';
         userId = 'guest-' + userName.toLowerCase().replace(/\W+/g, '-');
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, userId, userName })
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

  const handleGuestSubmit = () => {
    if (!guestNameInput.trim()) return;
    localStorage.setItem('guestName', guestNameInput.trim());
    setShowWelcomeModal(false);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('guestName');
    signOut();
  };

  return (
    <>
      {(status === 'authenticated' && session?.user) || (status === 'unauthenticated' && typeof window !== 'undefined' && localStorage.getItem('guestName')) ? (
        <div style={{ position: 'absolute', top: '24px', right: '40px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(30, 41, 59, 0.5)', padding: '6px 12px', borderRadius: '20px', border: '1px solid #334155' }}>
            {session?.user?.image ? (
              <img src={session.user.image} alt="Profile" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                {(session?.user?.name || (typeof window !== 'undefined' ? localStorage.getItem('guestName') : 'A'))?.charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 500 }}>{session?.user?.name || (typeof window !== 'undefined' ? localStorage.getItem('guestName') : 'Guest')}</span>
          </div>
          <button 
            onClick={handleLogout}
            style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer' }}
          >
            Log Out
          </button>
        </div>
      ) : null}

      {status === 'unauthenticated' && showWelcomeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel" style={{ maxWidth: '500px', width: '90%', padding: '40px', textAlign: 'center' }}>
            {!showGuestPrompt ? (
              <>
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
                    onClick={() => setShowGuestPrompt(true)}
                    style={{ padding: '14px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}
                  >
                    Continue Manually
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#fff' }}>Who is analyzing?</h2>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
                  Please enter your name so we can save your analysis reports to the database.
                </p>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Enter your name..." 
                  value={guestNameInput}
                  onChange={(e) => setGuestNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGuestSubmit()}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: 'rgba(15, 23, 42, 0.5)', color: '#fff', fontSize: '16px', marginBottom: '16px' }} 
                />
                <button 
                  onClick={handleGuestSubmit}
                  disabled={!guestNameInput.trim()}
                  style={{ width: '100%', padding: '14px', background: guestNameInput.trim() ? '#3b82f6' : '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: guestNameInput.trim() ? 'pointer' : 'not-allowed' }}
                >
                  Start Analyzing
                </button>
              </>
            )}
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
