# AI-Powered Code Review Copilot

Enterprise-grade automated code review prototype powered by Google Gemini and grounded in MITRE CWE / OWASP vulnerability patterns. Developed as a 3-day prototype for the Eli Lilly Internship Challenge.

## Features

- **11-Dimension Analysis**: Checks for Bugs, Security, Code Smells, Performance, Scalability, Linting, and Design Patterns.
- **Knowledge-Augmented Prompting**: Uses few-shot examples from real datasets (`SecureCode v2.0`, `SmellyCodeDataset`) rather than hallucinating issues.
- **Severity Scoring**: Issues matched to Critical/High/Medium/Low with dynamic health scoring.
- **Interactive Dashboard**: File tree navigator, severity filters, and unified inline code suggestions.

---

## 🚀 Quick Setup

This is a Next.js application. You only need an API key to run it.

1. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure Environment Variables**
   CREATE a `.env.local` file in the root directory and add the following keys. 
   *(Note for Eli Lilly Reviewers: I will provide my test keys during the demo, or you can provision a free Supabase project)*
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Required for Job State & Vector Embeddings
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Optional: For analyzing private repositories or bypassing public rate limits
   GITHUB_TOKEN=your_github_personal_access_token
   ```

3. **Run the Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────────┐   │
│  │ Input   │  │ Status   │  │ Results Dashboard     │   │
│  │ Form    │  │ Tracker  │  │ (File / Severity Nav) │   │
│  └─────────┘  └──────────┘  └───────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│                 API ROUTES (Next.js)                    │
│  ┌──────────┐  ┌───────────┐  ┌────────────────────┐    │
│  │ GitHub   │  │ Analyzer  │  │ Formatter          │    │
│  │ Service  │  │ Orchestr. │  │ Service            │    │
│  └──────────┘  └───────────┘  └────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│               EXTERNAL AI & KNOWLEDGE BASE              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Google       │  │ CWE Top 25   │  │ SecureCode    │  │
│  │ Gemini API   │  │ Dataset      │  │ v2.0 Examples │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

The system uses a **Knowledge-Augmented Prompting (KAP)** strategy. The prompts are baked with real-world examples (found in \`src/knowledge/\`), preventing the AI from generating hallucinatory rules.

---

## 🎤 Prototype vs. Production (Why I Built It This Way)

As a 3-day prototype, certain architectural decisions were made for speed and simplicity. Here is how this scales to a production product:

### 1. In-Memory State vs. Worker Queues
- **Current**: Analysis jobs are tracked in an in-memory Map in the Next.js API route. Supports 1 concurrent user well.
- **Production**: A dedicated worker queue (e.g., BullMQ + Redis) would decouple API submission from execution. This prevents timeout errors and scales horizontally to support thousands of concurrent analyses.

### 2. Knowledge-Augmented Prompting vs. Fine-tuning
- **Current**: Embeds CWE/OWASP examples directly into the prompt.
- **Production**: Would use a Vector Database (RAG) to store historical review decisions (accepted/rejected PR comments) so the system learns team-specific conventions over time without requiring expensive model fine-tuning.

### 3. Syntax Parsing vs. LLM Engine
- **Current**: Relies on Gemini's generalized language understanding.
- **Production**: A robust pipeline would first pass the code through `tree-sitter` to generate an Abstract Syntax Tree (AST), ensuring syntax accuracy before sending logical chunks to the LLM.

### 4. Direct API vs. OpenAPI Contracts
- **Current**: Next.js full-stack approach (trivially simple setup).
- **Production**: Frontend and Backend teams would agree on an OpenAPI specification first, allowing parallel development across separate React (SPA) and FastAPI (Python) codebases.

---

## 🗂 Code Navigation Guide (For Live Editing)

Every file in \`src/\` is clearly marked with \`SECTION\`, \`PURPOSE\`, and \`MODIFY\` blocks. 

If you want to:
- **Change what the AI looks for**: Edit \`src/prompts/bug-detection.ts\` or \`src/prompts/security.ts\`
- **Add a new vulnerability signature**: Edit \`src/knowledge/security-examples.ts\`
- **Change Severity Colors**: Edit \`src/utils/constants.ts\`
- **Modify API routing**: Edit \`src/app/api/analyze/route.ts\`
