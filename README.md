# BrandKit Scraper

An intelligent, AI-powered web scraper designed to automatically extract a company's comprehensive brand identity from their website and structure it into a machine-readable JSON schema (a "Brand Ontology").

This tool is designed to provide Generative AI models with explicit, structured brand guidelines so they can generate on-brand content.

## Architecture

The project utilizes a hybrid extraction approach, splitting the workload between static HTML parsing, dynamic browser evaluation, and Large Language Model (LLM) synthesis.

### Modular Codebase
- **`scraper.js`**: The main orchestrator. It manages the headless browser lifecycle and assembles the final JSON payload.
- **`extractor.js`**: Handles the quantitative web parsing:
  - **Cheerio** is used for ultra-fast, static extraction of metadata (`<title>`, `<meta>`), assets (logos, favicons), and stripping out noise to get readable text.
  - **Playwright** is used for dynamic extraction. It launches a headless browser to evaluate the *actual* computed CSS styles (`window.getComputedStyle`) rendered by the browser, accurately capturing Hex colors and Typography, bypassing the need to parse raw `.css` files.
- **`llm.js`**: Houses the Generative AI logic using the **Vercel AI SDK**. It dynamically routes requests to native SDK providers (OpenAI, Anthropic, Google) or local models, generating perfectly structured JSON using Zod schemas.

### Data Flow

1. **Input**: A target website URL is provided to `scraper.js`.
2. **Static Pass**: `extractor.js` parses the raw HTML to extract the brand name, logo, favicon, and clean body text.
3. **Dynamic Pass**: `extractor.js` uses Playwright to sample DOM elements (`h1`, `button`, etc.) and extracts the computed primary/secondary colors and font families. It also finds the largest hero/product images.
4. **AI Synthesis**: `llm.js` takes the text and images and uses `generateObject` to prompt the configured LLM (defaulting to `gpt-4o`) to define the tone of voice, do-not-use words, mission statement, and imagery vibe.
5. **Validation**: `validator.js` runs a strict structural check against the JSON schema using Ajv.
6. **Agentic Semantic Evaluation**: `evaluator.js` uses the same LLM model (or a separate one via `LLM_EVAL_MODEL`) to review the extracted `brand_kit.json` and grade it ('OK', 'NEEDS_REVIEW', 'FAIL').
7. **Self-Correction Loop**: If the evaluator flags issues, the orchestration script automatically pipes those specific critiques back to the synthesis LLM for a retry. This loop continues until it receives an 'OK' rating or hits the `MAX_EVAL_RETRIES` limit.
8. **Output**: Both `brand_kit.json` and `brand_kit_evaluation.json` are saved to disk.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- At least one LLM API Key (OpenAI, Anthropic, or Google Gemini)

### Installation

1. Clone the repository.
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your preferred API Key(s):
   ```env
   OPENAI_API_KEY="your_openai_api_key"
   ANTHROPIC_API_KEY="your_anthropic_api_key"
   GEMINI_API_KEY="your_gemini_api_key"
   ```

### Usage

Run the scraper by passing a target URL:

```bash
npm start https://example.com
```

## Switching AI Models & Providers (Universal SDK)

Because the project uses the **Vercel AI SDK**, you can easily swap between providers by just providing the model name via the `LLM_MODEL` environment variable. The code natively routes to the correct provider.

### Example: Using Anthropic Claude natively
```bash
export LLM_MODEL="claude-3-5-sonnet-20240620"
npm start https://example.com
```

### Example: Using Google Gemini natively
```bash
export LLM_MODEL="gemini-1.5-pro"
npm start https://example.com
```

### Overriding the Evaluation Model & Retry Limits
By default, the evaluation model is the same as `LLM_MODEL`. For cross-model validation (recommended for production), you can override it with `LLM_EVAL_MODEL`. The max retry limit defaults to 2:
```bash
export LLM_MODEL="gpt-4o"
export LLM_EVAL_MODEL="claude-3-5-sonnet-20240620"  # Optional: use a different model for QA
export MAX_EVAL_RETRIES="3"
npm start https://example.com
```

### Running with Local Models (Ollama, LM Studio)
The universal LLM adapter natively supports OpenAI-compatible local APIs. You can route extraction and evaluation to local open-source models without needing an API key. Both `LLM_MODEL` and evaluation will use the same model by default:
```bash
export LLM_BASE_URL="http://localhost:11434/v1"
export LLM_MODEL="qwen2.5:3b"
npm start https://www.typeface.ai
```

To use a separate model for evaluation:
```bash
export LLM_BASE_URL="http://localhost:11434/v1"
export LLM_MODEL="qwen2.5:3b"
export LLM_EVAL_MODEL="qwen2.5-coder:14b"
npm start https://www.typeface.ai
```
