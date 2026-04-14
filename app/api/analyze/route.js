import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const { submissionId, audioUrl, promptText, imagePromptUrl, rubric } = await req.json();
    
    // The STABLE 2026 production model string
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const audioRes = await fetch(audioUrl);
    const audioBuffer = await audioRes.arrayBuffer();

    const parts = [
      { text: `System: Expert ESL Tutor. Analyze audio for: "${promptText}". Focus on: ${rubric}. 
               Return JSON ONLY: {"transcript": "...", "ai_score": 5, "ai_comment": "2 sentences feedback."}` }
    ];

    if (imagePromptUrl) {
      const imgRes = await fetch(imagePromptUrl);
      const imgBuffer = await imgRes.arrayBuffer();
      parts.push({ inlineData: { data: Buffer.from(imgBuffer).toString("base64"), mimeType: "image/png" } });
    }

    parts.push({ inlineData: { data: Buffer.from(audioBuffer).toString("base64"), mimeType: "audio/webm" } });

    const result = await model.generateContent(parts);
    const responseText = result.response.text();
    
    // Safety: Remove any markdown backticks the AI might include
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanJson);

    await supabase.from('submissions').update({
      transcript: aiResponse.transcript,
      ai_score: aiResponse.ai_score,
      teacher_score: aiResponse.ai_comment 
    }).eq('id', submissionId);

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("ANALYSIS FAILED:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}