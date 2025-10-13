// Lightweight end-to-end test runner for join flow using puppeteer
// Usage: npm run test:e2e

const { spawn } = require('child_process');
const path = require('path');
const httpServer = require('http-server');

(async () => {
  const root = path.join(__dirname, '..', '..');
  const port = 8085;
  const server = httpServer.createServer({ root });
  server.listen(port, () => console.log(`Static server started at http://localhost:${port}`));

  // Run puppeteer test
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/join/Join.html`, { waitUntil: 'networkidle2' });

    // Click the 'Sign up as a User' card (assumes first .card is mckenzie, second is user)
    await page.waitForSelector('.card');
    const cards = await page.$$('.card');
    if (cards.length < 2) throw new Error('Expected at least 2 cards on Join page');
    await cards[1].click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    const url = page.url();
    console.log('After click, URL =', url);
    if (!url.endsWith('/auth/user-signup.html')) {
      throw new Error('Navigation did not reach user signup. Found: ' + url);
    }

    console.log('E2E join -> user signup test passed');
    await browser.close();
  } catch (err) {
    console.error('E2E test failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
})();
