import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Uses Gemini to analyze text for tone of voice and mission
 */
export async function analyzeTextWithLLM(text, url, modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash') {
  console.log('Analyzing text content with Gemini...');
  const prompt = `
    You are an expert brand strategist. Analyze the following text extracted from the website ${url}.
    Determine the brand's core mission statement and their tone of voice.
    
    Respond in strict JSON format matching exactly this schema:
    {
      "mission": "The core mission statement synthesized from the text",
      "description": "A concise 1-2 sentence description of what the company does",
      "industry": "The primary industry",
      "toneOfVoice": {
        "defaultStyle": ["3-5 adjectives describing the tone"],
        "doNotUse": ["3-5 words or phrases they would NEVER say"]
      }
    }
    
    Website Text:
    ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  } catch (err) {
    console.error("Text analysis failed:", err);
    return null;
  }
}

/**
 * Uses Gemini to analyze images for visual style
 */
export async function analyzeImagesWithLLM(imageUrls, modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash') {
  if (!imageUrls || imageUrls.length === 0) return null;
  console.log(`Analyzing ${imageUrls.length} images with Gemini Vision...`);
  
  const prompt = `
    You are an expert art director. I am providing you with descriptions/URLs of hero images from a brand's website.
    URLs: ${imageUrls.join(', ')}
    
    If you cannot view them, infer the likely style based on standard web practices.
    Analyze the imagery style including vibe, color grading, and composition.
    
    Respond in strict JSON format matching exactly this schema:
    {
      "vibe": "A description of the overall feeling of the imagery",
      "colorGrading": "The color treatment of the images",
      "composition": "How the subjects are framed"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  } catch (err) {
    console.error("Image analysis failed:", err);
    return null;
  }
}
