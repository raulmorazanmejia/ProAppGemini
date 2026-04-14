import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const { submissionId, audioUrl, promptText, imagePromptUrl, rubric } = await req.json();
    console.log("Analyzing submission:", submissionId);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // 1. Fetch Audio
    const audioRes = await fetch(audioUrl);
    const audioData = await audioRes.arrayBuffer();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }, { apiVersion: 'v1beta' });

    // 2. Build Multimodal Content
    const prompt = `
      You are an ESL teacher. Analyze the audio response to: "${promptText}".
      Focus on: ${rubric || 'general communication'}.
      Return ONLY a JSON object: {"transcript": "...", "ai_score": 5, "ai_comment": "2 sentences of feedback."}
    `;

    const parts = [{ text: prompt }];

    // Add image if it exists
    if (imagePromptUrl && imagePromptUrl.startsWith('http')) {
      try {
        const imgRes = await fetch(imagePromptUrl);
        const imgData = await imgRes.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(imgData).toString("base64"), mimeType: "image/png" } });
      } catch (e) { console.error("Image fetch failed, continuing with audio only."); }
    }

    parts.push({ inlineData: { data: Buffer.from(audioData).toString("base64"), mimeType: "audio/webm" } });

    // 3. Generate Content
    const result = await model.generateContent(parts);
    const responseText = result.response.text();
    
    // CLEAN THE JSON (Removes ```json ... ``` tags if AI adds them)
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanJson);

    // 4. Update Database
    // We save to 'teacher_score' as the "AI Draft" and 'transcript' / 'ai_score' as facts.
    const { error: dbError } = await supabase.from('submissions').update({
      transcript: aiResponse.transcript,
      ai_score: aiResponse.ai_score,
      teacher_score: aiResponse.ai_comment 
    }).eq('id', submissionId);

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("CRITICAL BRAIN ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
