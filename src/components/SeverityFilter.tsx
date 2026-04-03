// ============================================================
// SECTION: Frontend — Severity Filter
// PURPOSE: Filter findings by severity (Critical/High/Medium etc)
// MODIFY: Change toggle button styles or filter logic here
// ============================================================

'use client';

import React from 'react';
import { Severity } from '../types/review.types';
import { SEVERITY_CONFIG } from '../utils/constants';

interface SeverityFilterProps {
  activeFilters: Set<Severity>;
  onToggle: (severity: Severity) => void;
  counts: Record<Severity, number>;
}

export default function SeverityFilter({ activeFilters, onToggle, counts }: SeverityFilterProps) {
  const severities = Object.keys(SEVERITY_CONFIG) as Severity[];

  return (
    <div className="flex gap-2 flex-wrap" style={{ marginBottom: '24px' }}>
      {severities.map(sev => {
        const config = SEVERITY_CONFIG[sev];
        const count = counts[sev] || 0;
        const isActive = activeFilters.has(sev);

        return (
          <button
            key={sev}
            onClick={() => onToggle(sev)}
            style={{
              background: isActive ? config.bgColor : 'var(--surface-1)',
              border: `1px solid ${isActive ? config.borderColor : 'var(--border)'}`,
              color: isActive ? config.color : '#94a3b8',
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.2s',
              opacity: count === 0 ? 0.5 : 1
            }}
          >
            {config.icon} {config.label} ({count})
          </button>
        );
      })}
    </div>
  );
}
