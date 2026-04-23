import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { extractStaticData, extractDesignTokens } from '../extractor.js';
import { chromium } from 'playwright';

describe('Extractor Module', () => {
  describe('extractStaticData', () => {
    it('should extract metadata, logos, and readable text from raw HTML', () => {
      const mockHtml = `
        <html>
          <head>
            <title>Test Brand | Home</title>
            <link rel="icon" href="/my-favicon.ico" />
          </head>
          <body>
            <nav><a href="/">Home</a></nav>
            <img src="/logo-main.png" alt="Test Brand Logo" />
            <img src="/hero.jpg" alt="A nice hero image" />
            <main>
              <h1>Welcome to Test Brand</h1>
              <p>We build great products.</p>
            </main>
            <footer>Copyright 2026</footer>
            <script>console.log("ignore me");</script>
          </body>
        </html>
      `;

      const result = extractStaticData(mockHtml);

      expect(result.brandName).toBe('Test Brand');
      expect(result.faviconUrl).toBe('/my-favicon.ico');
      expect(result.logoUrl).toBe('/logo-main.png');
      expect(result.readableText).toContain('Welcome to Test Brand');
      expect(result.readableText).toContain('We build great products.');
      
      // Should ignore nav, footer, script
      expect(result.readableText).not.toContain('Home');
      expect(result.readableText).not.toContain('Copyright');
      expect(result.readableText).not.toContain('ignore me');
    });
  });

  describe('extractDesignTokens', () => {
    let browser;
    let page;

    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      page = await context.newPage();
    });

    afterAll(async () => {
      await browser.close();
    });

    it('should extract computed colors and fonts from a page', async () => {
      const mockHtml = `
        <html>
          <head>
            <style>
              body { font-family: 'Open Sans', sans-serif; background-color: rgb(250, 250, 250); }
              h1 { font-family: 'Montserrat', sans-serif; color: rgb(255, 0, 0); }
              button { background-color: rgb(0, 128, 0); color: rgb(255, 255, 255); }
            </style>
          </head>
          <body>
            <h1>Heading</h1>
            <p>Some text</p>
            <button>Click me</button>
          </body>
        </html>
      `;
      
      await page.setContent(mockHtml);
      
      const tokens = await extractDesignTokens(page);

      // Colors should include red, green, white, and off-white background
      expect(tokens.colors).toContain('rgb(255, 0, 0)');
      expect(tokens.colors).toContain('rgb(0, 128, 0)');
      expect(tokens.colors).toContain('rgb(255, 255, 255)');
      expect(tokens.colors).toContain('rgb(250, 250, 250)');

      // Fonts
      const headingFonts = tokens.typography.headings.join(', ');
      expect(headingFonts).toContain('Montserrat');
      
      const bodyFonts = tokens.typography.body.join(', ');
      expect(bodyFonts).toContain('Open Sans');
    });
  });
});
