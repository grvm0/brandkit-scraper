import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

// Universal LLM client configuration
const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  // baseURL can be set to OpenRouter, Groq, Together, Ollama, etc.
  baseURL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
});

const DEFAULT_MODEL = process.env.LLM_MODEL || 'gpt-4o';

/**
 * Uses a universal LLM to analyze text for tone of voice and mission
 */
export async function analyzeTextWithLLM(text, url, modelName = DEFAULT_MODEL) {
  console.log(`Analyzing text content with model: ${modelName}...`);
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
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2
    });
    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error("Text analysis failed:", err);
    return null;
  }
}

/**
 * Uses a universal LLM to analyze images for visual style
 */
export async function analyzeImagesWithLLM(imageUrls, modelName = DEFAULT_MODEL) {
  if (!imageUrls || imageUrls.length === 0) return null;
  console.log(`Analyzing ${imageUrls.length} images with model: ${modelName}...`);
  
  const prompt = `
    You are an expert art director. I am providing you with descriptions/URLs of hero images from a brand's website.
    URLs: ${imageUrls.join(', ')}
    
    If you cannot view them, infer the likely style based on standard web practices for this industry.
    Analyze the imagery style including vibe, color grading, and composition.
    
    Respond in strict JSON format matching exactly this schema:
    {
      "vibe": "A description of the overall feeling of the imagery",
      "colorGrading": "The color treatment of the images",
      "composition": "How the subjects are framed"
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2
    });
    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error("Image analysis failed:", err);
    return null;
  }
}
