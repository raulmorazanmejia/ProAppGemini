import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { submissionId, audioUrl, promptText } = await req.json();

    // 1. Fetch the audio from your Supabase bucket
    const response = await fetch(audioUrl);
    const audioData = await response.arrayBuffer();

    // 2. Use the stable model name to avoid the 404 error
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert ESL Oral Communication teacher. 
      Analyze this student's audio response to the prompt: "${promptText}".
      
      Provide:
      1. A highly accurate transcript.
      2. An AI Score (1-5) based on clarity and relevance.
      3. Encouraging feedback (max 2 sentences).
      
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

    // 3. Save the AI's "thoughts" back to your database
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
    console.error("AI Brain Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}