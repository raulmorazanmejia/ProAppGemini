import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  try {
    const { submissionId, audioUrl, promptText } = await req.json();
    const response = await fetch(audioUrl);
    const audioData = await response.arrayBuffer();

    // Using the Gemini 3 Flash model on the v1beta path
    const model = genAI.getGenerativeModel(
      { model: "gemini-flash-latest" }, 
      { apiVersion: 'v1beta' }
    );

    const prompt = `
      Analyze this ESL audio for: "${promptText}". 
      Return JSON ONLY: {"transcript": "...", "ai_score": 5, "ai_comment": "..."}
    `;

    // THE WORKHORSE: This handles the audio processing
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: Buffer.from(audioData).toString("base64"), mimeType: "audio/webm" } }
    ]);

    const aiResponse = JSON.parse(result.response.text().replace(/```json|```/g, "").trim());

    // VICTORY LOG: This will show in Vercel when it works!
    console.log("ESL Grading Success for Student:", submissionId);

    await supabase.from('submissions').update({
      transcript: aiResponse.transcript,
      ai_score: aiResponse.ai_score,
      teacher_score: aiResponse.ai_comment 
    }).eq('id', submissionId);

    return new Response(JSON.stringify({ success: true }));

  } catch (error) {
    // If we hit that 503, we log it clearly
    console.error("GOOGLE OVERLOADED (503):", error.message);
    return new Response(JSON.stringify({ error: "Google is busy. Try again in 60 seconds." }), { status: 503 });
  }
}