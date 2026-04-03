// ============================================================
// SECTION: Frontend — File Navigator
// PURPOSE: Sidebar to select which file's findings to view
// MODIFY: Change file icon or badge styles here
// ============================================================

'use client';

import React from 'react';
import { FileReview } from '../types/review.types';
import { SEVERITY_CONFIG } from '../utils/constants';

interface FileNavigatorProps {
  files: FileReview[];
  selectedFile: string | null;
  onSelect: (path: string | null) => void;
}

export default function FileNavigator({ files, selectedFile, onSelect }: FileNavigatorProps) {
  return (
    <div className="glass-panel" style={{ width: '300px', height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0 }}>Files Reviewed</h3>
      </div>
      
      <div style={{ padding: '12px' }}>
         <div 
          onClick={() => onSelect(null)}
          style={{
            padding: '12px',
            borderRadius: '6px',
            cursor: 'pointer',
            background: selectedFile === null ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            borderLeft: selectedFile === null ? '3px solid var(--primary)' : '3px solid transparent',
            color: selectedFile === null ? '#fff' : '#94a3b8',
            marginBottom: '8px'
          }}
        >
          All Files ({files.reduce((acc, f) => acc + f.findings.length, 0)} issues)
        </div>

        {files.map(file => (
          <div 
            key={file.path}
            onClick={() => onSelect(file.path)}
            style={{
              padding: '12px',
              borderRadius: '6px',
              cursor: 'pointer',
              background: selectedFile === file.path ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              borderLeft: selectedFile === file.path ? `3px solid #cbd5e1` : '3px solid transparent',
              color: selectedFile === file.path ? '#fff' : '#94a3b8',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginBottom: '4px',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ wordBreak: 'break-all', fontSize: '14px' }}>📄 {file.path}</div>
            
            {/* Badges for finding severity counts */}
            {file.findings.length > 0 && (
              <div className="flex gap-2">
                {(Object.entries(file.severityCount) as [keyof typeof SEVERITY_CONFIG, number][]).map(([sev, count]) => {
                  if (count === 0) return null;
                  const config = SEVERITY_CONFIG[sev];
                  return (
                    <span 
                      key={sev} 
                      style={{ 
                        background: config.bgColor, 
                        color: config.color,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}
                      title={`${count} ${config.label} issues`}
                    >
                      {count} {config.icon}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
