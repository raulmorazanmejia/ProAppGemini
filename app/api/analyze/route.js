import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  try {
    const { submissionId, audioUrl, promptText } = await req.json();

    const response = await fetch(audioUrl);
    const audioData = await response.arrayBuffer();

    // We settled on 1.5-flash-latest for the best audio-JSON stability
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
      You are an expert ESL Oral Communication teacher. 
      Analyze this student's audio response to the prompt: "${promptText}".
      
      Provide:
      1. A highly accurate transcript.
      2. An AI Score (1-5) based on clarity and relevance.
      3. Encouraging but direct feedback (max 2 sentences).
      
      Return ONLY this JSON format:
      {"transcript": "...", "ai_score": 5, "ai_comment": "..."}
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: Buffer.from(audioData).toString("base64"),
          mimeType: "audio/webm"
        }
      }
    ]);

    const cleanText = result.response.text().replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanText);

    // This is the mapping we used: ai_comment goes into the teacher_score column
    const { error } = await supabase
      .from('submissions')
      .update({
        transcript: aiResponse.transcript,
        ai_score: aiResponse.ai_score,
        teacher_score: aiResponse.ai_comment 
      })
      .eq('id', submissionId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("AI Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}