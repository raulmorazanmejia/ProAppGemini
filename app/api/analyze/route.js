import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { audioUrl, promptText } = await req.json();
    
    // 1. Verify the API Key exists in Vercel
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing in Vercel settings" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 2. Use the "Flash Latest" alias from your official list
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // 3. Download the audio file from your Supabase storage
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error("Could not find the audio file in Supabase.");
    
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    // 4. The Teacher's Instructions
    const prompt = `You are an expert ESL Oral Communication teacher. 
    Analyze this audio recording for the specific task: "${promptText}". 
    
    Return ONLY a JSON object with this exact structure:
    {
      "transcript": "Write the word-for-word transcript here",
      "ai_score": 5,
      "ai_comment": "Write a helpful 1-2 sentence encouraging comment here"
    }`;

    // 5. Ask Gemini to listen and grade
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
    
    // 6. Clean the response (removes any AI markdown formatting)
    const cleanJson = textResponse.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanJson);
    
    return NextResponse.json(aiResponse);

  } catch (error) {
    console.error("BRAIN ERROR:", error.message);
    
    // Detect if Google is putting you in a "Time Out" (Quota)
    if (error.message.includes("429")) {
      return NextResponse.json({ error: "Google is busy. Wait 60 seconds and try again." }, { status: 429 });
    }
    
    return NextResponse.json({ error: "The Brain had a hiccup: " + error.message }, { status: 500 });
  }
}