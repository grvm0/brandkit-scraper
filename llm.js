import { generateObject } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';
import { getModel } from './llm-provider.js';
dotenv.config();

// Default model if none specified
const DEFAULT_MODEL = process.env.LLM_MODEL || 'gpt-4o';

// Define the exact JSON schema using Zod for Text Analysis
const textSchema = z.object({
  mission: z.string().describe("The core mission statement synthesized from the text"),
  description: z.string().describe("A concise 1-2 sentence description of what the company does"),
  industry: z.string().describe("The primary industry"),
  toneOfVoice: z.object({
    defaultStyle: z.array(z.string()).describe("3-5 adjectives describing the tone"),
    doNotUse: z.array(z.string()).describe("3-5 words or phrases they would NEVER say")
  })
});

/**
 * Uses Vercel AI SDK to analyze text for tone of voice and mission
 */
export async function analyzeTextWithLLM(text, url, modelName = DEFAULT_MODEL) {
  console.log(`Analyzing text content with model: ${modelName}...`);
  
  const prompt = `
    You are an expert brand strategist. Analyze the following text extracted from the website ${url}.
    Determine the brand's core mission statement and their tone of voice.
    
    Website Text:
    ${text}
  `;

  try {
    const { object } = await generateObject({
      model: getModel(modelName),
      schema: textSchema,
      prompt: prompt,
      temperature: 0.2
    });
    return object;
  } catch (err) {
    console.error("Text analysis failed:", err);
    return null;
  }
}

// Define the exact JSON schema using Zod for Image Analysis
const imageSchema = z.object({
  vibe: z.string().describe("A description of the overall feeling of the imagery"),
  colorGrading: z.string().describe("The color treatment of the images"),
  composition: z.string().describe("How the subjects are framed")
});

/**
 * Uses Vercel AI SDK to analyze images for visual style
 */
export async function analyzeImagesWithLLM(imageUrls, modelName = DEFAULT_MODEL) {
  if (!imageUrls || imageUrls.length === 0) return null;
  console.log(`Analyzing ${imageUrls.length} images with model: ${modelName}...`);
  
  const prompt = `
    You are an expert art director. I am providing you with descriptions/URLs of hero images from a brand's website.
    URLs: ${imageUrls.join(', ')}
    
    If you cannot view them, infer the likely style based on standard web practices for this industry.
    Analyze the imagery style including vibe, color grading, and composition.
  `;

  try {
    const { object } = await generateObject({
      model: getModel(modelName),
      schema: imageSchema,
      prompt: prompt,
      temperature: 0.2
    });
    return object;
  } catch (err) {
    console.error("Image analysis failed:", err);
    return null;
  }
}
