import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const { submissionId, audioUrl, promptText, imagePromptUrl, rubric } = await req.json();
    
    // 1. Setup the 2026 Brain
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // Using the actual current model: gemini-3-flash
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

    // 2. Fetch the Audio
    const audioRes = await fetch(audioUrl);
    const audioData = await audioRes.arrayBuffer();

    // 3. Build the Multimodal Prompt
    const prompt = `
      Context: Professional ESL Oral Assessment.
      Task: Analyze the student's response to: "${promptText}".
      Focus Area: ${rubric || 'General Fluency'}.
      Note: If an image is present, evaluate how accurately the student describes it.
      
      Response Format: Strictly return a JSON object ONLY.
      {
        "transcript": "full word-for-word transcript",
        "ai_score": 1-5,
        "ai_comment": "exactly two sentences of pedagogical feedback"
      }
    `;

    const contents = [{ text: prompt }];

    // Add Visual Context if it exists
    if (imagePromptUrl) {
      const imgRes = await fetch(imagePromptUrl);
      const imgData = await imgRes.arrayBuffer();
      contents.push({
        inlineData: { data: Buffer.from(imgData).toString("base64"), mimeType: "image/png" }
      });
    }

    // Add Audio Context
    contents.push({
      inlineData: { data: Buffer.from(audioData).toString("base64"), mimeType: "audio/webm" }
    });

    // 4. Execute Generation
    const result = await model.generateContent(contents);
    const responseText = result.response.text();
    
    // Strip markdown formatting if the AI gets chatty
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const aiData = JSON.parse(cleanJson);

    // 5. Pipe to Database
    const { error } = await supabase.from('submissions').update({
      transcript: aiData.transcript,
      ai_score: aiData.ai_score,
      teacher_score: aiData.ai_comment // Stored for teacher review/edit
    }).eq('id', submissionId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("2026 BRAIN ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
