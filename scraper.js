import { chromium } from 'playwright';
import fs from 'fs';
import { extractDesignTokens, extractStaticData } from './extractor.js';
import { analyzeTextWithLLM, analyzeImagesWithLLM } from './llm.js';
import { validateBrandKit } from './validator.js';
import { evaluateBrandKit } from './evaluator.js';

/**
 * Main scraping function that orchestrates the modular extraction and analysis
 */
export async function scrapeBrandData(url) {
  console.log(`Starting extraction for: ${url}`);
  
  // 1. Fetch raw HTML for static analysis
  console.log('Fetching raw HTML...');
  const response = await fetch(url);
  const html = await response.text();

  // 2. Extract static metadata and clean text
  const staticData = extractStaticData(html);

  // 3. Launch headless browser for dynamic token extraction
  console.log('Launching headless browser to compute styles...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle' });

  // 4. Extract computed design tokens
  const dynamicData = await extractDesignTokens(page);
  
  await browser.close();

  // --- START AGENTIC FEEDBACK LOOP ---
  const MAX_RETRIES = parseInt(process.env.MAX_EVAL_RETRIES || '2', 10);
  let attempt = 0;
  let textFeedback = "";
  let imageFeedback = "";
  let currentBrandKit = null;
  let currentEvaluation = null;

  while (attempt <= MAX_RETRIES) {
    console.log(`\n--- Synthesis Attempt ${attempt + 1}/${MAX_RETRIES + 1} ---`);
    
    const heroImages = dynamicData?.heroImages || [];
    const llmTextData = await analyzeTextWithLLM(staticData.readableText, url, process.env.LLM_MODEL, textFeedback);
    const llmImageData = await analyzeImagesWithLLM(heroImages, process.env.LLM_MODEL, imageFeedback);

    const resolveUrl = (path, base) => {
      try {
        return path ? new URL(path, base).href : "";
      } catch (e) {
        return path || "";
      }
    };

    // 6. Assemble the structured JSON Payload
    currentBrandKit = {
      brandName: staticData.brandName || url,
      metadata: {
        mission: llmTextData?.mission || "Unknown",
        description: llmTextData?.description || "Unknown",
        industry: llmTextData?.industry || "Unknown"
      },
      visualIdentity: {
        colors: dynamicData?.colors || staticData?.colors || { primary: [], secondary: [], text: [], background: [] },
        typography: dynamicData?.typography || staticData?.typography || { headings: [], body: [] },
        assets: {
          logoUrl: resolveUrl(staticData?.logoUrl || dynamicData?.logoUrl, url),
          faviconUrl: resolveUrl(staticData?.faviconUrl || dynamicData?.faviconUrl, url)
        },
        imageryStyle: {
          vibe: llmImageData?.vibe || "Unknown",
          colorGrading: llmImageData?.colorGrading || "Unknown",
          composition: llmImageData?.composition || "Unknown",
          sampleImageUrls: heroImages.slice(0, 3).map(imgUrl => resolveUrl(imgUrl, url))
        }
      },
      toneOfVoice: {
        defaultStyle: llmTextData?.toneOfVoice?.defaultStyle || [],
        doNotUse: llmTextData?.toneOfVoice?.doNotUse || []
      },
      scenarios: (llmTextData?.suggestedScenarios || []).map(scenario => ({
        name: scenario.name,
        description: scenario.description
      }))
    };

    // 7. Validate output structure (Ajv)
    validateBrandKit(currentBrandKit);

    // 8. Semantic Evaluation (LLM)
    currentEvaluation = await evaluateBrandKit(currentBrandKit);

    if (currentEvaluation && currentEvaluation.overallRating === 'OK') {
      console.log('QA Evaluation succeeded with OK rating. Ending loop.');
      break;
    } else if (attempt === MAX_RETRIES) {
      console.log('Max retries reached. Returning best effort.');
      break;
    }

    // 9. Parse feedback for the next loop
    console.log(`QA Evaluation yielded ${currentEvaluation?.overallRating}. Extracting feedback for retry...`);
    
    textFeedback = "";
    imageFeedback = "";
    
    if (currentEvaluation && currentEvaluation.evaluations) {
      currentEvaluation.evaluations.forEach(evalItem => {
        if (evalItem.rating !== 'OK') {
          const critique = `- Property '${evalItem.property}': ${evalItem.rationale}`;
          if (evalItem.property.includes('imageryStyle')) {
            imageFeedback += critique + '\n';
          } else {
            textFeedback += critique + '\n';
          }
        }
      });
    }

    attempt++;
  }
  // --- END AGENTIC FEEDBACK LOOP ---

  return { brandKit: currentBrandKit, evaluation: currentEvaluation };
}

// Ensure it runs directly from CLI
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const testUrl = process.argv[2];
  
  if (!testUrl) {
    console.error("Usage: npm start <target_url>");
    process.exit(1);
  }

  if (!process.env.LLM_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error("WARNING: No LLM API Keys found in environment. LLM analysis will fail unless using local models.");
  }

  scrapeBrandData(testUrl).then(async data => {
    fs.writeFileSync('brand_kit.json', JSON.stringify(data.brandKit, null, 2));
    console.log('\nExtraction complete. Saved to brand_kit.json');
    
    if (data.evaluation) {
      fs.writeFileSync('brand_kit_evaluation.json', JSON.stringify(data.evaluation, null, 2));
      console.log('Semantic evaluation complete. Saved to brand_kit_evaluation.json');
      console.log(`Overall Rating: ${data.evaluation.overallRating}`);
      console.log(`Summary: ${data.evaluation.summary}`);
    }
  }).catch(console.error);
}
