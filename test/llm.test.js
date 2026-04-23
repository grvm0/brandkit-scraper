import { describe, it, expect, vi } from 'vitest';
import { analyzeTextWithLLM, analyzeImagesWithLLM } from '../llm.js';

// Mock the 'ai' package
vi.mock('ai', () => ({
  generateObject: vi.fn(async ({ prompt }) => {
    // Determine which function is calling by looking at the prompt content
    if (prompt.includes('mission statement')) {
      return {
        object: {
          mission: "Test Mission",
          description: "Test Description",
          industry: "Test Industry",
          toneOfVoice: {
            defaultStyle: ["friendly", "professional"],
            doNotUse: ["slang"]
          },
          suggestedScenarios: [
            { name: "orderSupport", description: "Overrides for customer service emails." }
          ]
        }
      };
    } else if (prompt.includes('hero images')) {
      return {
        object: {
          vibe: "Test Vibe",
          colorGrading: "Test Color Grading",
          composition: "Test Composition"
        }
      };
    }
    return { object: {} };
  })
}));

// Mock the provider modules
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: () => vi.fn(() => 'mock-openai-model')
}));
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: () => vi.fn(() => 'mock-anthropic-model')
}));
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: () => vi.fn(() => 'mock-google-model')
}));

describe('LLM Module', () => {
  it('should analyze text and return a correctly formatted object', async () => {
    const result = await analyzeTextWithLLM('Sample text content', 'https://example.com');
    expect(result).toBeDefined();
    expect(result.mission).toBe('Test Mission');
    expect(result.industry).toBe('Test Industry');
    expect(result.toneOfVoice.defaultStyle).toContain('friendly');
  });

  it('should analyze images and return a correctly formatted object', async () => {
    const result = await analyzeImagesWithLLM(['https://example.com/image.jpg']);
    expect(result).toBeDefined();
    expect(result.vibe).toBe('Test Vibe');
    expect(result.composition).toBe('Test Composition');
  });

  it('should return null if no images are provided', async () => {
    const result = await analyzeImagesWithLLM([]);
    expect(result).toBeNull();
  });

  it('should append feedback to the prompt when provided', async () => {
    const aiModule = await import('ai');
    await analyzeTextWithLLM('Sample text', 'https://example.com', 'mock-model', 'Fix the mission statement');
    
    const generateObjectCallArgs = aiModule.generateObject.mock.calls[aiModule.generateObject.mock.calls.length - 1][0];
    expect(generateObjectCallArgs.prompt).toContain('PREVIOUS QA FEEDBACK');
    expect(generateObjectCallArgs.prompt).toContain('Fix the mission statement');
  });
});
