// ============================================================
// SECTION: Frontend — Review Dashboard (Spec-Matching Layout)
// PURPOSE: Main container matching the reference report UI
// ============================================================

'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ReviewResult, Finding, Severity, Category, Correlation } from '../types/review.types';
import { FormatterService } from '../services/formatter.service';
import { useSession, signIn } from 'next-auth/react';

const formatter = new FormatterService();

// -- Color Maps --
const SEV_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL:      { bg: '#3d1515', text: '#ff6b6b', dot: '#E24B4A' },
  HIGH:          { bg: '#3d2c10', text: '#fbbf24', dot: '#BA7517' },
  MEDIUM:        { bg: '#152940', text: '#60a5fa', dot: '#185FA5' },
  LOW:           { bg: '#1a3012', text: '#86efac', dot: '#3B6D11' },
  INFORMATIONAL: { bg: '#1e1740', text: '#a78bfa', dot: '#534AB7' },
};
const CAT_COLORS: Record<string, string> = {
  SECURITY: '#E24B4A', BUG: '#BA7517', PERFORMANCE: '#185FA5',
  CODE_SMELL: '#534AB7', ARCHITECTURE: '#0F6E56', SCALABILITY: '#0F6E56',
  LINTING: '#888', DESIGN_PATTERN: '#6D28D9', CODE_CORRELATION: '#3b82f6',
  INLINE_SUGGESTION: '#64748b',
};

type Section = 'summary' | 'issues' | 'findings' | 'correlation';

interface Props { result: ReviewResult; }

