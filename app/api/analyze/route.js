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

    // 1. Fetch the student's audio
    const response = await fetch(audioUrl);
    const audioData = await response.arrayBuffer();

    // 2. Talk to the Gemini 3 series brain
    const model = genAI.getGenerativeModel(
      { model: "gemini-flash-latest" }, 
      { apiVersion: 'v1beta' }
    );

    const prompt = `
      You are an expert ESL Oral Communication teacher. 
      Analyze this student's response to: "${promptText}".
      Provide:
      1. A Transcript.
      2. An AI Score (1-5).
      3. Encouraging feedback (max 2 sentences).
      Return ONLY a JSON object: {"transcript": "...", "ai_score": 5, "ai_comment": "..."}
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

    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanJson);

    // --- VICTORY LOGS ---
    console.log("--- AI SUCCESS ---");
    console.log("Transcript:", aiResponse.transcript);
    console.log("Score:", aiResponse.ai_score);
    console.log("------------------");

    // 3. Save to the database
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
    console.error("LOG ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}