import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// Helper for "Exponential Backoff" (Retrying when Google is being difficult)
const wait = (ms) => new Promise(res => setTimeout(res, ms));

export async function POST(req) {
  const { submissionId, audioUrl, promptText, imagePromptUrl, rubric } = await req.json();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      console.log(`🚀 Attempt ${attempts + 1}: Analyzing ${submissionId}`);
      
      const audioRes = await fetch(audioUrl);
      const audioData = await audioRes.arrayBuffer();

      const parts = [
        { text: `System: ESL Teacher. Analyze audio for "${promptText}". 
                 Return JSON ONLY: {"transcript": "...", "ai_score": 5, "ai_comment": "..."}` }
      ];

      if (imagePromptUrl) {
        const imgRes = await fetch(imagePromptUrl);
        const imgData = await imgRes.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(imgData).toString("base64"), mimeType: "image/png" } });
      }

      parts.push({ inlineData: { data: Buffer.from(audioData).toString("base64"), mimeType: "audio/webm" } });

      const result = await model.generateContent(parts);
      const responseText = result.response.text().replace(/```json|```/g, "").trim();
      const aiResponse = JSON.parse(responseText);

      // Success: Update DB
      await supabase.from('submissions').update({
        transcript: aiResponse.transcript,
        ai_score: aiResponse.ai_score,
        feedback: aiResponse.ai_comment,
        status: 'graded' 
      }).eq('id', submissionId);

      return new Response(JSON.stringify({ success: true }));

    } catch (error) {
      attempts++;
      console.error(`❌ Attempt ${attempts} failed:`, error.message);
      
      // If it's a 429 (Quota), wait 5 seconds and try again
      if (error.message.includes("429") && attempts < maxAttempts) {
        console.log("♻️ Quota hit. Retrying in 5 seconds...");
        await wait(5000);
      } else {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }
  }
}