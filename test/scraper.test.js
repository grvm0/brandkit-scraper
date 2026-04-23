import { describe, it, expect, vi } from 'vitest';
import { scrapeBrandData } from '../scraper.js';
import * as extractor from '../extractor.js';
import * as llm from '../llm.js';
import * as evaluator from '../evaluator.js';

// Mock all the sub-modules so we don't make real network or API calls
vi.mock('../extractor.js', () => ({
  extractStaticData: vi.fn(),
  extractDesignTokens: vi.fn()
}));

vi.mock('../llm.js', () => ({
  analyzeTextWithLLM: vi.fn(() => ({
    mission: 'Mock Mission',
    description: 'Mock Description',
    industry: 'Mock Industry',
    toneOfVoice: { defaultStyle: ['mocked'], doNotUse: ['slang'] },
    suggestedScenarios: []
  })),
  analyzeImagesWithLLM: vi.fn(() => ({
    vibe: 'Mock Vibe',
    colorGrading: 'Mock Colors',
    composition: 'Mock Composition'
  }))
}));

vi.mock('../evaluator.js', () => ({
  evaluateBrandKit: vi.fn(() => ({
    overallRating: 'OK',
    summary: 'Mock Summary',
    evaluations: []
  }))
}));

vi.mock('../validator.js', () => ({
  validateBrandKit: vi.fn(() => true)
}));

// Mock Playwright so it doesn't actually try to launch a browser
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(async () => ({
      newContext: vi.fn(async () => ({
        newPage: vi.fn(async () => ({
          goto: vi.fn(async () => {}),
        }))
      })),
      close: vi.fn(async () => {})
    }))
  }
}));

// Mock native fetch for the static parsing
global.fetch = vi.fn(() =>
  Promise.resolve({
    text: () => Promise.resolve('<html><body>Mock HTML</body></html>'),
  })
);

describe('Scraper Orchestrator (scraper.js)', () => {
  it('should properly fallback to staticData if dynamicData is missing properties', async () => {
    // 1. Setup the mocks to simulate the exact edge case the user pointed out
    // Make dynamicData missing colors, but staticData has it.
    extractor.extractDesignTokens.mockReturnValueOnce({ 
      typography: { headings: ['Arial'], body: ['Open Sans'] }, 
      heroImages: ['/hero.png'] 
      // Notice: colors are intentionally missing from dynamic extraction
    });
    
    extractor.extractStaticData.mockReturnValueOnce({ 
      brandName: 'Test Brand',
      logoUrl: '/logo.png',
      colors: { primary: ['#000000'], secondary: [], text: [], background: [] } // Found in static
    });
    
    // 2. Run the orchestrator
    const result = await scrapeBrandData('https://example.com');
    
    // 3. Verify it merged correctly without throwing errors
    expect(result.brandKit).toBeDefined();
    expect(result.brandKit.brandName).toBe('Test Brand');
    
    // The visualIdentity should successfully fallback to the staticData colors
    expect(result.brandKit.visualIdentity.colors.primary).toContain('#000000');
    expect(result.brandKit.visualIdentity.assets.logoUrl).toBe('/logo.png');
  });

  it('should handle the agentic loop correctly if evaluation fails initially', async () => {
    // Reset mocks for standard return values
    extractor.extractDesignTokens.mockReturnValueOnce({ 
      colors: { primary: ['#fff'] },
      typography: { headings: ['Arial'], body: ['Open Sans'] }, 
      heroImages: [] 
    });
    extractor.extractStaticData.mockReturnValueOnce({ brandName: 'Test Brand' });

    // Mock evaluateBrandKit to fail on the first attempt, then pass on the second
    evaluator.evaluateBrandKit
      .mockReturnValueOnce({
        overallRating: 'NEEDS_REVIEW',
        evaluations: [{ property: 'metadata.mission', rating: 'FAIL', rationale: 'Too brief.' }]
      })
      .mockReturnValueOnce({
        overallRating: 'OK',
        evaluations: []
      });

    // We override the max retries to ensure it doesn't spin out of control
    process.env.MAX_EVAL_RETRIES = '2';

    const result = await scrapeBrandData('https://example.com');
    
    // Since it failed once and then succeeded, evaluateBrandKit should have been called twice
    expect(evaluator.evaluateBrandKit).toHaveBeenCalledTimes(2);
    expect(result.evaluation.overallRating).toBe('OK');
  });
});
