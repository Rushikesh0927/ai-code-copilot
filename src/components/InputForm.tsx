// ============================================================
// SECTION: Frontend — Input Form
// PURPOSE: URL input component for repo/PR submission
// MODIFY: Change input validation, styling, or placeholders here
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import { parseGitHubUrl } from '../utils/parser';
import { useSession, signIn } from 'next-auth/react';

interface InputFormProps {
  onSubmit: (url: string, customRules?: string[]) => void;
  isLoading: boolean;
}

export default function InputForm({ onSubmit, isLoading }: InputFormProps) {
  const { data: session, status } = useSession();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [customRulesText, setCustomRulesText] = useState('');
  const [showCustomRules, setShowCustomRules] = useState(false);
  
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      setLoadingRepos(true);
      fetch('/api/github/repos')
        .then(res => res.json())
        .then(data => {
           if (data.repos) setRepos(data.repos);
        })
        .catch(console.error)
        .finally(() => setLoadingRepos(false));
    }
  }, [status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a GitHub URL.');
      return;
    }

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      setError('Invalid GitHub URL. Must be a repository or Pull Request URL.');
      return;
    }
    const customRules = customRulesText.split('\n').map(r => r.trim()).filter(Boolean);
    onSubmit(url.trim(), customRules.length > 0 ? customRules : undefined);
  };

  return (
    <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h2 style={{ marginBottom: '8px' }}>Analyze GitHub Code</h2>
          <p style={{ color: 'var(--foreground)', opacity: 0.8 }}>
            Paste a Pull Request or Repository URL to start an AI-powered code review.
          </p>
        </div>
        
        {status === 'unauthenticated' && (
          <button 
            onClick={() => signIn('github')}
            style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
          >
            🔌 Connect GitHub
          </button>
        )}
      </div>

      {status === 'authenticated' && repos.length > 0 && (
         <div style={{ marginBottom: '20px' }}>
           <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Pick from your repositories:</label>
           <select 
             onChange={(e) => setUrl(e.target.value)}
             className="input-field"
             style={{ cursor: 'pointer', width: '100%', appearance: 'auto' }}
             defaultValue=""
           >
             <option value="" disabled>-- Select a GitHub Repository --</option>
             {repos.map(r => (
               <option key={r.id} value={r.html_url}>{r.full_name} {r.private ? '🔒' : ''}</option>
             ))}
           </select>
           <div style={{ textAlign: 'center', margin: '14px 0', color: '#475569', fontSize: '12px', fontWeight: 500 }}>
             &mdash; OR MANUALLY PASTE URL &mdash;
           </div>
         </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-4">
        <input
          type="text"
          className="input-field"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={isLoading}
          style={{ whiteSpace: 'nowrap', minWidth: '120px' }}
        >
          {isLoading ? 'Analyzing...' : 'Start Review'}
        </button>
      </form>

      {/* Custom Rules Toggle */}
      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={() => setShowCustomRules(!showCustomRules)}
          style={{
            background: 'none', border: 'none', color: '#64748b', fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0,
          }}
        >
          <span style={{ transition: 'transform .2s', transform: showCustomRules ? 'rotate(90deg)' : 'none' }}>▶</span>
          ⚙️ Custom Review Rules {customRulesText.split('\n').filter(Boolean).length > 0 && `(${customRulesText.split('\n').filter(Boolean).length})`}
        </button>
        {showCustomRules && (
          <textarea
            value={customRulesText}
            onChange={e => setCustomRulesText(e.target.value)}
            placeholder={`Enter custom rules (one per line):\nNever use console.log in production code\nAll API routes must validate input with Zod\nNo inline styles — use CSS modules`}
            rows={4}
            style={{
              width: '100%', marginTop: 8, padding: '10px 14px',
              background: 'rgba(30,41,59,0.8)', border: '1px solid #334155',
              borderRadius: 8, color: '#e2e8f0', fontSize: 12,
              fontFamily: 'monospace', resize: 'vertical', outline: 'none',
              lineHeight: 1.6,
            }}
          />
        )}
      </div>

      {error && (
        <div style={{ color: '#ff4444', marginTop: '12px', fontSize: '14px' }}>
          {error}
        </div>
      )}
    </div>
  );
}
