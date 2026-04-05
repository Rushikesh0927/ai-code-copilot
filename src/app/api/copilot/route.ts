// ============================================================
// SECTION: API — Copilot Chat Route
// PURPOSE: Interactive AI assistant for post-review Q&A
// Spec §7: Users can interactively navigate findings
// ============================================================

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzer } from '../../../services';
import { APP_CONFIG } from '../../../config/app.config';

const COPILOT_SYSTEM_PROMPT = `You are a code review assistant (AI Copilot) helping a developer understand the results of a code review.

CONTEXT: You will receive:
1. The full list of findings from the review (issues found in the code).
2. Correlations (clusters of related issues).
3. A summary of the review.

YOUR ROLE:
- Answer questions about specific findings ("How do I fix the JWT issue?")
- Prioritize fixes ("Which file should I fix first?")
- Explain WHY a finding matters in plain language
- Suggest the order of remediation
- Provide code snippets when asked for fix details

RULES:
- Always reference findings by their ID (e.g. ISS-001)
- Be concise but thorough
- Use markdown formatting for code blocks
- If asked about something not in the review context, say so clearly
- Never hallucinate findings that don't exist in the context`;

export async function POST(req: Request) {
  try {
    const { question, reviewId } = await req.json();

    if (!question || !reviewId) {
      return NextResponse.json(
        { error: 'Both question and reviewId are required.' },
        { status: 400 }
      );
    }

    // Fetch stored review results
    const results = await analyzer.getResults(reviewId);
    if (!results) {
      return NextResponse.json(
        { error: 'Review not found. Please provide a valid reviewId.' },
        { status: 404 }
      );
    }

    // Build context from review data (limit to 25 findings to stay within token window)
    const context = JSON.stringify({
      repoName: results.repoName,
      score: results.summary.overallScore,
      recommendation: results.summary.recommendation,
      findings: results.findings.slice(0, 25).map(f => ({
        id: f.id,
        file: f.file,
        line: f.line,
        severity: f.severity,
        category: f.category,
        title: f.title,
        description: f.description,
        codeSnippet: f.codeSnippet?.substring(0, 300),
        suggestion: f.suggestion?.substring(0, 300),
      })),
      correlations: results.correlations?.slice(0, 10),
    }, null, 0);

    // Use the configured Gemini model
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: APP_CONFIG.AI.MODEL_NAME,
      generationConfig: { temperature: 0.4 },
    });

    const prompt = `${COPILOT_SYSTEM_PROMPT}\n\n--- REVIEW CONTEXT ---\n${context}\n\n--- USER QUESTION ---\n${question}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Copilot error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response.', details: String(error) },
      { status: 500 }
    );
  }
}
