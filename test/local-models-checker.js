import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';
import { getModel, safeGenerateObject } from '../llm-provider.js';

dotenv.config();

// The models the user specifically requested to test
const modelsToTest = ['qwen2.5:3b', 'llama3.2:3b', 'mymodel32k', 'qwen2.5-coder:14b'];

// A microscopic schema that even a 1B parameter model should be able to follow
const diagnosticSchema = z.object({
  status: z.enum(['success', 'failure']).describe("Always return the exact string 'success'"),
  message: z.string().describe("Write a very short hello world message")
});

async function runDiagnostic() {
  console.log('===================================================');
  console.log('🤖 Local LLM JSON Compatibility Diagnostic');
  console.log('===================================================\n');

  // Force the base URL to point to the local Ollama instance for this script
  process.env.LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://localhost:11434/v1';
  console.log(`Using Base URL: ${process.env.LLM_BASE_URL}`);
  console.log('Note: If this hangs, ensure Ollama is running (`ollama serve`).\n');

  let allPassed = true;

  for (const modelName of modelsToTest) {
    console.log(`\n--- Testing ${modelName} ---`);
    
    // 1. Test basic text generation
    try {
      console.log(`[1/4] Testing basic text generation...`);
      const { text } = await generateText({
        model: getModel(modelName),
        prompt: "Respond with exactly the words: Hello World",
        temperature: 0.1
      });
      console.log(`      ✅ Responded: "${text.trim()}"`);
    } catch (err) {
      allPassed = false;
      console.error(`      ❌ FAILED text generation. Error: ${err.message || err.name}`);
      if (err.cause?.code === 'ECONNREFUSED') {
        console.error("         Reason: Could not connect to Ollama. Make sure the server is running!");
      }
      continue; // Skip the JSON test if it can't even respond to text
    }

    // 2. Test strict JSON generation with updated instructions
    try {
      console.log(`[2/4] Testing strict JSON schema generation (with anti-markdown instructions)...`);
      const { object } = await generateObject({
        model: getModel(modelName),
        schema: diagnosticSchema,
        prompt: "Respond to this prompt by filling out the requested JSON schema. Say hello world.\n\nCRITICAL INSTRUCTION: You must return ONLY a raw JSON object matching the requested schema. Do NOT wrap your response in markdown code blocks (\`\`\`json). Just return the raw JSON.\n\nThe JSON object must have EXACTLY this structure:\n{\n  \"status\": \"success\" | \"failure\",\n  \"message\": \"String\"\n}",
        temperature: 0.1
      });
      
      console.log(`✅ SUCCESS! ${modelName} returned perfectly structured JSON:`);
      console.log(JSON.stringify(object, null, 2));
      console.log('\n');
    } catch (err) {
      allPassed = false;
      console.error(`❌ FAILED! ${modelName} threw an error.`);
      console.error(`   Error Name: ${err.name}`);
      
      if (err.name === 'AI_NoObjectGeneratedError') {
        console.error("   Reason: The model failed to adhere to the strict JSON schema. It likely output markdown (like ```json) or raw text instead of pure JSON format, which Vercel AI SDK strictly rejects.");
      } else if (err.cause?.code === 'ECONNREFUSED') {
        console.error("      Reason: Could not connect to Ollama. Make sure the server is running!");
      } else {
        console.error(`      Message: ${err.message}`);
      }
    }

    // 3. Diagnose RAW JSON formatting (to catch markdown wrapping)
    try {
      console.log(`\n[3/4] Diagnosing raw JSON output format...`);
      const { text } = await generateText({
        model: getModel(modelName),
        prompt: `You are a strict API. Return ONLY a JSON object exactly like this: {"status": "success", "message": "hello world"}. DO NOT include any introductory text. DO NOT wrap it in markdown blocks.`,
        temperature: 0.1
      });
      
      console.log(`      --- Raw Output from Model ---`);
      console.log(text);
      console.log(`      -----------------------------`);
      
      const trimmedText = text.trim();
      if (trimmedText.startsWith('```')) {
        console.log(`      ⚠️ DIAGNOSIS: The model wrapped its output in markdown code blocks! This is why Vercel AI SDK's generateObject is throwing AI_NoObjectGeneratedError. It expects raw JSON without the \`\`\`json wrappers.`);
      } else if (trimmedText.startsWith('{')) {
         console.log(`      ✅ DIAGNOSIS: The model output raw JSON correctly. If generateObject still fails, it's likely a context window limit issue rather than a formatting issue.`);
      } else {
         console.log(`      ⚠️ DIAGNOSIS: The model output conversational text instead of raw JSON.`);
      }
    } catch(err) {
      console.error(`      ❌ FAILED raw diagnostic. Error: ${err.message || err.name}`);
    }

    // 4. Test safeGenerateObject wrapper
    try {
      console.log(`\n[4/4] Testing safeGenerateObject wrapper (The ultimate fallback)...`);
      const { object } = await safeGenerateObject({
        model: getModel(modelName),
        schema: diagnosticSchema,
        prompt: "Respond to this prompt by filling out the requested JSON schema. Say hello world.\n\nThe JSON object must have EXACTLY this structure:\n{\n  \"status\": \"success\" | \"failure\",\n  \"message\": \"String\"\n}",
        temperature: 0.1
      });
      
      console.log(`      ✅ SUCCESS! safeGenerateObject successfully returned structured JSON!`);
      console.log(JSON.stringify(object, null, 2));
    } catch(err) {
      allPassed = false;
      console.error(`      ❌ FAILED! safeGenerateObject couldn't extract the JSON. Error: ${err.message || err.name}`);
    }
  }

  console.log('===================================================');
  if (allPassed) {
    console.log('🎉 All models passed! The NoObjectGeneratedError in your main script is likely due to the massive context size (too many tokens) of the BrandKit Schema + Extracted HTML text exceeding the default 2048 Ollama window.');
  } else {
    console.log('⚠️ Some models failed this basic test. This means those specific models struggle with strict JSON generation out-of-the-box, or Ollama is formatting their output in a way the SDK rejects.');
  }
}

runDiagnostic();
