// ============================================================
// SECTION: Services — AI Review Engine (Gemini)
// PURPOSE: Calls the Gemini API using our knowledge base prompts
// MODIFY: Change the model version, temperature, or error handling here
// ============================================================

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { buildReviewPrompt } from '../prompts';
import { Finding, Category, Severity } from '../types/review.types';
import { v4 as uuidv4 } from 'uuid';
import { APP_CONFIG } from '../config/app.config';

export class AIReviewService {
  private genAI: GoogleGenerativeAI;
  // Gemini 2.5 Flash has a massive token context window and is the supported version for 2026.
  private modelName = APP_CONFIG.AI.MODEL_NAME;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // ============================================================
  // SECTION: Embeddings Engine (RAG)
  // PURPOSE: Generate vectors to find correlated code contexts
  // NOTE: Only used when SKIP_REPO_EMBEDDINGS = false in app.config.ts
  // ============================================================
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // text-embedding-004 requires the embedContent call via the embedding-specific model path
      const embedModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await embedModel.embedContent({
        content: { parts: [{ text: text.substring(0, 8000) }], role: 'user' },
        taskType: 'RETRIEVAL_DOCUMENT' as any,
      });
      return result.embedding.values;
    } catch (err) {
      console.error('Failed to generate embedding (non-fatal, skipping):', err);
      return []; // Always return empty — never crash the main scan
    }
  }

  // Pure function for Cosine Similarity
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA.length || !vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // ============================================================
  // SECTION: Review Single File
  // PURPOSE: Ask Gemini to review the code and return structured JSON
  // ============================================================
  async reviewFile(code: string, filepath: string, language: string, relatedContext?: string, packageJsonContent?: string, structureMap?: string): Promise<Finding[]> {
    const prompt = buildReviewPrompt(code, filepath, language, relatedContext, packageJsonContent, undefined, structureMap);
    
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        // Enforce JSON output so we can parse it reliably
        responseMimeType: 'application/json',
        temperature: APP_CONFIG.AI.TEMPERATURE, // Low temperature for more analytical/consistent responses
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          // Code often contains things that trigger safety filters (e.g. "kill process", "inject script")
          // We need to lower the threshold so it doesn't refuse to review vulnerable code.
          threshold: HarmBlockThreshold.BLOCK_NONE,
        }
      ]
    });

    let retries = 3;
    let delayMs = 2000;

    while (retries > 0) {
      try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return this.parseAIResponse(responseText, filepath);
      } catch (error: any) {
        retries--;
        const isRateLimit = error?.status === 429 || error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('429');
        
        if (isRateLimit && retries > 0) {
          console.warn(`[AI Review Capacity for ${filepath}]: 503/429 hit. Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2; // Exponential backoff
        } else {
          console.error(`[AI Review Error for ${filepath}]:`, error);
          return [];
        }
      }
    }
    return [];
  }

  // ============================================================
  // SECTION: Parse Response
  // PURPOSE: Safely parse the JSON structure returned by the LLM
  // ============================================================
  private parseAIResponse(jsonString: string, filepath: string): Finding[] {
    try {
      let rawJson = jsonString;
      
      // Sometimes LLMs still wrap the response in markdown blocks even with responseMimeType set
      if (rawJson.startsWith('\`\`\`json')) {
        rawJson = rawJson.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '');
      } else if (rawJson.startsWith('\`\`\`')) {
        rawJson = rawJson.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '');
      }

      const parsed = JSON.parse(rawJson.trim());
      
      if (!parsed || !Array.isArray(parsed.findings)) {
          return [];
      }

      // Map raw findings to our strict type system
      return parsed.findings.map((f: any) => ({
        id: uuidv4(),
        file: filepath,
        fn: f.fn || f.functionName || '',
        line: f.line || 0,
        category: (f.category as Category) || 'BUG',
        severity: (f.severity as Severity) || 'INFORMATIONAL',
        title: f.title || 'Unknown Issue',
        description: f.description || '',
        suggestion: f.suggestion || '',
        impact: f.impact || '',
        codeSnippet: f.codeSnippet || '',
        fixSnippet: f.fixSnippet || '',
        confidence: f.confidence || 50,
      }));

    } catch (error) {
      console.error("Failed to parse Gemini JSON output:", error);
      console.error("Raw Output was:", jsonString);
      return [];
    }
  }

  // ============================================================
  // SECTION: Correlate Findings & Architecture Review
  // PURPOSE: Analyze all isolated findings to find patterns (Spec 5 & 8)
  // ============================================================
  async correlateFindings(findings: Finding[]): Promise<{ correlations: any[], architectureReview: string }> {
    if (findings.length === 0) {
      return { correlations: [], architectureReview: "No significant architectural issues detected." };
    }

    // ⚡ Skip expensive correlation for very small finding sets — saves 20-60s
    if (findings.length < 5) {
      return { correlations: [], architectureReview: "Repository is clean — fewer than 5 issues found. No systemic patterns detected." };
    }

    const compact = findings.map(f => ({
      id: f.id,
      file: f.file,
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description
    }));

    const prompt = `
You are a Principal Software Architect. Review the following code issues identified during an isolated repository scan.

1. Identify repeated anti-patterns or vulnerabilities that share a root cause across multiple files. Group them into "correlations".
2. Write a high-level "Architecture Review" summarizing systemic risks, design flaws, and overall code quality based on these findings.

Code Issues:
${JSON.stringify(compact, null, 2)}

Output EXACTLY this JSON structure. Do not use Markdown formatting outside the JSON keys.
{
  "correlations": [
    {
      "id": "CLU-1",
      "title": "Short title",
      "severity": "CRITICAL",
      "issues": ["Finding ID 1", "Finding ID 2"],
      "description": "Why are these linked?",
      "files": ["file1.ts", "file2.ts"],
      "relationship": "How they interact (e.g. Frontend -> Backend)"
    }
  ],
  "architectureReview": "Overall architectural summary here..."
}`;

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json', temperature: APP_CONFIG.AI.TEMPERATURE }
    });

    // ⚡ 45-second timeout — never let correlation stall the whole scan
    const timeoutPromise = new Promise<{ correlations: any[], architectureReview: string }>((_, reject) =>
      setTimeout(() => reject(new Error('Correlation timeout after 45s')), 45000)
    );

    const correlationPromise = (async () => {
      const result = await model.generateContent(prompt);
      let text = result.response.text();
      // Robust JSON extraction: strip markdown fences, find JSON object
      text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      // Try to find the JSON object if there's extra text around it
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found in response');
      const parsed = JSON.parse(jsonMatch[0].trim());
      return {
        correlations: parsed.correlations || [],
        architectureReview: parsed.architectureReview || "Analysis completed successfully."
      };
    })();

    try {
      return await Promise.race([correlationPromise, timeoutPromise]);
    } catch (error) {
      console.error("Failed to run correlation engine:", error);
      return { correlations: [], architectureReview: "Correlation analysis skipped (timeout or error)." };
    }
  }
