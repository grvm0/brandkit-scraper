import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
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
