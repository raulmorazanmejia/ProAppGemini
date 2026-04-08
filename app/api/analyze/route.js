import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { audioUrl, promptText } = await req.json();
    
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing in Vercel settings" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Updated to Gemini 2.0 Flash for 2026 stability
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 1. Fetch the audio from Supabase
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error("Supabase audio file not found");
    
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    // 2. The Teacher Prompt
    const prompt = `You are an expert ESL Oral Communication teacher. 
    Analyze this audio for the prompt: "${promptText}". 
    Return ONLY a JSON object: {"transcript": "...", "ai_score": 5, "ai_comment": "..."}`;

    // 3. Call Gemini
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "audio/webm",
          data: base64Audio,
        },
      },
    ]);

    const textResponse = await result.response.text();
    const cleanJson = textResponse.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanJson);
    
    return NextResponse.json(aiResponse);

  } catch (error) {
    console.error("LOGS ERROR:", error.message);
    return NextResponse.json({ error: "Brain Error: " + error.message }, { status: 500 });
  }
}