export default function ReviewDashboard({ result }: Props) {
  const { data: session, status } = useSession();
  const [section, setSection] = useState<Section>('summary');
  const [sevFilter, setSevFilter] = useState<string>('ALL');
  const [catFilter, setCatFilter] = useState<string>('ALL');
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixedSet, setFixedSet] = useState<Set<string>>(new Set());
  const [showAuthModal, setShowAuthModal] = useState(false);

  // --- Computed data ---
  const sevCounts = useMemo(() => {
    const c: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFORMATIONAL: 0 };
    result.findings.forEach(f => { c[f.severity] = (c[f.severity] || 0) + 1; });
    return c;
  }, [result.findings]);

  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    result.findings.forEach(f => { c[f.category] = (c[f.category] || 0) + 1; });
    return c;
  }, [result.findings]);

  const fileCounts = useMemo(() => {
    const c: Record<string, number> = {};
    result.findings.forEach(f => { c[f.file] = (c[f.file] || 0) + 1; });
    return c;
  }, [result.findings]);

  const languagesBreakdown = useMemo(() => {
    const extCount: Record<string, number> = {};
    Object.keys(fileCounts).forEach(file => {
      const ext = file.split('.').pop() || 'unknown';
      extCount[ext] = (extCount[ext] || 0) + 1;
    });
    const total = Object.keys(fileCounts).length || 1;
    const map: Record<string, string> = { js: 'JavaScript', ts: 'TypeScript', py: 'Python', html: 'HTML', css: 'CSS', jsx: 'React', tsx: 'React TS' };
    return Object.entries(extCount).map(([ext, count]) => ({
      lang: map[ext] || ext.toUpperCase(),
      pct: ((count / total) * 100).toFixed(1)
    }));
  }, [fileCounts]);

  const filteredFindings = useMemo(() => {
    return result.findings.filter(f => {
      const sv = sevFilter === 'ALL' || f.severity === sevFilter;
      const ct = catFilter === 'ALL' || f.category === catFilter;
      return sv && ct;
    });
  }, [result.findings, sevFilter, catFilter]);

  const total = result.findings.length || 1;
  const score = result.summary.overallScore;
  const scoreColor = score > 75 ? '#86efac' : score > 50 ? '#fbbf24' : '#ff6b6b';
  const riskLabel = score > 75 ? 'Low risk' : score > 50 ? 'Medium risk' : score > 25 ? 'Medium-High risk' : 'High risk';

  const hotspots = Object.entries(fileCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxCat = Math.max(...Object.values(catCounts), 1);
  const maxFile = Math.max(...Object.values(fileCounts), 1);

  const toggle = (id: string) => {
    const next = new Set(openCards);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOpenCards(next);
  };

  const navTo = (sec: Section) => { setSection(sec); };
  const filterSev = (sev: string) => { setSevFilter(sev); setCatFilter('ALL'); setSection('findings'); };
  const filterCatSidebar = (cat: string) => { setCatFilter(cat); setSevFilter('ALL'); setSection('findings'); };

  const handleFix = async (f: Finding) => {
    if (!f.file || !f.codeSnippet || !f.suggestion) return;
    
    // Check if it's a GitHub repo and user isn't logged in
    const isGithub = result.url.includes('github.com');
    if (isGithub && status === 'unauthenticated') {
      setShowAuthModal(true);
      return;
    }

    setFixingId(f.id);
    try {
      const res = await fetch('/api/apply-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filePath: f.file, 
          snippet: f.codeSnippet, 
          replacement: f.suggestion,
          repoUrl: isGithub ? result.url : undefined
        })
      });
      if (res.ok) {
         setFixedSet(new Set(fixedSet).add(f.id));
      } else {
         const data = await res.json();
         alert(`Manual fix required: ${data.error || 'Failed exact match.'}`);
      }
    } catch (err) {
      alert('Error applying fix connection');
    } finally {
      setFixingId(null);
    }
  };

  // --- Export ---
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const a = document.createElement('a'); a.href = dataStr;
    a.download = `code_review_${result.repoName.replace('/', '_')}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  const handleExportHtml = () => {
    import('../utils/exportHtml').then(({ generateHtmlReport }) => {
      const blob = new Blob([generateHtmlReport(result)], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `code_review_${result.repoName.replace('/', '_')}.html`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div style={styles.page}>
      {/* ========== SIDEBAR ========== */}
      <div style={styles.sidebar}>
        <div style={styles.sbSection}>REPORT</div>
        <SbItem active={section === 'summary'} onClick={() => navTo('summary')} icon="≡" label="Repository Summary" />
        <SbItem active={section === 'issues'} onClick={() => navTo('issues')} icon="◉" label="Issue Summary" />
        <SbItem active={section === 'findings'} onClick={() => navTo('findings')} icon="💬" label="Detailed Findings" count={filteredFindings.length} />
        <SbItem active={section === 'correlation'} onClick={() => navTo('correlation')} icon="⑂" label="Correlation Mapping" />

        <div style={{ ...styles.sbSection, marginTop: 16 }}>FILTER BY SEVERITY</div>
        <SbItem active={sevFilter === 'ALL' && section === 'findings'} onClick={() => filterSev('ALL')} dot="#888" label="All Issues" count={result.findings.length} />
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] as Severity[]).map(sev => (
          <SbItem key={sev} active={sevFilter === sev} onClick={() => filterSev(sev)} dot={SEV_COLORS[sev].dot} label={sev.charAt(0) + sev.slice(1).toLowerCase()} count={sevCounts[sev] || 0} />
        ))}

        <div style={{ ...styles.sbSection, marginTop: 16 }}>FILTER BY CATEGORY</div>
        {Object.entries(catCounts).map(([cat, count]) => (
          <SbItem key={cat} active={catFilter === cat} onClick={() => filterCatSidebar(cat)} dot={CAT_COLORS[cat] || '#888'} label={cat.replace('_', ' ')} count={count} />
        ))}

        {/* Export Buttons */}
        <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={handleExportJson} style={styles.exportBtn}>📥 Export JSON</button>
          <button onClick={handleExportHtml} style={{ ...styles.exportBtn, borderColor: '#10b981', color: '#10b981' }}>📄 Export HTML</button>
        </div>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div style={styles.main}>

        {/* --- SUMMARY --- */}
        {section === 'summary' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{result.repoName}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{result.url} &middot; analyzed {result.createdAt?.slice(0, 10)}</div>
            </div>

            <div style={styles.summaryGrid}>
              <StatCard label="Total files analyzed" value={result.totalFiles} />
              <StatCard label="Total lines of code" value={result.totalLines} />
              <StatCard label="Languages detected" value={languagesBreakdown.length} />
              <StatCard label="Total issues found" value={result.findings.length} valueColor="#ff6b6b" />
            </div>

            {/* Language Bar (Pills) */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {languagesBreakdown.map(l => (
                <span key={l.lang} style={{ padding: '6px 14px', border: '1px solid #334155', borderRadius: 99, fontSize: 13, color: '#e2e8f0', background: 'transparent' }}>
                  {l.lang} <span style={{ color: '#94a3b8', marginLeft: 4 }}>{l.pct}%</span>
                </span>
              ))}
            </div>

            {/* Score Section */}
            <div style={styles.scoreSection}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 28, fontWeight: 600, color: scoreColor, minWidth: 48 }}>{score}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                    Overall repository risk score &nbsp;&middot;&nbsp; <span style={{ color: scoreColor }}>{riskLabel}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 3, height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ background: '#E24B4A', width: `${Math.round((sevCounts.CRITICAL / total) * 100)}%`, height: '100%' }} />
                    <div style={{ background: '#BA7517', width: `${Math.round((sevCounts.HIGH / total) * 100)}%`, height: '100%' }} />
                    <div style={{ background: '#185FA5', width: `${Math.round((sevCounts.MEDIUM / total) * 100)}%`, height: '100%' }} />
                    <div style={{ background: '#3B6D11', width: `${Math.round((sevCounts.LOW / total) * 100)}%`, height: '100%' }} />
                    <div style={{ background: '#534AB7', width: `${Math.max(0, 100 - Math.round((sevCounts.CRITICAL / total) * 100) - Math.round((sevCounts.HIGH / total) * 100) - Math.round((sevCounts.MEDIUM / total) * 100) - Math.round((sevCounts.LOW / total) * 100))}%`, height: '100%' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[['Critical', '#E24B4A', sevCounts.CRITICAL], ['High', '#BA7517', sevCounts.HIGH], ['Medium', '#185FA5', sevCounts.MEDIUM], ['Low', '#3B6D11', sevCounts.LOW], ['Info', '#534AB7', sevCounts.INFORMATIONAL]].map(([l, c, n]) => (
                      <span key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: String(c) }} />{String(l)} {String(n)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Hotspots */}
            {hotspots.length > 0 && (
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 20 }}>
                <strong style={{ color: '#e2e8f0' }}>Risk hotspots:</strong>&nbsp;&nbsp;
                {hotspots.map(([f]) => (
                  <code key={f} style={{ fontFamily: 'monospace', fontSize: 12, background: '#1e293b', padding: '1px 6px', borderRadius: 4, marginRight: 8 }}>{f}</code>
                ))}
              </div>
            )}

            {/* Architecture Review */}
            {result.summary.architectureReview && (
              <div style={{ border: '1px solid #334155', borderLeft: '4px solid #f59e0b', borderRadius: 8, padding: 20, marginBottom: 20, background: '#1a1500' }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#fbbf24' }}>Architecture Review</div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
                  {result.summary.architectureReview.split('\n').map((para, idx) => {
                    const line = para.trim();
                    if (!line) return null;
                    // match parts wrapped in **bold**
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <div key={idx} style={{ marginBottom: 10 }}>
                        {parts.map((p, pIdx) => {
                          if (p.startsWith('**') && p.endsWith('**')) {
                            return <strong key={pIdx} style={{ color: '#e2e8f0', fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
                          }
                          return <span key={pIdx}>{p}</span>;
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Summary */}
            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
              <strong style={{ color: '#e2e8f0' }}>AI Summary:</strong> {result.summary.recommendation}
            </div>
          </div>
        )}

        {/* --- ISSUE SUMMARY --- */}
        {section === 'issues' && (
          <div>
            <div style={styles.isummaryGrid}>
              {[['critical', 'Critical', sevCounts.CRITICAL], ['high', 'High', sevCounts.HIGH], ['medium', 'Medium', sevCounts.MEDIUM], ['low', 'Low', sevCounts.LOW], ['info', 'Informational', sevCounts.INFORMATIONAL]].map(([cls, label, num]) => (
                <div key={String(cls)} style={{ ...styles.isCard, ...(isCardStyles as any)[String(cls)] }}>
                  <div style={{ fontSize: 22, fontWeight: 500 }}>{String(num)}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{String(label)}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={styles.chartBox}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: '#94a3b8' }}>By category</div>
                {Object.entries(catCounts).map(([k, v]) => (
                  <BarRow key={k} label={k.replace('_', ' ')} value={v} max={maxCat} color={CAT_COLORS[k] || '#888'} />
                ))}
              </div>
              <div style={styles.chartBox}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: '#94a3b8' }}>By file</div>
                {Object.entries(fileCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => (
                  <BarRow key={k} label={k.split('/').pop() || k} value={v} max={maxFile} color="#185FA5" mono />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- DETAILED FINDINGS --- */}
        {section === 'findings' && (
          <div>
            <div style={styles.filterBar}>
              <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 4 }}>Severity:</span>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
                <button key={s} onClick={() => { setSevFilter(s); setCatFilter('ALL'); }} style={{ ...styles.fbtn, ...(sevFilter === s ? styles.fbtnActive : {}) }}>{s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}</button>
              ))}
              <div style={{ width: 1, height: 16, background: '#334155', margin: '0 4px' }} />
              <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 4 }}>Category:</span>
              <button onClick={() => { setCatFilter('ALL'); }} style={{ ...styles.fbtn, ...(catFilter === 'ALL' ? styles.fbtnActive : {}) }}>All</button>
              {Object.keys(catCounts).map(c => (
                <button key={c} onClick={() => { setCatFilter(c); setSevFilter('ALL'); }} style={{ ...styles.fbtn, ...(catFilter === c ? styles.fbtnActive : {}) }}>{c.replace('_', ' ')}</button>
              ))}
            </div>

            {filteredFindings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No issues match the selected filters.</div>
            ) : (
              filteredFindings.map((f, i) => {
                const fid = f.id || `ISS-${String(i + 1).padStart(3, '0')}`;
                const isOpen = openCards.has(fid);
                return (
                  <div key={fid} style={{ ...styles.findingCard, ...(isOpen ? { background: '#0f172a' } : {}) }}>
                    <div style={styles.findingHead} onClick={() => toggle(fid)}>
                      <span style={{ ...styles.badge, background: SEV_COLORS[f.severity]?.bg, color: SEV_COLORS[f.severity]?.text }}>{f.severity}</span>
                      <span style={styles.catTag}>{f.category.replace('_', ' ')}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{f.title}</div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', marginTop: 2 }}>
                          {f.file} &nbsp;&middot;&nbsp; {f.line ? `L${f.line}` : ''} &nbsp;&middot;&nbsp; {f.fn || ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b', flexShrink: 0 }}>{fid}</span>
                      <span style={{ fontSize: 11, color: '#64748b', transition: 'transform .2s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                    </div>
                    {isOpen && (
                      <div style={styles.findingBody}>
                        <div style={styles.metaRow}>
                          <MetaItem label="File" value={f.file} />
                          <MetaItem label="Lines" value={f.line ? `L${f.line}${f.endLine ? '–L' + f.endLine : ''}` : 'N/A'} />
                          <MetaItem label="Function" value={f.fn || 'N/A'} />
                        </div>
                        <FbSection label="DESCRIPTION"><div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{f.description}</div></FbSection>
                        {f.codeSnippet && (
                          <FbSection label="AFFECTED CODE">
                            <CodeBlock code={f.codeSnippet} startLine={f.line} />
                          </FbSection>
                        )}
                        {f.suggestion && (
                          <div style={{ position: 'relative' }}>
                            <FbSection label="SUGGESTED IMPROVEMENT">
                               <div style={{ position: 'absolute', top: -5, right: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                                 {fixedSet.has(f.id) ? (
                                   <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>✅ Fix Applied</span>
                                 ) : (
                                   <>
                                     {result.url.includes('github.com') && status === 'unauthenticated' && (
                                       <span style={{ fontSize: 10, color: '#94a3b8' }}>GitHub login required</span>
                                     )}
                                     <button 
                                       onClick={() => handleFix(f)} 
                                       disabled={fixingId === f.id || !f.codeSnippet}
                                       style={styles.fixBtn}
                                     >
                                       {fixingId === f.id ? 'Fixing...' : (result.url.includes('github.com') ? '🤖 Auto-Fix (GitHub)' : '🔧 Apply Local Fix')}
                                     </button>
                                   </>
                                 )}
                               </div>
                              <CodeBlock code={f.suggestion} startLine={f.line} isFix />
                            </FbSection>
                          </div>
                        )}
                        {f.impact && <FbSection label="IMPACT"><div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{f.impact}</div></FbSection>}
                        {f.relatedIssues && f.relatedIssues.length > 0 && (
                          <FbSection label="RELATED ISSUES">
                            <div>{f.relatedIssues.map(ri => <span key={ri} style={styles.corrChip}>#{ri}</span>)}</div>
                          </FbSection>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- CORRELATION MAPPING --- */}
        {section === 'correlation' && (
          <div>
            {(!result.correlations || result.correlations.length === 0) ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No correlation clusters detected.</div>
            ) : (
              <>
                {/* Interactive Dependency Graph */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 10 }}>📊 Structural Dependency Graph</div>
                  <DependencyGraph correlations={result.correlations} />
                </div>

                {/* Correlation Cards */}
                {result.correlations.map((c, i) => (
                  <div key={c.id || i} style={styles.clusterCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{c.id || `CLU-${String.fromCharCode(65 + i)}`} — {c.title}</div>
                      <span style={{ ...styles.badge, background: SEV_COLORS[c.severity]?.bg, color: SEV_COLORS[c.severity]?.text }}>{c.severity}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 10 }}>{c.description}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{c.relationship}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {c.issues.map(iss => <span key={iss} style={styles.corrChip}>#{iss}</span>)}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Affected components:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {c.files.map(f => <span key={f} style={styles.fileChip}>{f}</span>)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* GitHub Auth Modal */}
      {showAuthModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
           <div style={{ background: '#1e293b', border: '1px solid #334155', padding: 24, borderRadius: 12, maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 12, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🔒</span> GitHub Authorization
              </h3>
              <p style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
                This is a live GitHub repository. To Auto-Fix this file directly with a commit, you must authorize AI Code Review Copilot to push changes on your behalf.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAuthModal(false)} style={{ padding: '8px 16px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', cursor: 'pointer', borderRadius: 6 }}>Cancel</button>
                <button onClick={() => signIn('github')} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 6, fontWeight: 500 }}>Login with GitHub</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}

// ====================== Sub-Components ======================

function CodeBlock({ code, startLine = 1, isFix = false }: { code: string; startLine?: number; isFix?: boolean }) {
  const lines = code.trim().split('\n');
  return (
    <pre style={isFix ? styles.suggestBlock : styles.codeBlock}>
      {lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          <span style={{ minWidth: 32, flexShrink: 0, color: isFix ? '#4ade80' : '#475569', userSelect: 'none', textAlign: 'right', paddingRight: 10, borderRight: `1px solid ${isFix ? '#22c55e' : '#334155'}`, marginRight: 10 }}>{startLine + i}</span>
          <span>{line}</span>
        </div>
      ))}
    </pre>
  );
}

function SbItem({ active, onClick, icon, label, count, dot }: { active?: boolean; onClick: () => void; icon?: string; label: string; count?: number; dot?: string }) {
  return (
    <div onClick={onClick} style={{ ...styles.sbItem, ...(active ? styles.sbItemActive : {}) }}>
      {dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
      {icon && !dot && <span style={{ flexShrink: 0, fontSize: 14 }}>{icon}</span>}
      {label}
      {count !== undefined && <span style={styles.sbCount}>{count}</span>}
    </div>
  );
}

function StatCard({ label, value, valueColor, subtext }: { label: string; value: string | number; valueColor?: string; subtext?: string }) {
  return (
    <div style={styles.scard}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: valueColor || '#e2e8f0', marginBottom: subtext ? 4 : 0 }}>{value}</div>
      {subtext && <div style={{ fontSize: 10, color: '#64748b' }}>{subtext}</div>}
    </div>
  );
}

function BarRow({ label, value, max, color, mono }: { label: string; value: number; max: number; color: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
      <div style={{ fontSize: mono ? 11 : 12, color: '#94a3b8', width: mono ? 120 : 100, flexShrink: 0, fontFamily: mono ? 'monospace' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round((value / max) * 100)}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', minWidth: 12 }}>{value}</div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return <div style={{ fontSize: 12 }}><span style={{ color: '#64748b' }}>{label}: </span><span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{value}</span></div>;
}

function FbSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, letterSpacing: 0.5 }}>{label}</div>
      {children}
    </div>
  );
}

// ====================== Dependency Graph ======================

const EDGE_COLORS: Record<string, string> = {
  CRITICAL: '#E24B4A', HIGH: '#BA7517', MEDIUM: '#3b82f6', LOW: '#3B6D11', INFORMATIONAL: '#534AB7'
};

interface GNode { id: string; x: number; y: number; vx: number; vy: number; radius: number; color: string; }
interface GEdge { source: string; target: string; color: string; label: string; }

function DependencyGraph({ correlations }: { correlations: Correlation[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GNode[]>([]);
  const edgesRef = useRef<GEdge[]>([]);
  const dragRef = useRef<{ node: GNode | null; offsetX: number; offsetY: number }>({ node: null, offsetX: 0, offsetY: 0 });
  const hoverRef = useRef<GNode | null>(null);
  const animRef = useRef<number>(0);

  const CW = 1200, CH = 600; // Canvas logical size

  // Build graph data from correlations — circular initial layout
  useEffect(() => {
    const nodeMap = new Map<string, GNode>();
    const edgeSet = new Set<string>(); // deduplicate edges
    const edges: GEdge[] = [];

    correlations.forEach(c => {
      const files = c.files || [];
      files.forEach(f => {
        const short = f.split('/').pop() || f;
        if (!nodeMap.has(short)) {
          nodeMap.set(short, {
            id: short, x: 0, y: 0, vx: 0, vy: 0, radius: 5, color: '#3b82f6'
          });
        }
        const n = nodeMap.get(short)!;
        n.radius = Math.min(16, n.radius + 1.5);
        // Use highest severity color
        const sevOrder = ['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const curIdx = sevOrder.indexOf(Object.entries(EDGE_COLORS).find(([, v]) => v === n.color)?.[0] || '');
        const newIdx = sevOrder.indexOf(c.severity);
        if (newIdx > curIdx) n.color = EDGE_COLORS[c.severity] || '#3b82f6';
      });
      // Deduplicated edges
      for (let i = 0; i < files.length; i++) {
        for (let j = i + 1; j < files.length; j++) {
          const a = files[i].split('/').pop() || files[i];
          const b = files[j].split('/').pop() || files[j];
          const key = [a, b].sort().join('|');
          if (a !== b && !edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ source: a, target: b, color: EDGE_COLORS[c.severity] || '#3b82f6', label: c.title });
          }
        }
      }
    });

    // Circular initial layout — prevents random clustering
    const allNodes = Array.from(nodeMap.values());
    const cx = CW / 2, cy = CH / 2;
    const radius = Math.min(CW, CH) * 0.38;
    allNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / allNodes.length;
      n.x = cx + radius * Math.cos(angle);
      n.y = cy + radius * Math.sin(angle);
    });

    nodesRef.current = allNodes;
    edgesRef.current = edges;
  }, [correlations]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (nodes.length === 0) return;

    // Force simulation
    const REPULSION = 12000;
    const SPRING = 0.003;
    const DAMPING = 0.82;
    const REST_LEN = 200;
    const CENTER_PULL = 0.001;

    for (const n of nodes) { n.vx = 0; n.vy = 0; }

    // Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx; nodes[i].vy -= fy;
        nodes[j].vx += fx; nodes[j].vy += fy;
      }
    }

    // Spring attraction along edges
    for (const e of edges) {
      const a = nodes.find(n => n.id === e.source);
      const b = nodes.find(n => n.id === e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = SPRING * (dist - REST_LEN);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }

    // Gentle center gravity to prevent drifting off
    for (const n of nodes) {
      n.vx += (CW / 2 - n.x) * CENTER_PULL;
      n.vy += (CH / 2 - n.y) * CENTER_PULL;
    }

    // Apply velocity, constrain to bounds
    for (const n of nodes) {
      if (dragRef.current.node === n) continue;
      n.x += n.vx * DAMPING;
      n.y += n.vy * DAMPING;
      n.x = Math.max(60, Math.min(CW - 60, n.x));
      n.y = Math.max(40, Math.min(CH - 40, n.y));
    }

    // Clear
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, CW, CH);

    // Draw edges
    for (const e of edges) {
      const a = nodes.find(n => n.id === e.source);
      const b = nodes.find(n => n.id === e.target);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = e.color + '44';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw nodes
    const hoveredNode = hoverRef.current;
    for (const n of nodes) {
      const isHovered = hoveredNode === n;
      const isConnected = hoveredNode && edges.some(e => 
        (e.source === hoveredNode.id && e.target === n.id) || (e.target === hoveredNode.id && e.source === n.id)
      );
      const dimmed = hoveredNode && !isHovered && !isConnected;
      
      // Glow for hovered/connected nodes
      if (isHovered || isConnected) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = n.color + '33';
        ctx.fill();
      }
      // Node circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fillStyle = dimmed ? (n.color + '44') : (isHovered ? '#fff' : n.color);
      ctx.fill();
      ctx.strokeStyle = dimmed ? '#1e293b44' : '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label — always show but dim non-hovered
      ctx.fillStyle = dimmed ? '#64748b44' : (isHovered || isConnected ? '#f1f5f9' : '#94a3b8');
      ctx.font = isHovered ? 'bold 11px monospace' : '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(n.id, n.x, n.y + n.radius + 13);
    }

    // Highlight edges connected to hovered node
    if (hoveredNode) {
      for (const e of edges) {
        if (e.source !== hoveredNode.id && e.target !== hoveredNode.id) continue;
        const a = nodes.find(n => n.id === e.source);
        const b = nodes.find(n => n.id === e.target);
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = e.color + 'cc';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }

    // Tooltip on hover
    if (hoveredNode) {
      const n = hoveredNode;
      const relEdges = edges.filter(e => e.source === n.id || e.target === n.id);
      const connections = relEdges.map(e => e.source === n.id ? e.target : e.source);
      const uniqueConns = [...new Set(connections)];
      const tipLines = [
        `📄 ${n.id}`,
        `🔗 ${uniqueConns.length} connection${uniqueConns.length !== 1 ? 's' : ''}`,
        ...relEdges.slice(0, 4).map(e => `  ↔ ${e.label.substring(0, 40)}`)
      ];
      if (relEdges.length > 4) tipLines.push(`  ... +${relEdges.length - 4} more`);
      
      ctx.font = '11px monospace';
      const maxW = Math.max(...tipLines.map(l => ctx.measureText(l).width)) + 20;
      const tipH = tipLines.length * 16 + 14;
      let tx = n.x + 20, ty = n.y - tipH / 2;
      if (tx + maxW > CW) tx = n.x - maxW - 20;
      if (ty < 4) ty = 4;
      if (ty + tipH > CH - 4) ty = CH - tipH - 4;

      ctx.fillStyle = '#0f172aee';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, maxW, tipH, 6);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'left';
      tipLines.forEach((l, i) => ctx.fillText(l, tx + 10, ty + 17 + i * 16));
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Scale mouse coords from CSS size to canvas logical size
  const getNode = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    return nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) <= n.radius + 6) || null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={CW}
      height={CH}
      style={{ width: '100%', height: 480, borderRadius: 8, border: '1px solid #1e293b', cursor: 'default', background: '#0b1120' }}
      onMouseDown={(e) => {
        const n = getNode(e);
        if (n) {
          const canvas = canvasRef.current!;
          const rect = canvas.getBoundingClientRect();
          const scaleX = CW / rect.width;
          const scaleY = CH / rect.height;
          dragRef.current = { node: n, offsetX: (e.clientX - rect.left) * scaleX - n.x, offsetY: (e.clientY - rect.top) * scaleY - n.y };
        }
      }}
      onMouseMove={(e) => {
        if (dragRef.current.node) {
          const canvas = canvasRef.current!;
          const rect = canvas.getBoundingClientRect();
          const scaleX = CW / rect.width;
          const scaleY = CH / rect.height;
          dragRef.current.node.x = (e.clientX - rect.left) * scaleX - dragRef.current.offsetX;
          dragRef.current.node.y = (e.clientY - rect.top) * scaleY - dragRef.current.offsetY;
        }
        hoverRef.current = getNode(e);
      }}
      onMouseUp={() => { dragRef.current = { node: null, offsetX: 0, offsetY: 0 }; }}
      onMouseLeave={() => { dragRef.current = { node: null, offsetX: 0, offsetY: 0 }; hoverRef.current = null; }}
    />
  );
}

// ====================== Styles ======================

const isCardStyles = {
  critical: { background: '#3d1515', borderColor: '#7f1d1d' },
  high:     { background: '#3d2c10', borderColor: '#92400e' },
  medium:   { background: '#152940', borderColor: '#1e40af' },
  low:      { background: '#1a3012', borderColor: '#166534' },
  info:     { background: '#1e1740', borderColor: '#4c1d95' },
};

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh', gap: 0 },
  sidebar: { borderRight: '1px solid #1e293b', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 2, background: '#0b1120', position: 'sticky' as const, top: 0, height: '100vh', overflowY: 'auto' },
  main: { padding: '20px 24px', overflowY: 'auto', background: '#0f172a' },
  sbSection: { fontSize: 11, fontWeight: 500, color: '#64748b', padding: '0 16px', margin: '10px 0 4px', letterSpacing: '0.04em' },
  sbItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 16px', cursor: 'pointer', fontSize: 13, color: '#94a3b8', borderLeft: '2px solid transparent', transition: 'all 0.15s' },
  sbItemActive: { color: '#e2e8f0', borderLeft: '2px solid #e2e8f0', background: '#1e293b', fontWeight: 500 },
  sbCount: { marginLeft: 'auto', fontSize: 11, background: '#1e293b', borderRadius: 99, padding: '1px 7px', color: '#94a3b8' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 },
  scard: { background: '#1e293b', borderRadius: 6, padding: '12px 16px', border: '1px solid #334155' },
  scoreSection: { background: '#1e293b', borderRadius: 8, padding: '16px 20px', marginBottom: 20, border: '1px solid #334155' },
  isummaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 },
  isCard: { borderRadius: 6, padding: '10px 14px', border: '1px solid transparent' },
  chartBox: { background: '#1e293b', borderRadius: 8, padding: '16px', border: '1px solid #334155' },
  filterBar: { display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 16, alignItems: 'center' },
  fbtn: { fontSize: 12, padding: '3px 10px', borderRadius: 99, border: '1px solid #334155', background: 'none', cursor: 'pointer', color: '#94a3b8', transition: 'all 0.15s' },
  fbtnActive: { background: '#1e293b', color: '#e2e8f0', borderColor: '#94a3b8', fontWeight: 500 },
  findingCard: { border: '1px solid #1e293b', borderRadius: 8, marginBottom: 8, overflow: 'hidden', background: '#0f172a' },
  findingHead: { padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 },
  badge: { fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 6, flexShrink: 0, marginTop: 1 },
  catTag: { fontSize: 10, padding: '2px 7px', borderRadius: 6, background: '#1e293b', color: '#94a3b8', flexShrink: 0, marginTop: 1 },
  findingBody: { padding: '14px 16px', borderTop: '1px solid #1e293b' },
  metaRow: { display: 'flex', gap: 24, flexWrap: 'wrap' as const, marginBottom: 14 },
  codeBlock: { fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, background: '#020617', color: '#f8fafc', borderRadius: 6, padding: '10px 0', overflow: 'auto' as const, margin: 0 },
  suggestBlock: { fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, background: '#052e16', color: '#86efac', borderRadius: 6, padding: '10px 0', overflow: 'auto' as const, margin: 0 },
  corrChip: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', margin: 2, cursor: 'pointer' },
  clusterCard: { border: '1px solid #1e293b', borderRadius: 8, padding: '16px 18px', marginBottom: 10, background: '#0f172a' },
  fileChip: { fontSize: 11, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 6, background: '#1e293b', color: '#94a3b8' },
  exportBtn: { fontSize: 12, padding: '6px 12px', borderRadius: 4, border: '1px solid #3b82f6', background: 'none', cursor: 'pointer', color: '#3b82f6', transition: 'all 0.2s' },
  fixBtn: { fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: '1px solid #22c55e', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', cursor: 'pointer', transition: 'all 0.2s' }
};
