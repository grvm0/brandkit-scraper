import { describe, it, expect, vi } from 'vitest';
import { evaluateBrandKit } from '../evaluator.js';

// Mock the 'ai' package
vi.mock('ai', () => ({
  generateObject: vi.fn(async () => {
    return {
      object: {
        evaluations: [
          {
            property: "metadata.mission",
            extractedContent: "To test software.",
            rating: "OK",
            rationale: "Clear and concise."
          },
          {
            property: "visualIdentity.colors.primary",
            extractedContent: [],
            rating: "FAIL",
            rationale: "Primary colors are missing."
          }
        ],
        overallRating: "NEEDS_REVIEW",
        summary: "Missing crucial visual identity components."
      }
    };
  })
}));

// Mock the provider module
vi.mock('../llm-provider.js', () => ({
  getModel: vi.fn(() => 'mock-evaluator-model')
}));

describe('Evaluator Module', () => {
  it('should semantically evaluate a brand kit and return an evaluation object', async () => {
    const mockBrandKit = {
      brandName: "Test Brand",
      metadata: { mission: "To test software." },
      visualIdentity: { colors: { primary: [] } }
    };

    const result = await evaluateBrandKit(mockBrandKit);
    
    expect(result).toBeDefined();
    expect(result.overallRating).toBe("NEEDS_REVIEW");
    expect(result.evaluations.length).toBe(2);
    expect(result.evaluations[1].rating).toBe("FAIL");
    expect(result.summary).toContain("Missing");
  });
});
