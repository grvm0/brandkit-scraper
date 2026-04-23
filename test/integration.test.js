import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { scrapeBrandData } from '../scraper.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We mock ONLY the LLM layers to avoid making network requests to OpenAI/Anthropic.
// We DO NOT mock 'extractor.js' or 'playwright'. This ensures the contract
// between the scraper orchestrator and the real extractor is tested.
vi.mock('../llm.js', () => ({
  analyzeTextWithLLM: vi.fn(() => ({
    mission: 'To make testing seamless and reliable.',
    description: 'We build the best test fixtures in the world.',
    industry: 'Software Development',
    toneOfVoice: { defaultStyle: ['professional', 'empowering'], doNotUse: ['lazy', 'hacky'] },
    suggestedScenarios: [
      { name: 'developerDocs', description: 'Technical and concise tone for API documentation.' }
    ]
  })),
  analyzeImagesWithLLM: vi.fn(() => ({
    vibe: 'Corporate',
    colorGrading: 'Cool',
    composition: 'Centered'
  }))
}));

vi.mock('../evaluator.js', () => ({
  evaluateBrandKit: vi.fn(() => ({
    overallRating: 'OK',
    evaluations: []
  }))
}));

describe('E2E Integration Pipeline', () => {
  let server;
  let port;

  // Spin up a real local HTTP server serving modular mock HTML
  beforeAll(async () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'mock-website.html');
    const html = fs.readFileSync(fixturePath, 'utf8');
    
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });

    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should successfully run the full pipeline without crashing and extract data', async () => {
    const targetUrl = `http://localhost:${port}`;
    
    // Run the real scraper against the local server
    const result = await scrapeBrandData(targetUrl);
    
    // Verify the orchestrated result contains data from the REAL extractor
    expect(result.brandKit).toBeDefined();
    expect(result.brandKit.brandName).toBe('Acme Corp');
    
    // Verify static extraction
    expect(result.brandKit.visualIdentity.assets.logoUrl).toContain('/logo-main.svg');
    expect(result.brandKit.visualIdentity.assets.faviconUrl).toContain('/favicon.ico');
    
    // Verify dynamic Playwright extraction (colors)
    expect(result.brandKit.visualIdentity.colors.primary).toContain('#007aff'); // .primary-btn
    expect(result.brandKit.visualIdentity.colors.primary).toContain('#fafafa'); // body
    
    // Verify dynamic Playwright extraction (fonts)
    const headingFonts = result.brandKit.visualIdentity.typography.headings.join(', ');
    expect(headingFonts).toContain('Montserrat');
    
    // Verify hero images were successfully extracted and passed to the payload
    expect(result.brandKit.visualIdentity.imageryStyle.sampleImageUrls.length).toBeGreaterThan(0);
    expect(result.brandKit.visualIdentity.imageryStyle.sampleImageUrls[0]).toContain('/images/hero-developer.jpg');
    
    // Verify the LLM mocks injected their data
    expect(result.brandKit.metadata.mission).toBe('To make testing seamless and reliable.');
    expect(result.brandKit.scenarios[0].name).toBe('developerDocs');
  });
});
