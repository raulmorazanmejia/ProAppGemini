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

    // 1. Fetch the student's audio file from Supabase Storage
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error("Failed to fetch audio from storage.");
    const audioData = await response.arrayBuffer();

    // 2. Initialize Gemini 3 Flash via AI Studio (v1beta)
    const model = genAI.getGenerativeModel(
      { model: "gemini-flash-latest" }, 
      { apiVersion: 'v1beta' }
    );

    const prompt = `
      You are an expert ESL Oral Communication teacher. 
      Analyze this student's audio response to the prompt: "${promptText}".
      
      Provide:
      1. A highly accurate transcript.
      2. An AI Score (1-5) based on clarity and relevance.
      3. Exactly 2 sentences of encouraging, specific feedback for the student.
      
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

    // 3. Parse and clean the AI response
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanJson);

    // 4. Update the database record
    const { error: dbError } = await supabase
      .from('submissions')
      .update({
        transcript: aiResponse.transcript,
        ai_score: aiResponse.ai_score,
        teacher_score: aiResponse.ai_comment // Storing the AI feedback here
      })
      .eq('id', submissionId);

    if (dbError) throw dbError;

    // Return the full object to the student page for instant display
    return new Response(JSON.stringify(aiResponse), { status: 200 });

  } catch (error) {
    console.error("AI Brain Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}