import { z } from 'zod';
import dotenv from 'dotenv';
import { getModel, safeGenerateObject } from './llm-provider.js';
import { logLLMCall } from './logger.js';
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
  }),
  suggestedScenarios: z.array(z.object({
    name: z.string().describe("A camelCase identifier for a relevant customization scenario (e.g., 'orderSupport', 'socialMediaPromo', 'enterprisePitch')"),
    description: z.string().describe("Why this scenario makes sense for this brand and what tone might override the default.")
  })).describe("3-5 potential scenarios where this specific brand might need custom tone or visual overrides based on their industry.")
});

/**
 * Uses Vercel AI SDK to analyze text for tone of voice and mission
 */
export async function analyzeTextWithLLM(text, url, modelName = DEFAULT_MODEL, feedback = "") {
  console.log(`Analyzing text content with model: ${modelName}...`);
  
  let prompt = `
    You are an expert brand strategist. Analyze the following text extracted from the website ${url}.
    Determine the brand's core mission statement, their tone of voice, and suggest 3-5 scenarios where they might need customized brand guidelines (e.g., if they are e-commerce, maybe 'orderSupport' or 'abandonedCartEmail').
    
    CRITICAL INSTRUCTION: You must return ONLY a raw JSON object matching the requested schema. Do NOT wrap your response in markdown code blocks (\`\`\`json). Just return the raw JSON.
    
    The JSON object must have EXACTLY this structure:
    {
      "mission": "String",
      "description": "String",
      "industry": "String",
      "toneOfVoice": {
        "defaultStyle": ["String"],
        "doNotUse": ["String"]
      },
      "suggestedScenarios": [
        {
          "name": "String",
          "description": "String"
        }
      ]
    }
    
    Website Text:
    ${text}
  `;

  if (feedback) {
    prompt += `
    
    PREVIOUS QA FEEDBACK:
    You previously attempted this extraction, but a QA evaluator found the following issues. Please ensure you fix them in this attempt:
    ${feedback}
    `;
  }

  try {
    const { object } = await safeGenerateObject({
      model: getModel(modelName),
      schema: textSchema,
      prompt: prompt,
      temperature: 0.2
    });
    logLLMCall("analyzeTextWithLLM", modelName, prompt, object);
    return object;
  } catch (err) {
    console.error("Text analysis failed:", err);
    logLLMCall("analyzeTextWithLLM", modelName, prompt, null, err);
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
export async function analyzeImagesWithLLM(heroImages, modelName = DEFAULT_MODEL, feedback = "") {
  if (!heroImages || heroImages.length === 0) return null;
  console.log(`Analyzing ${heroImages.length} images with model: ${modelName}...`);
  
  let prompt = `
    You are an expert art director. I am providing you with descriptions/URLs of hero images from a brand's website.
    Urls or descriptions: ${heroImages.join(', ')}
    
    If you cannot view them, infer the likely style based on standard web practices for this industry.
    Analyze the imagery style including vibe, color grading, and composition.
    
    CRITICAL INSTRUCTION: You must return ONLY a raw JSON object matching the requested schema. Do NOT wrap your response in markdown code blocks (\`\`\`json). Just return the raw JSON.
    
    The JSON object must have EXACTLY this structure:
    {
      "vibe": "String",
      "colorGrading": "String",
      "composition": "String"
    }
  `;

  if (feedback) {
    prompt += `
    
    PREVIOUS QA FEEDBACK:
    You previously attempted this extraction, but a QA evaluator found the following issues. Please ensure you fix them in this attempt:
    ${feedback}
    `;
  }

  try {
    const { object } = await safeGenerateObject({
      model: getModel(modelName),
      schema: imageSchema,
      prompt: prompt,
      temperature: 0.2
    });
    logLLMCall("analyzeImagesWithLLM", modelName, prompt, object);
    return object;
  } catch (err) {
    console.error("Image analysis failed:", err);
    logLLMCall("analyzeImagesWithLLM", modelName, prompt, null, err);
    return null;
  }
}
