import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  try {
    const { submissionId, audioUrl, promptText, imagePromptUrl, rubric } = await req.json();
    
    // 1. Fetch Student Audio
    const audioRes = await fetch(audioUrl);
    const audioData = await audioRes.arrayBuffer();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }, { apiVersion: 'v1beta' });

    // 2. Multimodal Prompt
    const parts = [
      { text: `Analyze this ESL oral response for: "${promptText}". Rubric focus: ${rubric}. 
               Return JSON: {"transcript": "full text", "ai_score": 1-5, "ai_comment": "2 feedback sentences"}` }
    ];

    if (imagePromptUrl) {
      const imgRes = await fetch(imagePromptUrl);
      const imgData = await imgRes.arrayBuffer();
      parts.push({ inlineData: { data: Buffer.from(imgData).toString("base64"), mimeType: "image/png" } });
    }

    parts.push({ inlineData: { data: Buffer.from(audioData).toString("base64"), mimeType: "audio/webm" } });

    // 3. Generate and Parse
    const result = await model.generateContent(parts);
    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanJson);

    // 4. Update Database
    const { error: updateError } = await supabase.from('submissions').update({
      transcript: aiResponse.transcript,
      ai_score: aiResponse.ai_score,
      teacher_score: aiResponse.ai_comment 
    }).eq('id', submissionId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Brain Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
