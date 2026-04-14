import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const { submissionId, audioUrl, promptText, imagePromptUrl, rubric } = await req.json();
    console.log("Processing Submission:", submissionId);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // 1. Fetch Student Audio
    const audioRes = await fetch(audioUrl);
    const audioData = await audioRes.arrayBuffer();

    // 2. Initialize the correct 2026 Model
    const model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });

    // 3. Multimodal Prompt Construction
    const prompt = `
      System: Expert ESL Tutor. 
      Task: Transcribe and analyze the audio for: "${promptText}".
      Rubric: ${rubric || 'General communication'}.
      Constraint: Return ONLY JSON: {"transcript": "...", "ai_score": 5, "ai_comment": "2 sentences."}
    `;

    const parts = [{ text: prompt }];
    if (imagePromptUrl) {
      const imgRes = await fetch(imagePromptUrl);
      const imgData = await imgRes.arrayBuffer();
      parts.push({ inlineData: { data: Buffer.from(imgData).toString("base64"), mimeType: "image/png" } });
    }
    parts.push({ inlineData: { data: Buffer.from(audioData).toString("base64"), mimeType: "audio/webm" } });

    // 4. Generate & Parse
    const result = await model.generateContent(parts);
    const responseText = result.response.text().replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(responseText);

    // 5. Update DB (Teacher_score is the AI draft)
    const { error: dbError } = await supabase.from('submissions').update({
      transcript: aiResponse.transcript,
      ai_score: aiResponse.ai_score,
      teacher_score: aiResponse.ai_comment 
    }).eq('id', submissionId);

    if (dbError) throw dbError;
    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("BRAIN FAILURE:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
