import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const { submissionId, audioUrl, promptText, imagePromptUrl, rubric } = await req.json();
    console.log("🚀 STARTING AUTO-ANALYSIS:", submissionId);
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Using the stable 2026 production string
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const audioRes = await fetch(audioUrl);
    const audioBuffer = await audioRes.arrayBuffer();

    const parts = [
      { text: `System: Expert ESL Tutor. Analyze audio for "${promptText}". 
               Focus on: ${rubric || 'General Communication'}.
               Return ONLY JSON: {"transcript": "...", "ai_score": 1-5, "ai_comment": "..."}` }
    ];

    if (imagePromptUrl) {
      const imgRes = await fetch(imagePromptUrl);
      const imgBuffer = await imgRes.arrayBuffer();
      parts.push({ inlineData: { data: Buffer.from(imgBuffer).toString("base64"), mimeType: "image/png" } });
    }

    parts.push({ inlineData: { data: Buffer.from(audioBuffer).toString("base64"), mimeType: "audio/webm" } });

    const result = await model.generateContent(parts);
    const responseText = result.response.text().replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(responseText);

    // AUTO-PUSH: Set status to 'graded' so the student doesn't have to wait for you
    await supabase.from('submissions').update({
      transcript: aiResponse.transcript,
      ai_score: aiResponse.ai_score,
      feedback: aiResponse.ai_comment,
      status: 'graded' 
    }).eq('id', submissionId);

    console.log("✅ ANALYSIS COMPLETE & PUSHED");
    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("❌ BRAIN CRASH:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}