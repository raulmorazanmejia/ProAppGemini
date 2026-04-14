import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const { submissionId, audioUrl, promptText, imagePromptUrl, rubric } = await req.json();
    
    // 1. Verify Environment Variables (The most common cause of 500 errors)
    if (!process.env.GEMINI_API_KEY) throw new Error("API Key Missing: Set GEMINI_API_KEY in Vercel.");
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // 2. Fetch Audio from Supabase Storage
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error("Could not fetch audio from storage bucket.");
    const audioBuffer = await audioRes.arrayBuffer();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // 3. Build Multimodal Content
    const parts = [
      { text: `System: You are an ESL teacher. Analyze the audio for: "${promptText}". 
               Focus on: ${rubric || 'general communication'}.
               Return ONLY a JSON object: {"transcript": "...", "ai_score": 5, "ai_comment": "2 sentences of feedback."}` }
    ];

    // Add Image if available
    if (imagePromptUrl && imagePromptUrl.includes('http')) {
      const imgRes = await fetch(imagePromptUrl);
      if (imgRes.ok) {
        const imgBuffer = await imgRes.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(imgBuffer).toString("base64"), mimeType: "image/png" } });
      }
    }

    // Add Audio
    parts.push({ inlineData: { data: Buffer.from(audioBuffer).toString("base64"), mimeType: "audio/webm" } });

    // 4. Generate Content with "Markdown Cleaning"
    const result = await model.generateContent(parts);
    const rawText = result.response.text();
    const cleanJson = rawText.replace(/```json|```/g, "").trim(); // Removes AI-generated tags
    const aiResponse = JSON.parse(cleanJson);

    // 5. Update Database
    const { error: dbError } = await supabase.from('submissions').update({
      transcript: aiResponse.transcript,
      ai_score: aiResponse.ai_score,
      teacher_score: aiResponse.ai_comment // The "AI Draft" for the teacher
    }).eq('id', submissionId);

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("ANALYSIS FAILED:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
