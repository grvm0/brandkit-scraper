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
5. **Output**: A strict `brand_kit.json` file is generated, matching the definitions in `brand_identity_schema.json`.

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

### Example: Using Local Models (Ollama, LM Studio)
You can point the OpenAI provider to any custom `baseURL` to interact with local, open-source models:
```bash
export LLM_BASE_URL="http://localhost:11434/v1"
export LLM_MODEL="llama3"
npm start https://example.com
```
