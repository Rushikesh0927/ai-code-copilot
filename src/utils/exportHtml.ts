import { ReviewResult, Finding, Correlation } from '../types/review.types';

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generateHtmlReport(result: ReviewResult): string {
  const findings = result.findings;
  const correlations = result.correlations || [];
  const s = result.summary;

  // --- Severity Counts ---
  const sevCounts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFORMATIONAL: 0 };
  findings.forEach(f => { sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1; });

  // --- Category Counts ---
  const catCounts: Record<string, number> = {};
  findings.forEach(f => { catCounts[f.category] = (catCounts[f.category] || 0) + 1; });

  // --- File Counts ---
  const fileCounts: Record<string, number> = {};
  findings.forEach(f => { fileCounts[f.file] = (fileCounts[f.file] || 0) + 1; });

  // --- Distribution bar widths ---
  const total = findings.length || 1;
  const distCrit = Math.round((sevCounts.CRITICAL / total) * 100);
  const distHigh = Math.round((sevCounts.HIGH / total) * 100);
  const distMed = Math.round((sevCounts.MEDIUM / total) * 100);
  const distLow = Math.round((sevCounts.LOW / total) * 100);
  const distInfo = Math.max(0, 100 - distCrit - distHigh - distMed - distLow);

  // --- Score Color ---
  const score = s.overallScore;
  const scoreColor = score > 75 ? '#3B6D11' : score > 50 ? '#BA7517' : '#E24B4A';
  const riskLabel = score > 75 ? 'Low risk' : score > 50 ? 'Medium risk' : score > 25 ? 'Medium-High risk' : 'High risk';

  // --- Risk Hotspots (top 4 files) ---
  const hotspots = Object.entries(fileCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // --- Category bar chart ---
  const catColors: Record<string, string> = { SECURITY: '#E24B4A', BUG: '#BA7517', PERFORMANCE: '#185FA5', CODE_SMELL: '#534AB7', ARCHITECTURE: '#0F6E56', SCALABILITY: '#0F6E56', LINTING: '#888', DESIGN_PATTERN: '#6D28D9', CODE_CORRELATION: '#3b82f6', INLINE_SUGGESTION: '#64748b' };
  const maxCat = Math.max(...Object.values(catCounts), 1);
  const catBarsHtml = Object.entries(catCounts).map(([k, v]) =>
    `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
      <div style="font-size:12px;color:var(--color-text-secondary);width:100px;flex-shrink:0;">${k.replace('_', ' ')}</div>
      <div style="flex:1;height:8px;background:var(--color-background-primary);border-radius:4px;overflow:hidden;">
        <div style="width:${Math.round(v / maxCat * 100)}%;height:100%;background:${catColors[k] || '#888'};border-radius:4px;"></div>
      </div>
      <div style="font-size:12px;color:var(--color-text-secondary);min-width:12px;">${v}</div>
    </div>`
  ).join('');

  // --- File bar chart ---
  const maxFile = Math.max(...Object.values(fileCounts), 1);
  const fileBarsHtml = Object.entries(fileCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) =>
    `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
      <div style="font-size:11px;color:var(--color-text-secondary);width:120px;flex-shrink:0;font-family:var(--font-mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(k)}">${k.split('/').pop()}</div>
      <div style="flex:1;height:8px;background:var(--color-background-primary);border-radius:4px;overflow:hidden;">
        <div style="width:${Math.round(v / maxFile * 100)}%;height:100%;background:#185FA5;border-radius:4px;"></div>
      </div>
      <div style="font-size:12px;color:var(--color-text-secondary);min-width:12px;">${v}</div>
    </div>`
  ).join('');

  // --- Sidebar category items ---
  const catSidebarItems = Object.entries(catCounts).map(([k, v]) =>
    `<div class="sb-item" onclick="filterCat('${k}',this)"><div class="sb-dot" style="background:${catColors[k] || '#888'};"></div> ${k.replace('_', ' ')} <span class="sb-count">${v}</span></div>`
  ).join('\n    ');

  // --- Findings JSON for JS ---
  const findingsJson = JSON.stringify(findings.map((f, i) => ({
    id: f.id || `ISS-${String(i + 1).padStart(3, '0')}`,
    severity: f.severity,
    category: f.category,
    title: f.title,
    file: f.file,
    lines: f.line ? `L${f.line}${f.endLine ? '–L' + f.endLine : ''}` : '',
    fn: f.fn || '',
    module: f.file?.split('/').pop()?.replace(/\..+$/, '') || '',
    desc: f.description,
    code: f.codeSnippet || '',
    suggestion: f.suggestion || '',
    fixSnippet: f.fixSnippet || '',
    impact: f.impact || '',
    corr: f.relatedIssues || [],
  })));

  const corrJson = JSON.stringify(correlations.map((c, i) => ({
    id: c.id || `CLU-${String.fromCharCode(65 + i)}`,
    title: c.title,
    severity: c.severity,
    color: c.severity === 'CRITICAL' ? '#E24B4A' : c.severity === 'HIGH' ? '#BA7517' : '#185FA5',
    issues: c.issues,
    desc: c.description,
    files: c.files,
    rel: c.relationship,
  })));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Code Review Report - ${esc(result.repoName)}</title>
