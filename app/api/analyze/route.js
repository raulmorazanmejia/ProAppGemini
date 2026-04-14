import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { audioUrl, promptText, rubric } = await req.json();
    
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    // Use v1beta path as requested
    const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: 'v1beta' });
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error("Could not find the audio file.");
    
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    let focusInstruction = "";
    if (rubric === "Pronunciation") {
      focusInstruction = "Focus specifically on phonetic clarity, pronunciation, intonation, and clarity of sounds.";
    } else if (rubric === "Grammar") {
      focusInstruction = "Focus specifically on grammatical accuracy, sentence structure, and tense usage.";
    } else if (rubric === "Vocabulary") {
      focusInstruction = "Focus specifically on vocabulary choice, word variety, and appropriate usage of terms.";
    } else {
      focusInstruction = "Provide a general evaluation of the student's speaking performance.";
    }

    const prompt = `You are an expert ESL Oral Communication teacher. 
    Analyze this audio recording for the task: "${promptText}". 
    ${focusInstruction}
    
    Your feedback MUST be exactly 2 sentences long. No more, no less.
    
    Return ONLY a JSON object with this exact structure:
    {
      "transcript": "Word-for-word transcript",
      "ai_score": 1-5 integer,
      "ai_comment": "Exactly two sentences of feedback."
    }`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "audio/mpeg",
          data: base64Audio,
        },
      },
    ]);

    const textResponse = await result.response.text();
    const cleanJson = textResponse.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanJson);
    
    return NextResponse.json(aiResponse);

  } catch (error) {
    console.error("BRAIN ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

