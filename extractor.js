import * as cheerio from 'cheerio';

/**
 * Extracts the computed styles (colors, fonts) from the page.
 */
export async function extractDesignTokens(page) {
  return await page.evaluate(() => {
    const elementsToSample = ['body', 'h1', 'h2', 'h3', 'p', 'a', 'button'];
    const colors = new Set();
    const fonts = { headings: new Set(), body: new Set() };

    const rgbToHex = (rgb) => {
      const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);
      if (!match) return rgb;
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    elementsToSample.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      const sampleSize = Math.min(elements.length, 5);
      for (let i = 0; i < sampleSize; i++) {
        const style = window.getComputedStyle(elements[i]);
        if (style.color && style.color !== 'rgba(0, 0, 0, 0)') colors.add(rgbToHex(style.color));
        if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(rgbToHex(style.backgroundColor));
        
        if (['h1', 'h2', 'h3'].includes(selector)) {
          fonts.headings.add(style.fontFamily);
        } else {
          fonts.body.add(style.fontFamily);
        }
      }
    });

    const images = Array.from(document.querySelectorAll('img'))
      .map(img => img.src)
      .filter(src => src && !src.toLowerCase().includes('logo') && !src.toLowerCase().includes('icon'));

    return {
      colors: {
        primary: Array.from(colors),
        secondary: [],
        text: [],
        background: []
      },
      typography: {
        headings: Array.from(fonts.headings),
        body: Array.from(fonts.body)
      },
      heroImages: images.slice(0, 5)
    };
  });
}

/**
 * Parses raw HTML to extract static metadata and readable text.
 */
export function extractStaticData(html) {
  const $ = cheerio.load(html);

  // 1. Metadata
  const brandName = $('title').text().split('|')[0].trim() || 'Unknown Brand';
  
  // 2. Assets (Favicon & Logo)
  const faviconUrl = $('link[rel="icon"], link[rel="shortcut icon"]').attr('href') || '/favicon.ico';
  let logoUrl = null;
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src.toLowerCase().includes('logo')) {
      if (!logoUrl) logoUrl = src; 
    }
  });

  // 3. Readable Text
  $('script, style, noscript, svg, footer, nav').remove();
  const readableText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000);

  return { brandName, faviconUrl, logoUrl, readableText };
}
