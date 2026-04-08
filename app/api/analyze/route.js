import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { audioUrl, promptText } = await req.json();
    
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing in Vercel" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using the absolute standard name to avoid 404 errors
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 1. Fetch audio from Supabase
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error("Audio file not found in Supabase");
    
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    // 2. The Teacher Instructions
    const prompt = `You are an expert ESL Oral Communication teacher. 
    Analyze this audio recording for the prompt: "${promptText}"
    
    Return ONLY a JSON object:
    {
      "transcript": "word-for-word transcript",
      "ai_score": 5,
      "ai_comment": "feedback"
    }`;

    // 3. Send to Gemini
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
    console.error("Gemini Error:", error.message);
    return NextResponse.json({ error: "Brain failure: " + error.message }, { status: 500 });
  }
}