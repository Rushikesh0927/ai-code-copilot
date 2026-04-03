require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function test() {
  try {
    const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await embedModel.embedContent("test");
    console.log("text-embedding-004 worked:", result.embedding.values.length);
  } catch (e) {
    console.error("text-embedding-004 failed:", e.message);
  }

  try {
    const embedModel2 = genAI.getGenerativeModel({ model: "embedding-001" });
    const result2 = await embedModel2.embedContent("test");
    console.log("embedding-001 worked:", result2.embedding.values.length);
  } catch (e) {
    console.error("embedding-001 failed:", e.message);
  }
}

test();
