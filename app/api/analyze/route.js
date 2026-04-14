import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const { submissionId, audioUrl, promptText, imagePromptUrl, rubric } = await req.json();
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Using the stable 2.0 string we verified
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const audioRes = await fetch(audioUrl);
    const audioBuffer = await audioRes.arrayBuffer();

    const parts = [
      { text: `System: ESL Teacher. Analyze audio for "${promptText}". 
               Return JSON ONLY: {"transcript": "...", "ai_score": 1-5, "ai_comment": "..."}` }
    ];

    if (imagePromptUrl) {
      const imgRes = await fetch(imagePromptUrl);
      const imgBuffer = await imgRes.arrayBuffer();
      parts.push({ inlineData: { data: Buffer.from(imgBuffer).toString("base64"), mimeType: "image/png" } });
    }

    parts.push({ inlineData: { data: Buffer.from(audioBuffer).toString("base64"), mimeType: "audio/webm" } });

    const result = await model.generateContent(parts);
    const aiResponse = JSON.parse(result.response.text().replace(/```json|```/g, "").trim());

    // CRITICAL CHANGE: We set status to 'graded' immediately.
    // This triggers the student's screen to update without your intervention.
    await supabase.from('submissions').update({
      transcript: aiResponse.transcript,
      ai_score: aiResponse.ai_score,
      feedback: aiResponse.ai_comment, // AI comment goes directly to student
      status: 'graded' 
    }).eq('id', submissionId);

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}