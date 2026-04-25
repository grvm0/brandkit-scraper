import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Router function to instantiate the correct provider based on the model name prefix
 */
export function getModel(modelName) {
  if (modelName.startsWith('claude')) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropic(modelName);
  } else if (modelName.startsWith('gemini')) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    return google(modelName);
  } else {
    // Default to OpenAI provider, which handles GPT models OR custom local models via baseURL
    const openai = createOpenAI({ 
      apiKey: process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || 'local',
      baseURL: process.env.LLM_BASE_URL 
    });
    return openai(modelName);
  }
}

/**
 * A robust wrapper around Vercel's generateObject.
 * Local models often fail the strict 'json_object' mode or output markdown wrappers.
 * This wrapper catches those failures, falls back to raw text generation,
 * strips out markdown, and validates the parsed JSON against the Zod schema.
 */
export async function safeGenerateObject({ model, schema, prompt, temperature }) {
  try {
    // Attempt 1: The standard SDK route
    return await generateObject({ model, schema, prompt, temperature });
  } catch (err) {
    if (err.name === 'AI_NoObjectGeneratedError') {
      console.warn(`[Fallback Triggered] generateObject failed. Attempting generateText extraction for local model...`);
      
      const fallbackPrompt = prompt + `\n\nCRITICAL INSTRUCTION: You MUST return ONLY valid JSON matching the schema. DO NOT wrap your response in markdown code blocks (\`\`\`json). Just return the raw JSON string starting with { and ending with }.`;
      
      const { text } = await generateText({ model, prompt: fallbackPrompt, temperature });
      
      let cleanText = text.trim();
      
      // Heuristic extraction: strip markdown blocks, or grab everything between first {/[ and last }/]
      const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanText = jsonMatch[1].trim();
      } else {
        const firstBrace = cleanText.indexOf('{');
        const firstBracket = cleanText.indexOf('[');
        
        // Determine if the JSON starts with an object or an array
        const start = firstBrace === -1 ? firstBracket : 
                      firstBracket === -1 ? firstBrace : 
                      Math.min(firstBrace, firstBracket);
                      
        // Match the corresponding closing character
        const end = start === firstBrace ? cleanText.lastIndexOf('}') : cleanText.lastIndexOf(']');
        
        if (start !== -1 && end === -1) {
          // The model truncated the JSON and forgot the closing bracket!
          // We will aggressively append it.
          const closingChar = start === firstBrace ? '}' : ']';
          cleanText = cleanText.substring(start) + closingChar;
        } else if (start !== -1 && end !== -1 && end > start) {
          cleanText = cleanText.substring(start, end + 1);
        }
      }
      
      try {
        const parsedJson = JSON.parse(cleanText);
        const validatedObject = schema.parse(parsedJson); // Throw ZodError if structure fails
        return { object: validatedObject };
      } catch (parseErr) {
        throw new Error(`Fallback manual parsing failed. Model output was not valid JSON for the schema: ${parseErr.message}\nRaw Text: ${text}`);
      }
    }
    throw err; // Re-throw other errors (e.g. network timeout)
  }
}
