import { chromium } from 'playwright';
import fs from 'fs';
import { extractDesignTokens, extractStaticData } from './extractor.js';
import { analyzeTextWithLLM, analyzeImagesWithLLM } from './llm.js';

/**
 * Main scraping function that orchestrates the modular extraction and analysis
 */
export async function scrapeBrandData(url) {
  console.log(`Starting extraction for ${url}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (error) {
    console.warn(`Timeout or error loading ${url}: ${error.message}`);
  }

  const html = await page.content();
  
  // 1 & 2. Static Extraction (Metadata, Text, Logos)
  const { brandName, faviconUrl, logoUrl, readableText } = extractStaticData(html);

  const resolveUrl = (path) => {
    if (!path) return null;
    try { return new URL(path, url).href; } catch { return path; }
  };

  // 3. Dynamic Imagery Extraction
  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .map(img => ({
        src: img.src,
        area: img.width * img.height,
        isLogo: img.src.toLowerCase().includes('logo') || img.alt.toLowerCase().includes('logo')
      }))
      .filter(img => !img.isLogo && img.area > 10000)
      .sort((a, b) => b.area - a.area)
      .slice(0, 3)
      .map(img => img.src);
  });

  // 4. Dynamic Design Tokens
  const designTokens = await extractDesignTokens(page);

  await browser.close();

  // 5. LLM Analysis
  const llmTextData = await analyzeTextWithLLM(readableText, url);
  const llmImageData = await analyzeImagesWithLLM(images.map(resolveUrl));

  // 6. Assemble final Brand Kit matching the JSON schema
  const brandKit = {
    brandName: brandName,
    metadata: {
      mission: llmTextData?.mission || "",
      description: llmTextData?.description || "",
      industry: llmTextData?.industry || ""
    },
    visualIdentity: {
      colors: {
        primary: designTokens.colors.slice(0, 2),
        secondary: designTokens.colors.slice(2, 4),
        text: [], 
        background: [] 
      },
      typography: designTokens.typography,
      assets: {
        logoUrl: resolveUrl(logoUrl),
        faviconUrl: resolveUrl(faviconUrl)
      },
      imageryStyle: {
        vibe: llmImageData?.vibe || "",
        colorGrading: llmImageData?.colorGrading || "",
        composition: llmImageData?.composition || "",
        sampleImageUrls: images.map(resolveUrl)
      }
    },
    toneOfVoice: {
      defaultStyle: llmTextData?.toneOfVoice?.defaultStyle || [],
      doNotUse: llmTextData?.toneOfVoice?.doNotUse || []
    },
    scenarios: [] // Empty by default, can be customized later
  };

  return brandKit;
}

// Execution block
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const testUrl = process.argv[2];
  if (!testUrl) {
    console.error("Usage: node scraper.js <url>");
    process.exit(1);
  }
  
  if (!process.env.GEMINI_API_KEY) {
    console.error("WARNING: GEMINI_API_KEY not found in environment. LLM analysis will fail.");
  }

  scrapeBrandData(testUrl).then(data => {
    fs.writeFileSync('brand_kit.json', JSON.stringify(data, null, 2));
    console.log('Extraction complete. Saved to brand_kit.json');
  }).catch(console.error);
}
