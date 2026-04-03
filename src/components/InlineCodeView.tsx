// ============================================================
// SECTION: Frontend — Inline Code View
// PURPOSE: Displays the exact snippet with issue highlighted and suggestion below
// MODIFY: Change colors, font or diff styling here
// ============================================================

'use client';

import React from 'react';

interface InlineCodeViewProps {
  codeSnippet?: string;
  suggestion?: string;
}

export default function InlineCodeView({ codeSnippet, suggestion }: InlineCodeViewProps) {
  if (!codeSnippet && !suggestion) return null;

  return (
    <div style={{ marginTop: '16px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* VULNERABLE CODE SECTION */}
      {codeSnippet && (
        <div style={{ background: '#1e1e1e' }}>
          <div style={{ 
            background: 'rgba(255, 68, 68, 0.1)', 
            padding: '4px 12px', 
            fontSize: '12px', 
            borderBottom: '1px solid var(--border)',
            color: '#ff4444',
            fontWeight: 600
          }}>
            🔴 Issued Code
          </div>
          <pre className="code-font" style={{ padding: '16px', margin: 0, overflowX: 'auto', color: '#d4d4d4' }}>
            <code>{codeSnippet}</code>
          </pre>
        </div>
      )}

      {/* SUGGESTION SECTION */}
      {suggestion && (
        <div style={{ background: '#1e1e1e', borderTop: '1px solid var(--border)' }}>
          <div style={{ 
            background: 'rgba(0, 204, 102, 0.1)', 
            padding: '4px 12px', 
            fontSize: '12px', 
            borderBottom: '1px solid var(--border)',
            color: '#00cc66',
            fontWeight: 600
          }}>
            ✅ Suggested Fix
          </div>
          <div className="code-font" style={{ padding: '16px', margin: 0, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
            {suggestion}
          </div>
        </div>
      )}
    </div>
  );
}
