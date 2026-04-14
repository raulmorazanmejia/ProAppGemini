import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  try {
    const { submissionId, audioUrl, promptText, imageUrl, rubric } = await req.json();
    
    // Fetch student audio
    const audioRes = await fetch(audioUrl);
    const audioData = await audioRes.arrayBuffer();

    // Prepare Gemini parts
    const parts = [
      { text: `You are an expert ESL teacher. Analyze this oral response to the prompt: "${promptText}". 
               Focus strictly on: ${rubric}. 
               If an image is provided, ensure the student described it accurately.
               Return JSON: {"transcript": "...", "ai_score": 1-5, "ai_comment": "2 sentences max"}` }
    ];

    // Add image if it exists
    if (imageUrl) {
      const imgRes = await fetch(imageUrl);
      const imgData = await imgRes.arrayBuffer();
      parts.push({
        inlineData: { data: Buffer.from(imgData).toString("base64"), mimeType: "image/png" }
      });
    }

    // Add audio
    parts.push({
      inlineData: { data: Buffer.from(audioData).toString("base64"), mimeType: "audio/webm" }
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }, { apiVersion: 'v1beta' });
    const result = await model.generateContent(parts);
    const aiResponse = JSON.parse(result.response.text().replace(/```json|```/g, "").trim());

    await supabase.from('submissions').update({
      transcript: aiResponse.transcript,
      ai_score: aiResponse.ai_score,
      teacher_score: aiResponse.ai_comment // Stored here for dashboard review
    }).eq('id', submissionId);

    return new Response(JSON.stringify({ success: true }));

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
