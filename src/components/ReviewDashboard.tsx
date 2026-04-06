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

type Section = 'summary' | 'issues' | 'findings' | 'correlation' | 'hotspots';

interface Props { result: ReviewResult; }

export default function ReviewDashboard({ result }: Props) {
  const { data: session, status } = useSession();
  const [section, setSection] = useState<Section>('summary');
  const [sevFilter, setSevFilter] = useState<string>('ALL');
  const [catFilter, setCatFilter] = useState<string>('ALL');
  const [confThreshold, setConfThreshold] = useState<number>(0); // 0 = show all
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixedSet, setFixedSet] = useState<Set<string>>(new Set());
  const [showAuthModal, setShowAuthModal] = useState(false);

  // --- Copilot Chat State ---
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'ai'; text: string}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      const cf = (f.confidence ?? 100) >= confThreshold;
      return sv && ct && cf;
    });
  }, [result.findings, sevFilter, catFilter, confThreshold]);

  const suppressedByConf = result.findings.length - filteredFindings.length - (
    result.findings.filter(f => {
      const sv = sevFilter === 'ALL' || f.severity === sevFilter;
      const ct = catFilter === 'ALL' || f.category === catFilter;
      return sv && ct;
    }).length - filteredFindings.length
  );

  const total = result.findings.length || 1;
  const score = result.summary.overallScore;
  const scoreColor = score > 75 ? '#86efac' : score > 50 ? '#fbbf24' : '#ff6b6b';
  const qualityLabel = score > 75 ? 'Excellent Health' : score > 50 ? 'Moderate Issues' : score > 25 ? 'Needs Rework' : 'Critical Risk';

  const fileRisk = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    result.findings.forEach(f => {
      map[f.file] = map[f.file] || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFORMATIONAL: 0 };
      map[f.file][f.severity] = (map[f.file][f.severity] || 0) + 1;
    });
    return Object.entries(map)
      .map(([file, counts]) => ({
        file,
        CRITICAL: counts.CRITICAL || 0,
        HIGH: counts.HIGH || 0,
        MEDIUM: counts.MEDIUM || 0,
        LOW: counts.LOW || 0,
        INFORMATIONAL: counts.INFORMATIONAL || 0,
        total: Object.values(counts).reduce((a, b) => a + b, 0)
      }))
      .sort((a, b) => (b.CRITICAL - a.CRITICAL) || (b.HIGH - a.HIGH) || (b.total - a.total))
      .slice(0, 10);
  }, [result.findings]);
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
          replacement: f.fixSnippet || f.suggestion,
          repoUrl: isGithub ? result.url : undefined,
          line: f.line  // ← pass line number for fallback matching
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
  const handleExportPdf = () => {
    window.print();
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
        <SbItem active={section === 'hotspots'} onClick={() => navTo('hotspots')} icon="🔥" label="Risk Hotspots" count={fileRisk.length} />

        {/* Confidence Filter */}
        <div style={{ ...styles.sbSection, marginTop: 16 }}>CONFIDENCE FILTER</div>
        <div style={{ padding: '4px 16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 6 }}>
            <span>Min confidence</span>
            <span style={{ color: confThreshold > 0 ? '#f97316' : '#64748b', fontWeight: 600 }}>{confThreshold}%</span>
          </div>
          <input
            type="range" min={0} max={95} step={5}
            value={confThreshold}
            onChange={e => setConfThreshold(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }}
          />
          {confThreshold > 0 && (
            <div style={{ fontSize: 10, color: '#f97316', marginTop: 4 }}>
              {result.findings.filter(f => (f.confidence ?? 100) < confThreshold).length} low-confidence issues hidden
            </div>
          )}
        </div>
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
        <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 6 }} className="export-buttons">
          <button onClick={handleExportJson} style={styles.exportBtn}>📥 Export JSON</button>
          <button onClick={handleExportHtml} style={{ ...styles.exportBtn, borderColor: '#10b981', color: '#10b981' }}>📄 Export HTML</button>
          <button onClick={handleExportPdf} style={{ ...styles.exportBtn, borderColor: '#fbbf24', color: '#fbbf24' }}>🖨️ Export PDF</button>
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
              {/* @ts-ignore */}
              <StatCard label="Analysis Time" value={result.summary?.durationMs ? (result.summary.durationMs / 1000).toFixed(1) + 's' : 'N/A'} />
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
                    Overall code quality score &nbsp;&middot;&nbsp; <span style={{ color: scoreColor }}>{qualityLabel}</span>
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

            {/* Score Breakdown Explanation */}
            <div style={{ marginTop: 16, marginBottom: 32, padding: '12px 16px', background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Scoring Formula Breakdown</div>
              <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#cbd5e1', lineHeight: 1.6 }}>
                <div>Score = 100 - (Critical×15 + High×8 + Medium×4 + Low×1)</div>
                <div>Penalty = ({sevCounts.CRITICAL}×15 + {sevCounts.HIGH}×8 + {sevCounts.MEDIUM}×4 + {sevCounts.LOW}×1)</div>
                <div>Final = <strong style={{ color: scoreColor }}>{score}/100</strong></div>
              </div>
            </div>

            {/* Risk Hotspots Heatmap */}
            {fileRisk.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>🔥 Risk Hotspots Heatmap</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {fileRisk.map(fr => (
                    <div key={fr.file} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => { setSevFilter('ALL'); setCatFilter('ALL'); setSection('findings'); }}>
                      <div style={{ fontSize: 12, color: '#cbd5e1', width: 200, flexShrink: 0, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fr.file.split('/').pop() || fr.file}
                      </div>
                      <div style={{ flex: 1, display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#1e293b' }}>
                        <div style={{ background: '#E24B4A', width: `${(fr.CRITICAL / fr.total) * 100}%` }} />
                        <div style={{ background: '#BA7517', width: `${(fr.HIGH / fr.total) * 100}%` }} />
                        <div style={{ background: '#185FA5', width: `${(fr.MEDIUM / fr.total) * 100}%` }} />
                        <div style={{ background: '#3B6D11', width: `${(fr.LOW / fr.total) * 100}%` }} />
                        <div style={{ background: '#534AB7', width: `${(fr.INFORMATIONAL / fr.total) * 100}%` }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', width: 24, textAlign: 'right' }}>{fr.total}</div>
                    </div>
                  ))}
                </div>
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

            {confThreshold > 0 && (
              <div style={{ padding: '6px 12px', background: '#1a0f00', border: '1px solid #f9731633', borderRadius: 6, fontSize: 11, color: '#f97316', marginBottom: 8 }}>
                🔍 Confidence filter active ({confThreshold}%+) — {result.findings.filter(f => (f.confidence ?? 100) < confThreshold).length} low-confidence issues hidden
              </div>
            )}
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
                        {(f.suggestion || f.fixSnippet) && (
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
                              {f.suggestion && (
                                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: f.fixSnippet ? 12 : 0 }}>
                                  {f.suggestion}
                                </div>
                              )}
                              {f.fixSnippet && (
                                <CodeBlock code={f.fixSnippet} startLine={f.line} isFix />
                              )}
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                      {c.files.map(f => <span key={f} style={styles.fileChip}>{f}</span>)}
                    </div>
                    {/* Render exact member findings */}
                    {c.issues && c.issues.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, paddingLeft: 12, borderLeft: '2px solid #334155' }}>
                        {c.issues.map(iss => {
                          const memberFinding = result.findings.find(x => x.id === iss);
                          if (!memberFinding) return null;
                          return (
                            <div key={iss} style={{ background: '#0b1120', padding: '10px 14px', borderRadius: 6, border: '1px solid #1e293b' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ ...styles.badge, background: SEV_COLORS[memberFinding.severity]?.bg, color: SEV_COLORS[memberFinding.severity]?.text, padding: '2px 6px', fontSize: 10 }}>{memberFinding.severity}</span>
                                <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{memberFinding.title}</span>
                              </div>
                              <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>
                                {memberFinding.file} : L{memberFinding.line}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* --- RISK HOTSPOTS --- */}
        {section === 'hotspots' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>🔥 Risk Hotspots</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Top {fileRisk.length} files ranked by severity-weighted risk score (Critical×15 + High×8 + Medium×4 + Low×1)</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fileRisk.map((fr, i) => {
                const riskScore = fr.CRITICAL * 15 + fr.HIGH * 8 + fr.MEDIUM * 4 + fr.LOW * 1;
                const maxScore = (fileRisk[0]?.CRITICAL ?? 0) * 15 + (fileRisk[0]?.HIGH ?? 0) * 8 + (fileRisk[0]?.MEDIUM ?? 0) * 4 + (fileRisk[0]?.LOW ?? 0) * 1 || 1;
                const pct = Math.round((riskScore / maxScore) * 100);
                const topSev = fr.CRITICAL > 0 ? 'CRITICAL' : fr.HIGH > 0 ? 'HIGH' : fr.MEDIUM > 0 ? 'MEDIUM' : 'LOW';
                return (
                  <div
                    key={fr.file}
                    onClick={() => { setCatFilter('ALL'); setSevFilter('ALL'); setSection('findings'); }}
                    style={{
                      background: '#0b1120', border: '1px solid #1e293b', borderRadius: 10,
                      padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = SEV_COLORS[topSev]?.dot || '#334155')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      {/* Rank */}
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, background: i === 0 ? '#3d1515' : i === 1 ? '#3d2c10' : '#1a2a1a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: i === 0 ? '#ff6b6b' : i === 1 ? '#fbbf24' : '#86efac', flexShrink: 0
                      }}>
                        #{i + 1}
                      </div>
                      {/* File path */}
                      <div style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fr.file}
                      </div>
                      {/* Risk score */}
                      <div style={{ fontSize: 12, fontWeight: 700, color: SEV_COLORS[topSev]?.text || '#94a3b8', flexShrink: 0 }}>
                        Risk: {riskScore}
                      </div>
                    </div>
                    {/* Heat bar */}
                    <div style={{ height: 4, background: '#1e293b', borderRadius: 2, marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: SEV_COLORS[topSev]?.text || '#94a3b8', transition: 'width 0.3s' }} />
                    </div>
                    {/* Severity chips */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {fr.CRITICAL > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#3d1515', color: '#ff6b6b', fontWeight: 600 }}>⬤ {fr.CRITICAL} Critical</span>}
                      {fr.HIGH > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#3d2c10', color: '#fbbf24', fontWeight: 600 }}>⬤ {fr.HIGH} High</span>}
                      {fr.MEDIUM > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#152940', color: '#60a5fa', fontWeight: 600 }}>⬤ {fr.MEDIUM} Medium</span>}
                      {fr.LOW > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#1a3012', color: '#86efac', fontWeight: 600 }}>⬤ {fr.LOW} Low</span>}
                      {fr.INFORMATIONAL > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#1e1740', color: '#a78bfa' }}>⬤ {fr.INFORMATIONAL} Info</span>}
                    </div>
                  </div>
                );
              })}
            </div>
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
      {/* ===== AI COPILOT CHAT PANEL ===== */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1100 }} className="copilot-chat">
        {!chatOpen ? (
          <button
            onClick={() => setChatOpen(true)}
            style={{
              width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            🤖
          </button>
        ) : (
          <div style={{
            width: 420, height: 520, background: '#0f172a', border: '1px solid #334155',
            borderRadius: 16, display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)', overflow: 'hidden',
          }}>
            {/* Chat Header */}
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid #1e293b',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #1e1b4b, #0f172a)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>AI Copilot</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Ask about findings</div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginTop: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                  <div>Ask me anything about this review!</div>
                  <div style={{ fontSize: 11, marginTop: 8, color: '#475569' }}>e.g. "Which file should I fix first?" or "Explain the JWT issue"</div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? '#3b82f6' : '#1e293b',
                  color: msg.role === 'user' ? '#fff' : '#cbd5e1',
                  fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>
                  {msg.text}
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: '#1e293b', color: '#64748b', fontSize: 13 }}>
                  <span style={{ animation: 'pulse 1.5s infinite' }}>Thinking...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #1e293b', display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === 'Enter' && chatInput.trim() && !chatLoading) {
                    const q = chatInput.trim();
                    setChatInput('');
                    setChatMessages(prev => [...prev, { role: 'user', text: q }]);
                    setChatLoading(true);
                    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                    try {
                      const res = await fetch('/api/copilot', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ question: q, reviewId: result.id }),
                      });
                      const data = await res.json();
                      setChatMessages(prev => [...prev, { role: 'ai', text: data.answer || data.error || 'No response.' }]);
                    } catch {
                      setChatMessages(prev => [...prev, { role: 'ai', text: 'Connection error. Please try again.' }]);
                    } finally {
                      setChatLoading(false);
                      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                    }
                  }
                }}
                placeholder="Ask about this review..."
                style={{
                  flex: 1, padding: '10px 14px', background: '#1e293b', border: '1px solid #334155',
                  borderRadius: 10, color: '#e2e8f0', fontSize: 13, outline: 'none',
                }}
              />
              <button
                disabled={!chatInput.trim() || chatLoading}
                onClick={async () => {
                  if (!chatInput.trim() || chatLoading) return;
                  const q = chatInput.trim();
                  setChatInput('');
                  setChatMessages(prev => [...prev, { role: 'user', text: q }]);
                  setChatLoading(true);
                  setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                  try {
                    const res = await fetch('/api/copilot', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ question: q, reviewId: result.id }),
                    });
                    const data = await res.json();
                    setChatMessages(prev => [...prev, { role: 'ai', text: data.answer || data.error || 'No response.' }]);
                  } catch {
                    setChatMessages(prev => [...prev, { role: 'ai', text: 'Connection error. Please try again.' }]);
                  } finally {
                    setChatLoading(false);
                    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                  }
                }}
                style={{
                  padding: '10px 16px', background: chatInput.trim() ? '#3b82f6' : '#334155',
                  border: 'none', borderRadius: 10, color: '#fff', fontSize: 14,
                  cursor: chatInput.trim() ? 'pointer' : 'not-allowed', fontWeight: 600,
                }}
              >↑</button>
            </div>
          </div>
        )}
      </div>

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
  const [hovered, setHovered] = React.useState<number | null>(null);

  if (!correlations || correlations.length === 0) return null;

  const SEV_STYLE: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    CRITICAL: { bg: '#1a0a0a', border: '#ef4444', text: '#ef4444', glow: '#ef444433' },
    HIGH:     { bg: '#1a1000', border: '#f97316', text: '#f97316', glow: '#f9731633' },
    MEDIUM:   { bg: '#0a0e1a', border: '#f59e0b', text: '#f59e0b', glow: '#f59e0b33' },
    LOW:      { bg: '#0a1a0e', border: '#22c55e', text: '#22c55e', glow: '#22c55e33' },
    INFORMATIONAL: { bg: '#0a0f1a', border: '#3b82f6', text: '#3b82f6', glow: '#3b82f633' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, padding: '8px 0', flexWrap: 'wrap' }}>
        {Object.entries(SEV_STYLE).map(([sev, s]) => (
          <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: s.text }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.border }} />
            {sev}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#475569' }}>
          {correlations.length} correlation cluster{correlations.length !== 1 ? 's' : ''} detected
        </div>
      </div>

      {/* Cluster Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
        {correlations.map((c, i) => {
          const sev = c.severity || 'LOW';
          const style = SEV_STYLE[sev] || SEV_STYLE.LOW;
          const isHov = hovered === i;
          const files = (c.files || []).slice(0, 8);
          const extraFiles = (c.files || []).length - 8;

          return (
            <div
              key={c.id || i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: style.bg,
                border: `1.5px solid ${isHov ? style.border : style.border + '66'}`,
                borderRadius: 12,
                padding: '14px 16px',
                transition: 'all 0.2s',
                boxShadow: isHov ? `0 0 24px ${style.glow}` : 'none',
                cursor: 'default',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: style.border + '22', border: `1px solid ${style.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: style.text, flexShrink: 0
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3 }}>
                    {c.title}
                  </div>
                  <div style={{
                    display: 'inline-block', marginTop: 3,
                    fontSize: 9, fontWeight: 700, padding: '1px 6px',
                    borderRadius: 4, background: style.border + '22', color: style.text,
                    letterSpacing: '0.05em'
                  }}>
                    {sev}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>
                {c.description?.substring(0, 120)}{(c.description?.length || 0) > 120 ? '...' : ''}
              </div>

              {/* Affected Files */}
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Affected Files ({c.files?.length || 0})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {files.map(f => (
                  <span key={f} style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 4,
                    background: '#0f172a', border: `1px solid ${style.border}44`,
                    color: '#94a3b8', fontFamily: 'monospace'
                  }}>
                    {f.split('/').pop()}
                  </span>
                ))}
                {extraFiles > 0 && (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 4,
                    background: '#0f172a', border: '1px solid #334155',
                    color: '#475569'
                  }}>
                    +{extraFiles} more
                  </span>
                )}
              </div>

              {/* Issue count bar */}
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 3, background: '#1e293b', borderRadius: 2 }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: style.border,
                    width: `${Math.min(100, ((c.issues?.length || 0) / 10) * 100)}%`
                  }} />
                </div>
                <span style={{ fontSize: 10, color: style.text, fontWeight: 600 }}>
                  {c.issues?.length || 0} issues linked
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



// ====================== Styles ======================

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
