import * as fs from 'fs';
import * as path from 'path';
import { AIReviewService } from '../src/services/ai-review.service';
import { Finding } from '../src/types';

// Ground truth mapping for the test vectors
const GROUND_TRUTH: Record<string, { expectedCount: number, bugs: { line: number, category: string, severity: string }[] }> = {
  'sql_injection.py': {
    expectedCount: 5,
    bugs: [
      { line: 11, category: 'SECURITY', severity: 'CRITICAL' },
      { line: 18, category: 'SECURITY', severity: 'CRITICAL' },
      { line: 22, category: 'SECURITY', severity: 'HIGH' },
      { line: 29, category: 'SECURITY', severity: 'MEDIUM' },
      { line: 36, category: 'SECURITY', severity: 'CRITICAL' }
    ]
  },
  'xss_auth.js': {
    expectedCount: 6,
    bugs: [
      { line: 9, category: 'SECURITY', severity: 'CRITICAL' },
      { line: 15, category: 'SECURITY', severity: 'CRITICAL' },
      { line: 21, category: 'SECURITY', severity: 'HIGH' },
      { line: 26, category: 'SECURITY', severity: 'CRITICAL' },
      { line: 31, category: 'SECURITY', severity: 'HIGH' },
      { line: 40, category: 'SECURITY', severity: 'CRITICAL' }
    ]
  },
  'perf_smells.tsx': {
    expectedCount: 7,
    bugs: [
      { line: 8, category: 'PERFORMANCE', severity: 'HIGH' },
      { line: 18, category: 'PERFORMANCE', severity: 'HIGH' },
      { line: 31, category: 'CODE_SMELL', severity: 'MEDIUM' },
      { line: 64, category: 'CODE_SMELL', severity: 'MEDIUM' },
      { line: 73, category: 'CODE_SMELL', severity: 'MEDIUM' },
      { line: 83, category: 'DESIGN_PATTERN', severity: 'MEDIUM' },
      { line: 91, category: 'DESIGN_PATTERN', severity: 'MEDIUM' }
    ]
  }
};

async function runBenchmarks() {
  console.log("🚀 Starting AI Code Review Copilot Benchmark Suite...");
  
  const aiReview = new AIReviewService();
  const testVectorsDir = path.join(__dirname, 'test-vectors');
  const files = fs.readdirSync(testVectorsDir).filter(f => !f.startsWith('.'));
  
  let totalTruePositives = 0;
  let totalFalsePositives = 0;
  let totalFalseNegatives = 0;
  let totalTimeMs = 0;

  const results: any[] = [];

  for (const file of files) {
    const filePath = path.join(testVectorsDir, file);
    const code = fs.readFileSync(filePath, 'utf-8');
    const language = file.endsWith('.py') ? 'python' : file.endsWith('.js') ? 'javascript' : 'typescript';
    
    console.log(`\n\n🔍 Scanning ${file} (${language})...`);
    
    const startTime = Date.now();
    // Simulate real environment params
    const findings = await aiReview.reviewFile(code, file, language, '', '', '');
    const duration = Date.now() - startTime;
    totalTimeMs += duration;

    console.log(`⏱️ Completed in ${(duration / 1000).toFixed(2)}s. Found ${findings.length} issues.`);

    const truth = GROUND_TRUTH[file];
    if (!truth) {
      console.warn(`No ground truth defined for ${file}`);
      continue;
    }

    // Match findings to ground truth (allow +/- 1 line tolerance for minor AST shifts)
    let fileTP = 0;
    const unmatchedFindings = [...findings];
    const missedBugs = [];

    for (const expectedBug of truth.bugs) {
      const matchIdx = unmatchedFindings.findIndex(f => 
        Math.abs(f.line - expectedBug.line) <= 2 && // Tolerance for empty lines/comments
        f.category === expectedBug.category
      );

      if (matchIdx >= 0) {
        fileTP++;
        unmatchedFindings.splice(matchIdx, 1);
      } else {
        missedBugs.push(expectedBug);
      }
    }

    const fileFP = unmatchedFindings.length; // AI found something that isn't a stated bug
    const fileFN = truth.expectedCount - fileTP; // AI missed a stated bug

    totalTruePositives += fileTP;
    totalFalsePositives += fileFP;
    totalFalseNegatives += fileFN;

    results.push({
      file,
      duration,
      findings,
      stats: {
        tp: fileTP,
        fp: fileFP,
        fn: fileFN,
        expected: truth.expectedCount,
        accuracy: fileTP / truth.expectedCount
      },
      missedBugs
    });
  }

  // Calculate overall metrics
  const precision = totalTruePositives / (totalTruePositives + totalFalsePositives) || 0;
  const recall = totalTruePositives / (totalTruePositives + totalFalseNegatives) || 0;
  const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
  
  const avgTimePerFile = totalTimeMs / files.length;

  console.log("\n=======================================================");
  console.log("🏆 BENCHMARK RESULTS MATRIX");
  console.log("=======================================================");
  console.log(`Total Files Scanned : ${files.length}`);
  console.log(`Total Execution Time: ${(totalTimeMs / 1000).toFixed(2)}s`);
  console.log(`Avg Time Per File   : ${(avgTimePerFile / 1000).toFixed(2)}s`);
  console.log("-------------------------------------------------------");
  console.log("ACCURACY METRICS");
  console.log(`True Positives (TP) : ${totalTruePositives} (Correctly identified bugs)`);
  console.log(`False Positives (FP): ${totalFalsePositives} (Hallucinations or over-strict rules)`);
  console.log(`False Negatives (FN): ${totalFalseNegatives} (Missed critical vulnerabilities)`);
  console.log("-------------------------------------------------------");
  console.log(`Precision           : ${(precision * 100).toFixed(1)}%`);
  console.log(`Recall (Coverage)   : ${(recall * 100).toFixed(1)}%`);
  console.log(`F1 Score            : ${(f1Score * 100).toFixed(1)}%`);
  console.log("=======================================================\n");

  generateHtmlReport(results, totalTimeMs, precision, recall, f1Score);
}

