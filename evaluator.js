import { generateObject } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getModel } from './llm-provider.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default to a different model (Claude 3.5 Sonnet) to prevent echo chamber validation
const DEFAULT_EVAL_MODEL = process.env.LLM_EVAL_MODEL || 'claude-3-5-sonnet-20240620';

const evaluationSchema = z.object({
  evaluations: z.array(z.object({
    property: z.string().describe("The dot-notation path of the property evaluated (e.g., 'toneOfVoice.defaultStyle')"),
    extractedContent: z.any().describe("The extracted value being evaluated"),
    rating: z.enum(['OK', 'NEEDS_REVIEW', 'FAIL']),
    rationale: z.string().describe("Explanation of the rating based on the schema requirements.")
  })),
  overallRating: z.enum(['OK', 'NEEDS_REVIEW', 'FAIL']),
  summary: z.string().describe("High-level summary of the semantic quality of the extracted brand kit.")
});

export async function evaluateBrandKit(brandKitData) {
  console.log(`Starting semantic evaluation using model: ${DEFAULT_EVAL_MODEL}...`);
  
  const schemaPath = path.join(__dirname, 'brand_identity_schema.json');
  const schemaData = fs.readFileSync(schemaPath, 'utf8');

  const prompt = `
    You are a strict, expert Brand Strategist and QA Engineer.
    I have extracted a brand kit from a company's website into a JSON structure.
    
    Your task is to semantically evaluate the extracted "Brand Kit Data" against the expectations defined in the "JSON Schema Specification".
    You must determine if the extracted content logically makes sense, is high quality, and adheres to the descriptions in the schema.
    
    JSON Schema Specification:
    ${schemaData}
    
    Extracted Brand Kit Data:
    ${JSON.stringify(brandKitData, null, 2)}
    
    Provide a detailed evaluation rating key fields (like mission, description, toneOfVoice, imageryStyle) as 'OK', 'NEEDS_REVIEW', or 'FAIL'.
  `;

  try {
    const { object } = await generateObject({
      model: getModel(DEFAULT_EVAL_MODEL),
      schema: evaluationSchema,
      prompt: prompt,
      temperature: 0.1 // Low temperature for consistent, strict grading
    });
    return object;
  } catch (err) {
    console.error("Semantic evaluation failed:", err);
    return null;
  }
}
