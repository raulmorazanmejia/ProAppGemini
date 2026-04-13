import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    // DEBUG LOGS
    console.log("--- KEY CHECK ---");
    console.log("Key Exists:", !!process.env.GEMINI_API_KEY);
    console.log("Key Start:", process.env.GEMINI_API_KEY?.substring(0, 4));

    const { submissionId, audioUrl, promptText } = await req.json();
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const audioResponse = await fetch(audioUrl);
    const audioData = await audioResponse.arrayBuffer();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
      You are an expert ESL teacher. Analyze this audio for the prompt: "${promptText}".
      Return ONLY this JSON: {"transcript": "...", "ai_score": 5, "ai_comment": "..."}
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: Buffer.from(audioData).toString("base64"), mimeType: "audio/webm" } }
    ]);

    const cleanText = result.response.text().replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanText);

    await supabase.from('submissions').update({
      transcript: aiResponse.transcript,
      ai_score: aiResponse.ai_score,
      teacher_score: aiResponse.ai_comment 
    }).eq('id', submissionId);

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("DEBUG ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}