function generateHtmlReport(results: any[], totalTimeMs: number, precision: number, recall: number, f1Score: number) {
  let html = \`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AI Code Review Copilot - Benchmark Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; background: #0d1117; color: #c9d1d9; }
        .container { max-width: 1000px; margin: 0 auto; }
        .card { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 20px; margin-bottom: 20px; }
        h1, h2, h3 { color: #58a6ff; }
        .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
        .metric-box { background: #0d1117; border: 1px solid #30363d; padding: 15px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #3fb950; margin-top: 10px; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-right: 10px; }
        .critical { background: rgba(248, 81, 73, 0.1); color: #f85149; border: 1px solid rgba(248, 81, 73, 0.4); }
        .high { background: rgba(210, 153, 34, 0.1); color: #d29922; border: 1px solid rgba(210, 153, 34, 0.4); }
        .medium { background: rgba(47, 129, 247, 0.1); color: #2f81f7; border: 1px solid rgba(47, 129, 247, 0.4); }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { text-align: left; padding: 10px; border-bottom: 1px solid #30363d; }
        th { color: #8b949e; }
        .code-block { background: #0d1117; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #8b949e; overflow-x: auto;}
    </style>
</head>
<body>
<div class="container">
    <h1>🚀 AI Copilot Benchmark Report</h1>
    <p>Automated verification map of Accuracy, Efficiency, and Reliability.</p>

    <div class="metric-grid">
        <div class="metric-box">
            <div>F1 ACCURACY SCORE</div>
            <div class="metric-value">{(f1Score * 100).toFixed(1)}%</div>
        </div>
        <div class="metric-box">
            <div>TIME PER FILE</div>
            <div class="metric-value">${(totalTimeMs / results.length / 1000).toFixed(2)}s</div>
        </div>
        <div class="metric-box">
            <div>PRECISION (Low noise)</div>
            <div class="metric-value">{(precision * 100).toFixed(1)}%</div>
        </div>
        <div class="metric-box">
            <div>RECALL (Coverage)</div>
            <div class="metric-value">{(recall * 100).toFixed(1)}%</div>
        </div>
    </div>\`;

  results.forEach(r => {
    html += \`
    <div class="card">
        <h2>📁 \${r.file} <span style="font-size:14px;color:#8b949e;font-weight:normal;float:right;">Took \${(r.duration / 1000).toFixed(2)}s</span></h2>
        <p><strong>Accuracy:</strong> \${(r.stats.accuracy * 100).toFixed(0)}% (Found \${r.stats.tp} of \${r.stats.expected} known bugs, missed \${r.stats.fn}. Hallucinated \${r.stats.fp})</p>
        
        <h3>Detected Issues:</h3>
        <table>
            <tr><th>Line</th><th>Severity</th><th>Category</th><th>Title</th></tr>\`;
    
    r.findings.forEach((f: Finding) => {
        html += \`<tr>
            <td>L\${f.line}</td>
            <td><span class="badge \${f.severity.toLowerCase()}">\${f.severity}</span></td>
            <td>\${f.category}</td>
            <td>\${f.title}</td>
        </tr>\`;
    });

    html += \`</table>\`;

    if (r.missedBugs.length > 0) {
        html += \`<h3>❌ Missed Vulnerabilities:</h3><ul>\`;
        r.missedBugs.forEach((mb: any) => {
            html += \`<li style="color:#f85149">Expected \${mb.severity} \${mb.category} at Line \${mb.line}</li>\`;
        });
        html += \`</ul>\`;
    }

    html += \`</div>\`;
  });

  html += \`
</div>
</body>
</html>\`;

  const outPath = path.resolve(__dirname, '../../testing_benchmarks_report.html');
  fs.writeFileSync(outPath, html);
  console.log(\`\\n✅ Benchmark report saved to: \${outPath}\`);
}

// Execute
// First, load environment variables from nextjs .env.local
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

runBenchmarks().catch(console.error);
