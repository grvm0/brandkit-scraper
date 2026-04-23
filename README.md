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
- **`llm.js`**: Houses the Generative AI logic using the official `openai` SDK configured as a universal adapter. By overriding the `baseURL`, it can pass the raw readable text and largest non-logo images to *any* online model (OpenAI, OpenRouter, Groq, Local Models) to synthesize qualitative brand data (mission, tone of voice, visual imagery style).

### Data Flow

1. **Input**: A target website URL is provided to `scraper.js`.
2. **Static Pass**: `extractor.js` parses the raw HTML to extract the brand name, logo, favicon, and clean body text.
3. **Dynamic Pass**: `extractor.js` uses Playwright to sample DOM elements (`h1`, `button`, etc.) and extracts the computed primary/secondary colors and font families. It also finds the largest hero/product images.
4. **AI Synthesis**: `llm.js` takes the text and images and prompts the configured LLM (defaulting to `gpt-4o`) to define the tone of voice, do-not-use words, mission statement, and imagery vibe.
5. **Output**: A strict `brand_kit.json` file is generated, matching the definitions in `brand_identity_schema.json`.

## The Schema (`brand_identity_schema.json`)

The output is governed by a strict JSON schema that supports:
- **Strategic Foundation**: Brand Name, Mission, Industry.
- **Visual Identity**: Colors (Hex), Typography, Assets, Imagery Style (Vibe, Composition).
- **Tone of Voice**: Default style descriptors and anti-patterns ("do not use").
- **Scenarios**: A powerful array allowing for deep-merge overrides of ANY property based on context (e.g., `socialMedia`, `darkMode`, `holidayCampaign`).

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- An LLM API Key (OpenAI, OpenRouter, Groq, Together, etc.)

### Installation

1. Clone the repository.
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your universal API Key (defaults to OpenAI):
   ```env
   LLM_API_KEY="your_api_key_here"
   ```

### Usage

Run the scraper by passing a target URL:

```bash
npm start https://example.com
```

The script will launch a headless browser, run the extraction pipeline, and output the result to a local `brand_kit.json` file.

### Switching AI Models & Providers (Universal Adapter)

Because the project uses the OpenAI SDK as a universal adapter, you can easily switch to *any* online model (Claude, Gemini, Llama, DeepSeek) by pointing to a service like OpenRouter, Groq, or a local server.

Set the following environment variables in your `.env` file or terminal:

```bash
# Example: Using Claude 3 Haiku via OpenRouter
export LLM_BASE_URL="https://openrouter.ai/api/v1"
export LLM_API_KEY="your_openrouter_api_key"
export LLM_MODEL="anthropic/claude-3-haiku"

npm start https://example.com
```
