const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query param ?q= is required' });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  const searchUrl = `https://www.etsy.com/search?q=${encodeURIComponent(query)}`;

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-search-results]');

    const results = await page.evaluate(() => {
      const items = [];
      const titles = document.querySelectorAll('[data-search-results] h3');
      titles.forEach(el => {
        const text = el.innerText.trim();
        if (text) items.push(text);
      });
      return items.slice(0, 20);
    });

    await browser.close();
    res.json({ query, niches: results });

  } catch (err) {
    await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (_, res) => res.send('Etsy scraper is live. Use /search?q=your+keyword'));

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
