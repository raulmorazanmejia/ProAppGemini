import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// This pulls the key you just saved in Vercel
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { audioUrl, promptText } = await req.json();

    // 1. Initialize Gemini 1.5 Flash (The fast, multimodal model)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Download the audio from your Supabase link so Gemini can "hear" it
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    // 3. Define the Teacher's Instructions
    const prompt = `
      You are an expert ESL Oral Communication teacher. 
      Listen to this audio recording of a student responding to the prompt: "${promptText}"
      
      Tasks:
      1. Provide a word-for-word transcript.
      2. Grade them from 1 to 5 based on: Vocabulary, Grammar, and Task Completion.
      3. Write a 1-2 sentence encouraging comment.

      Return ONLY a JSON object exactly like this:
      {
        "transcript": "...",
        "ai_score": 5,
        "ai_comment": "..."
      }
    `;

    // 4. Send to Gemini
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "audio/webm",
          data: base64Audio,
        },
      },
    ]);

    // Parse the response back into a format the app understands
    const textResponse = result.response.text();
    // Sometimes AI adds markdown backticks, this cleans them off
    const cleanJson = textResponse.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanJson);
    
    return NextResponse.json(aiResponse);

  } catch (error) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ error: "AI Analysis failed" }, { status: 500 });
  }
}