<style>
:root {
  --color-border-tertiary: #e2e8f0; --color-text-secondary: #64748b; --color-text-primary: #0f172a;
  --color-background-secondary: #ffffff; --color-background-primary: #f1f5f9;
  --color-border-secondary: #cbd5e1; --color-border-primary: #94a3b8;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
  --border-radius-md: 6px; --border-radius-lg: 8px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-sans); font-size: 14px; color: var(--color-text-primary); background: #f8fafc; }

/* layout */
.page { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; gap: 0; }
.sidebar { border-right: 0.5px solid var(--color-border-tertiary); padding: 1rem 0; display: flex; flex-direction: column; gap: 2px; background: #fff; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.main { padding: 1.25rem 1.5rem; overflow-y: auto; }

/* sidebar */
.sb-section { font-size: 11px; font-weight: 500; color: var(--color-text-secondary); padding: 0 1rem; margin: 10px 0 4px; letter-spacing: 0.04em; text-transform: uppercase; }
.sb-item { display: flex; align-items: center; gap: 8px; padding: 5px 1rem; cursor: pointer; font-size: 13px; color: var(--color-text-secondary); border-left: 2px solid transparent; transition: all 0.15s; }
.sb-item:hover { color: var(--color-text-primary); background: var(--color-background-primary); }
.sb-item.active { color: var(--color-text-primary); border-left: 2px solid var(--color-text-primary); background: var(--color-background-primary); font-weight: 500; }
.sb-count { margin-left: auto; font-size: 11px; background: var(--color-background-primary); border-radius: 99px; padding: 1px 7px; color: var(--color-text-secondary); }
.sb-item.active .sb-count { background: var(--color-background-secondary); }
.sb-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* page sections */
.section { display: none; }
.section.active { display: block; }

/* repo summary */
.repo-header { margin-bottom: 1.25rem; }
.repo-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.repo-meta { font-size: 12px; color: var(--color-text-secondary); font-family: var(--font-mono); }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 1.25rem; }
.scard { background: var(--color-background-secondary); border-radius: var(--border-radius-md); padding: .75rem 1rem; border: 1px solid var(--color-border-tertiary); }
.scard-label { font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px; }
.scard-value { font-size: 20px; font-weight: 500; }

/* score bar */
.score-section { background: var(--color-background-secondary); border-radius: var(--border-radius-lg); padding: 1rem 1.25rem; margin-bottom: 1.25rem; border: 1px solid var(--color-border-tertiary); }
.score-row { display: flex; align-items: center; gap: 1rem; }
.score-num { font-size: 28px; font-weight: 600; min-width: 48px; }
.score-right { flex: 1; }
.score-label { font-size: 13px; font-weight: 500; margin-bottom: 8px; }
.dist-row { display: flex; gap: 3px; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 6px; }
.dist-seg { height: 100%; }
.dist-legend { display: flex; gap: 12px; flex-wrap: wrap; }
.dl { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--color-text-secondary); }
.dl-dot { width: 8px; height: 8px; border-radius: 2px; }

