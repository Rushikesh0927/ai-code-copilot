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
  fixSnippet?: string;
}

export default function InlineCodeView({ codeSnippet, suggestion, fixSnippet }: InlineCodeViewProps) {
  if (!codeSnippet && !suggestion && !fixSnippet) return null;

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
        <div style={{ background: '#1a1d24', borderTop: '1px solid var(--border)', padding: '16px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.7 }}>
            {suggestion}
          </div>
        </div>
      )}

      {/* FIX SNIPPET SECTION */}
      {fixSnippet && (
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
          <pre className="code-font" style={{ padding: '16px', margin: 0, overflowX: 'auto', color: '#e2e8f0' }}>
            <code>{fixSnippet}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
