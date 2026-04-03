// ============================================================
// SECTION: Frontend — Finding Card
// PURPOSE: Renders a single review finding
// MODIFY: Change layout, icons, expanding behavior here
// ============================================================

'use client';

import React, { useState } from 'react';
import { Finding } from '../types/review.types';
import { SEVERITY_CONFIG, CATEGORY_CONFIG } from '../utils/constants';
import InlineCodeView from './InlineCodeView';

interface FindingCardProps {
  finding: Finding;
}

export default function FindingCard({ finding }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const severityStyles = SEVERITY_CONFIG[finding.severity];
  const categoryMeta = CATEGORY_CONFIG[finding.category];

  return (
    <div 
      className="glass-card" 
      style={{ 
        marginBottom: '16px', 
        borderLeft: `4px solid ${severityStyles.color}`,
        padding: '16px'
      }}
    >
      <div 
        className="flex justify-between items-center" 
        style={{ cursor: 'pointer' }} 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 w-full">
          {/* Metadata Badges */}
          <div className="flex flex-col gap-2">
            <span style={{ 
              background: severityStyles.bgColor, 
              color: severityStyles.color, 
              padding: '4px 8px', 
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {severityStyles.icon} {severityStyles.label}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
               {categoryMeta.icon} {categoryMeta.label}
            </span>
          </div>

          {/* Title & Line */}
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{finding.title}</h4>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
               Line: <span className="code-font">{finding.line || 'Unknown'}</span>
               {finding.cweId && <span style={{ marginLeft: '8px' }}>• {finding.cweId}</span>}
            </div>
          </div>
          
          {/* Expand Toggle */}
          <div style={{ color: '#94a3b8', fontSize: '20px' }}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <p style={{ color: '#cbd5e1', marginBottom: '16px' }}>{finding.description}</p>
          
          <InlineCodeView 
            codeSnippet={finding.codeSnippet} 
            suggestion={finding.suggestion} 
          />
        </div>
      )}
    </div>
  );
}