/* issue summary cards */
.isummary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 1.25rem; }
.is-card { border-radius: var(--border-radius-md); padding: .65rem .85rem; border: 0.5px solid transparent; }
.is-card.critical { background: #FCEBEB; border-color: #F7C1C1; }
.is-card.high { background: #FAEEDA; border-color: #FAC775; }
.is-card.medium { background: #E6F1FB; border-color: #B5D4F4; }
.is-card.low { background: #EAF3DE; border-color: #C0DD97; }
.is-card.info { background: #EEEDFE; border-color: #CECBF6; }
.is-card-num { font-size: 22px; font-weight: 500; }
.is-card.critical .is-card-num { color: #A32D2D; }
.is-card.high .is-card-num { color: #854F0B; }
.is-card.medium .is-card-num { color: #185FA5; }
.is-card.low .is-card-num { color: #3B6D11; }
.is-card.info .is-card-num { color: #3C3489; }
.is-card-label { font-size: 11px; color: var(--color-text-secondary); }

/* filter bar */
.filter-bar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 1rem; align-items: center; }
.filter-label { font-size: 12px; color: var(--color-text-secondary); margin-right: 4px; }
.fbtn { font-size: 12px; padding: 3px 10px; border-radius: 99px; border: 0.5px solid var(--color-border-secondary); background: none; cursor: pointer; color: var(--color-text-secondary); transition: all 0.15s; }
.fbtn.active { background: var(--color-background-secondary); color: var(--color-text-primary); border-color: var(--color-border-primary); font-weight: 500; }
.filter-sep { width: 0.5px; height: 16px; background: var(--color-border-tertiary); margin: 0 4px; }

/* findings */
.finding-card { border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); margin-bottom: 8px; overflow: hidden; background: #fff; }
.finding-head { padding: .75rem 1rem; cursor: pointer; display: flex; align-items: flex-start; gap: 10px; }
.finding-head:hover { background: var(--color-background-primary); }
.finding-card.open .finding-head { background: var(--color-background-primary); }
.badge { font-size: 10px; font-weight: 500; padding: 2px 7px; border-radius: var(--border-radius-md); flex-shrink: 0; margin-top: 1px; }
.badge.CRITICAL { background: #FCEBEB; color: #A32D2D; }
.badge.HIGH { background: #FAEEDA; color: #854F0B; }
.badge.MEDIUM { background: #E6F1FB; color: #185FA5; }
.badge.LOW { background: #EAF3DE; color: #3B6D11; }
.badge.INFORMATIONAL { background: #EEEDFE; color: #3C3489; }
.cat-tag { font-size: 10px; padding: 2px 7px; border-radius: var(--border-radius-md); background: var(--color-background-primary); color: var(--color-text-secondary); flex-shrink: 0; margin-top: 1px; }
.finding-title-block { flex: 1; min-width: 0; }
.finding-title { font-size: 13px; font-weight: 500; }
.finding-loc { font-size: 11px; font-family: var(--font-mono); color: var(--color-text-secondary); margin-top: 2px; }
.finding-id { font-size: 11px; color: var(--color-text-secondary); font-family: var(--font-mono); flex-shrink: 0; margin-top: 2px; }
.chevron { font-size: 11px; color: var(--color-text-secondary); flex-shrink: 0; margin-top: 3px; transition: transform .2s; }
.finding-card.open .chevron { transform: rotate(90deg); }

.finding-body { display: none; padding: .85rem 1rem; border-top: 0.5px solid var(--color-border-tertiary); }
.finding-card.open .finding-body { display: block; }
.fb-section { margin-bottom: .85rem; }
.fb-label { font-size: 11px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 5px; letter-spacing: 0.5px; }
.fb-text { font-size: 13px; color: var(--color-text-secondary); line-height: 1.7; }
.code-block { font-family: var(--font-mono); font-size: 12px; line-height: 1.6; background: #1e293b; color: #f8fafc; border-radius: var(--border-radius-md); padding: .65rem .85rem; overflow-x: auto; white-space: pre; }
.suggest-block { font-family: var(--font-mono); font-size: 12px; line-height: 1.6; background: #EAF3DE; border-radius: var(--border-radius-md); padding: .65rem .85rem; overflow-x: auto; white-space: pre; color: #27500A; }
.meta-row { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: .85rem; }
.meta-item { font-size: 12px; }
.meta-item span:first-child { color: var(--color-text-secondary); }
.meta-item span:last-child { font-family: var(--font-mono); color: var(--color-text-primary); }
.corr-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 8px; border-radius: 99px; background: var(--color-background-primary); border: 0.5px solid var(--color-border-secondary); cursor: pointer; color: var(--color-text-secondary); margin: 2px; transition: all 0.15s; }
.corr-chip:hover { color: var(--color-text-primary); border-color: var(--color-border-primary); }

/* correlation */
.cluster-card { border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 1rem 1.1rem; margin-bottom: 10px; background: #fff; }
.cluster-head { display: flex; align-items: center; gap: 10px; margin-bottom: .65rem; }
.cluster-title { font-size: 14px; font-weight: 500; }
.cluster-sev { font-size: 11px; padding: 2px 8px; border-radius: var(--border-radius-md); }
.cluster-body { font-size: 13px; color: var(--color-text-secondary); line-height: 1.7; margin-bottom: .65rem; }
.cluster-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: .5rem; }
.cluster-files { display: flex; flex-wrap: wrap; gap: 4px; }
.file-chip { font-size: 11px; font-family: var(--font-mono); padding: 2px 8px; border-radius: var(--border-radius-md); background: var(--color-background-primary); color: var(--color-text-secondary); }

/* empty state */
.empty { text-align: center; padding: 2rem; color: var(--color-text-secondary); font-size: 13px; }

/* architecture review */
.arch-card { border: 1px solid var(--color-border-tertiary); border-left: 4px solid #f59e0b; border-radius: var(--border-radius-lg); padding: 1.25rem; margin-bottom: 1.25rem; background: #fff; }
.arch-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #92400e; }
.arch-body { font-size: 14px; color: var(--color-text-secondary); line-height: 1.7; }
</style>
</head>
<body>
<div class="page">
  <!-- SIDEBAR -->
  <div class="sidebar">
    <div class="sb-section">REPORT</div>
    <div class="sb-item active" onclick="nav('summary',this)">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex-shrink:0"><path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"/></svg>
      Repository Summary
    </div>
    <div class="sb-item" onclick="nav('issues',this)">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex-shrink:0"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/></svg>
      Issue Summary
    </div>
    <div class="sb-item" onclick="nav('findings',this)">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex-shrink:0"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Z"/></svg>
      Detailed Findings
      <span class="sb-count" id="sb-count">${findings.length}</span>
    </div>
    <div class="sb-item" onclick="nav('correlation',this)">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex-shrink:0"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z"/></svg>
      Correlation Mapping
    </div>

    <div class="sb-section" style="margin-top:12px;">FILTER BY SEVERITY</div>
    <div class="sb-item" onclick="filterSidebar('all',this)" id="sf-all">
      <div class="sb-dot" style="background:#888;"></div> All Issues <span class="sb-count">${findings.length}</span>
    </div>
    <div class="sb-item" onclick="filterSidebar('CRITICAL',this)">
      <div class="sb-dot" style="background:#E24B4A;"></div> Critical <span class="sb-count">${sevCounts.CRITICAL}</span>
    </div>
    <div class="sb-item" onclick="filterSidebar('HIGH',this)">
      <div class="sb-dot" style="background:#BA7517;"></div> High <span class="sb-count">${sevCounts.HIGH}</span>
    </div>
    <div class="sb-item" onclick="filterSidebar('MEDIUM',this)">
      <div class="sb-dot" style="background:#185FA5;"></div> Medium <span class="sb-count">${sevCounts.MEDIUM}</span>
    </div>
    <div class="sb-item" onclick="filterSidebar('LOW',this)">
      <div class="sb-dot" style="background:#3B6D11;"></div> Low <span class="sb-count">${sevCounts.LOW}</span>
    </div>
    <div class="sb-item" onclick="filterSidebar('INFORMATIONAL',this)">
      <div class="sb-dot" style="background:#534AB7;"></div> Informational <span class="sb-count">${sevCounts.INFORMATIONAL}</span>
    </div>

    <div class="sb-section" style="margin-top:12px;">FILTER BY CATEGORY</div>
    ${catSidebarItems}
  </div>

  <!-- MAIN -->
  <div class="main">

    <!-- SECTION: REPOSITORY SUMMARY -->
    <div class="section active" id="sec-summary">
      <div class="repo-header">
        <div class="repo-title">${esc(result.repoName)}</div>
        <div class="repo-meta">${esc(result.url)} &middot; analyzed ${new Date(result.createdAt).toISOString().slice(0, 10)}</div>
      </div>
      <div class="summary-grid">
        <div class="scard"><div class="scard-label">Total files analyzed</div><div class="scard-value">${result.totalFiles}</div></div>
        <div class="scard"><div class="scard-label">Total lines of code</div><div class="scard-value">${result.totalLines}</div></div>
        <div class="scard"><div class="scard-label">Analysis duration</div><div class="scard-value">${(result.durationMs / 1000).toFixed(1)}s</div></div>
        <div class="scard"><div class="scard-label">Total issues found</div><div class="scard-value" style="color:#E24B4A;">${findings.length}</div></div>
      </div>

      <div class="score-section">
        <div class="score-row">
          <div class="score-num" style="color:${scoreColor};">${score}</div>
          <div class="score-right">
            <div class="score-label">Overall repository risk score &nbsp;&middot;&nbsp; <span style="color:${scoreColor};">${riskLabel}</span></div>
            <div class="dist-row">
              <div class="dist-seg" style="background:#E24B4A;width:${distCrit}%;"></div>
              <div class="dist-seg" style="background:#BA7517;width:${distHigh}%;"></div>
              <div class="dist-seg" style="background:#185FA5;width:${distMed}%;"></div>
              <div class="dist-seg" style="background:#3B6D11;width:${distLow}%;"></div>
              <div class="dist-seg" style="background:#534AB7;width:${distInfo}%;"></div>
            </div>
            <div class="dist-legend">
              <span class="dl"><div class="dl-dot" style="background:#E24B4A;"></div>Critical ${sevCounts.CRITICAL}</span>
              <span class="dl"><div class="dl-dot" style="background:#BA7517;"></div>High ${sevCounts.HIGH}</span>
              <span class="dl"><div class="dl-dot" style="background:#185FA5;"></div>Medium ${sevCounts.MEDIUM}</span>
              <span class="dl"><div class="dl-dot" style="background:#3B6D11;"></div>Low ${sevCounts.LOW}</span>
              <span class="dl"><div class="dl-dot" style="background:#534AB7;"></div>Info ${sevCounts.INFORMATIONAL}</span>
            </div>
          </div>
        </div>
      </div>

      ${hotspots.length > 0 ? `<div style="font-size:13px;color:var(--color-text-secondary);line-height:1.7;margin-bottom:1.25rem;">
        <strong style="color:var(--color-text-primary);">Risk hotspots:</strong> &nbsp;
        ${hotspots.map(([f]) => `<code style="font-family:var(--font-mono);font-size:12px;background:var(--color-background-primary);padding:1px 6px;border-radius:4px;">${esc(f)}</code> &nbsp;`).join('')}
      </div>` : ''}

      ${result.summary.architectureReview ? `
      <div class="arch-card">
        <div class="arch-title">Architecture Review</div>
        <div class="arch-body">${esc(result.summary.architectureReview)}</div>
      </div>` : ''}

      <div style="font-size:13px;color:var(--color-text-secondary);line-height:1.7;">
        <strong style="color:var(--color-text-primary);">AI Summary:</strong> ${esc(result.summary.recommendation)}
      </div>
    </div>

    <!-- SECTION: ISSUE SUMMARY -->
    <div class="section" id="sec-issues">
      <div class="isummary-grid">
        <div class="is-card critical"><div class="is-card-num">${sevCounts.CRITICAL}</div><div class="is-card-label">Critical</div></div>
        <div class="is-card high"><div class="is-card-num">${sevCounts.HIGH}</div><div class="is-card-label">High</div></div>
        <div class="is-card medium"><div class="is-card-num">${sevCounts.MEDIUM}</div><div class="is-card-label">Medium</div></div>
        <div class="is-card low"><div class="is-card-num">${sevCounts.LOW}</div><div class="is-card-label">Low</div></div>
        <div class="is-card info"><div class="is-card-num">${sevCounts.INFORMATIONAL}</div><div class="is-card-label">Informational</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="background:var(--color-background-secondary);border-radius:var(--border-radius-lg);padding:1rem 1.1rem;border:1px solid var(--color-border-tertiary);">
          <div style="font-size:12px;font-weight:500;margin-bottom:10px;color:var(--color-text-secondary);">By category</div>
          ${catBarsHtml}
        </div>
        <div style="background:var(--color-background-secondary);border-radius:var(--border-radius-lg);padding:1rem 1.1rem;border:1px solid var(--color-border-tertiary);">
          <div style="font-size:12px;font-weight:500;margin-bottom:10px;color:var(--color-text-secondary);">By file</div>
          ${fileBarsHtml}
        </div>
      </div>
    </div>

    <!-- SECTION: DETAILED FINDINGS -->
    <div class="section" id="sec-findings">
      <div class="filter-bar">
        <span class="filter-label">Severity:</span>
        <button class="fbtn active" onclick="applyFilter('sev','ALL',this)">All</button>
        <button class="fbtn" onclick="applyFilter('sev','CRITICAL',this)">Critical</button>
        <button class="fbtn" onclick="applyFilter('sev','HIGH',this)">High</button>
        <button class="fbtn" onclick="applyFilter('sev','MEDIUM',this)">Medium</button>
        <button class="fbtn" onclick="applyFilter('sev','LOW',this)">Low</button>
        <div class="filter-sep"></div>
        <span class="filter-label">Category:</span>
        <button class="fbtn active" onclick="applyFilter('cat','ALL',this)">All</button>
        ${Object.keys(catCounts).map(k => `<button class="fbtn" onclick="applyFilter('cat','${k}',this)">${k.replace('_', ' ')}</button>`).join('\n        ')}
      </div>
      <div id="findings-list"></div>
    </div>

    <!-- SECTION: CORRELATION MAPPING -->
    <div class="section" id="sec-correlation">
      <div id="corr-list"></div>
    </div>

  </div>
</div>

<script>
const findings = ${findingsJson};
const correlations = ${corrJson};

let sevFilter='ALL', catFilter='ALL';

function h(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function nav(sec,el){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.getElementById('sec-'+sec).classList.add('active');
  document.querySelectorAll('.sidebar .sb-item').forEach(i=>i.classList.remove('active'));
  el.classList.add('active');
}

function filterSidebar(sev,el){
  sevFilter=sev==='all'?'ALL':sev; catFilter='ALL';
  nav('findings',el);
  renderFindings();
  document.querySelectorAll('.filter-bar .fbtn').forEach((b,i)=>{b.classList.toggle('active',i===0);});
}

function filterCat(cat,el){
  catFilter=cat; sevFilter='ALL';
  nav('findings',el);
  renderFindings();
}

function applyFilter(type,val,btn){
  if(type==='sev'){
    sevFilter=val;
    const btns=[...btn.closest('.filter-bar').querySelectorAll('.fbtn')];
    btns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  }
  if(type==='cat'){
    catFilter=val;
    const btns=[...btn.closest('.filter-bar').querySelectorAll('.fbtn')];
    btns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  }
  renderFindings();
}

function renderFindings(){
  var list=findings.filter(function(f){
    var sv=sevFilter==='ALL'||f.severity===sevFilter;
    var ct=catFilter==='ALL'||f.category===catFilter;
    return sv&&ct;
  });
  var el=document.getElementById('findings-list');
  document.getElementById('sb-count').textContent=list.length;
  if(!list.length){el.innerHTML='<div class="empty">No issues match the selected filters.</div>';return;}
  el.innerHTML=list.map(function(f){
    return '<div class="finding-card" id="fc-'+f.id+'">' +
      '<div class="finding-head" onclick="toggleFinding(\\''+f.id+'\\')">' +
        '<div class="badge '+f.severity+'">'+f.severity+'</div>' +
        '<div class="cat-tag">'+f.category.replace('_',' ')+'</div>' +
        '<div class="finding-title-block">' +
          '<div class="finding-title">'+f.title+'</div>' +
          '<div class="finding-loc">'+f.file+' &nbsp;&middot;&nbsp; '+f.lines+' &nbsp;&middot;&nbsp; '+f.fn+'</div>' +
        '</div>' +
        '<div class="finding-id">'+f.id+'</div>' +
        '<div class="chevron">&#9654;</div>' +
      '</div>' +
      '<div class="finding-body">' +
        '<div class="meta-row">' +
          '<div class="meta-item"><span>File: </span><span>'+f.file+'</span></div>' +
          '<div class="meta-item"><span>Lines: </span><span>'+f.lines+'</span></div>' +
          '<div class="meta-item"><span>Function: </span><span>'+f.fn+'</span></div>' +
          '<div class="meta-item"><span>Module: </span><span>'+f.module+'</span></div>' +
        '</div>' +
        '<div class="fb-section"><div class="fb-label">DESCRIPTION</div><div class="fb-text">'+f.desc+'</div></div>' +
        (f.code ? '<div class="fb-section"><div class="fb-label">AFFECTED CODE</div><div class="code-block">'+h(f.code)+'</div></div>' : '') +
        (f.suggestion ? '<div class="fb-section"><div class="fb-label">SUGGESTED IMPROVEMENT</div><div class="fb-text">'+h(f.suggestion)+'</div></div>' : '') +
        (f.fixSnippet ? '<div class="fb-section"><div class="fb-label">CODE FIX</div><div class="suggest-block">'+h(f.fixSnippet)+'</div></div>' : '') +
        (f.impact ? '<div class="fb-section"><div class="fb-label">IMPACT</div><div class="fb-text">'+f.impact+'</div></div>' : '') +
        (f.corr&&f.corr.length ? '<div class="fb-section"><div class="fb-label">RELATED ISSUES</div><div>'+f.corr.map(function(c){return '<span class="corr-chip" onclick="jumpTo(\\''+c+'\\')">\\u0023 '+c+'</span>';}).join('')+'</div></div>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

function toggleFinding(id){
  document.getElementById('fc-'+id).classList.toggle('open');
}

function jumpTo(id){
  sevFilter='ALL';catFilter='ALL';
  renderFindings();
  setTimeout(function(){
    var el=document.getElementById('fc-'+id);
    if(el){el.classList.add('open');el.scrollIntoView({behavior:'smooth',block:'start'});}
  },50);
}

function renderCorrelation(){
  var el=document.getElementById('corr-list');
  var severityColors={CRITICAL:'#FCEBEB',HIGH:'#FAEEDA'};
  var textColors={CRITICAL:'#A32D2D',HIGH:'#854F0B'};
  el.innerHTML=correlations.map(function(c){
    return '<div class="cluster-card">' +
      '<div class="cluster-head">' +
        '<div class="cluster-title">'+c.id+' \\u2014 '+c.title+'</div>' +
        '<span class="cluster-sev" style="background:'+(severityColors[c.severity]||'#EAF3DE')+';color:'+(textColors[c.severity]||'#3B6D11')+';">'+c.severity+'</span>' +
      '</div>' +
      '<div class="cluster-body">'+c.desc+'</div>' +
      '<div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:6px;">'+c.rel+'</div>' +
      '<div class="cluster-chips">' +
        c.issues.map(function(i){return '<span class="corr-chip" onclick="jumpToFinding(\\''+i+'\\')">\\u0023 '+i+'</span>';}).join('') +
      '</div>' +
      '<div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:4px;">Affected components:</div>' +
      '<div class="cluster-files">' +
        c.files.map(function(f){return '<span class="file-chip">'+f+'</span>';}).join('') +
      '</div>' +
    '</div>';
  }).join('');
}

function jumpToFinding(id){
  sevFilter='ALL';catFilter='ALL';
  var items=document.querySelectorAll('.sidebar .sb-item');
  nav('findings',items[3]);
  renderFindings();
  setTimeout(function(){
    var el=document.getElementById('fc-'+id);
    if(el){el.classList.add('open');el.scrollIntoView({behavior:'smooth',block:'start'});}
  },80);
}

renderFindings();
renderCorrelation();
</script>
</body>
</html>`;
}
