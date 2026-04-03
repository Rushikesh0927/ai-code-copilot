import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function test() {
  try {
    const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await embedModel.embedContent("test");
    console.log("text-embedding-004 worked:", result.embedding.values.length);
  } catch (e: any) {
    console.error("text-embedding-004 failed:", e.message);
  }

  try {
    const embedModel2 = genAI.getGenerativeModel({ model: "embedding-001" });
    const result2 = await embedModel2.embedContent("test");
    console.log("embedding-001 worked:", result2.embedding.values.length);
  } catch (e: any) {
    console.error("embedding-001 failed:", e.message);
  }

  try {
    const embedModel3 = genAI.getGenerativeModel({ model: "models/text-embedding-004" });
    const result3 = await embedModel3.embedContent("test");
    console.log("models/text-embedding-004 worked:", result3.embedding.values.length);
  } catch (e: any) {
    console.error("models/text-embedding-004 failed:", e.message);
  }
}

test();
