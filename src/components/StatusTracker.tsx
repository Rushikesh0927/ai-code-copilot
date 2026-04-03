// ============================================================
// SECTION: Frontend — Status Tracker
// PURPOSE: Visual progress bar for analysis job
// MODIFY: Change colors, animations, or status labels here
// ============================================================

'use client';

import React from 'react';
import { AnalysisJob } from '../types/analysis.types';

interface StatusTrackerProps {
  job: AnalysisJob | null;
}

export default function StatusTracker({ job }: StatusTrackerProps) {
  if (!job) return null;

  const isError = job.status === 'ERROR';
  const isComplete = job.status === 'COMPLETE';
  const progress = isComplete ? 100 : job.progress;

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isComplete ? '✅ Analysis Complete' : 
           isError ? '❌ Analysis Failed' : 
           '⏳ Analyzing Codebase'}
        </h3>
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{progress}%</span>
      </div>

      {/* Progress Bar Container */}
      <div style={{ height: '8px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
        <div 
          style={{ 
            height: '100%', 
            width: `${progress}%`,
            background: isError ? '#ff4444' : isComplete ? '#00cc66' : 'var(--primary)',
            transition: 'width 0.4s ease-out',
            boxShadow: `0 0 10px ${isError ? '#ff4444' : isComplete ? '#00cc66' : 'var(--primary)'}`
          }} 
        />
      </div>

      {/* Status Details */}
      {!isError && !isComplete && (
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>
          <p>Processing File: {job.currentFile || 'Initializing...'}</p>
          {job.totalFiles > 0 && <p>Files Processed: {job.processedFiles} / {job.totalFiles}</p>}
        </div>
      )}

      {isError && (
        <div style={{ fontSize: '14px', color: '#ff4444', padding: '12px', background: 'rgba(255,68,68,0.1)', borderRadius: '4px' }}>
          {job.error}
        </div>
      )}
    </div>
  );
}
