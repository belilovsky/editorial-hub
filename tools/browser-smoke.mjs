import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4177);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  const cleanPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const target = path.normalize(path.join(root, cleanPath));
  if (!target.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': mime[path.extname(target)] || 'application/octet-stream' });
    res.end(data);
  });
});

await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const failures = [];

async function check(condition, message) {
  if (!condition) failures.push(message);
}

try {
  await page.goto(`http://127.0.0.1:${port}/#sources`, { waitUntil: 'networkidle' });
  await check(await page.locator('h1.section-title').innerText() === 'Источники', 'sources section should render');
  await check(await page.locator('button[data-group][aria-controls]').count() > 0, 'nav group buttons should have aria-controls');

  const tocLink = page.locator('.toc a').first();
  const tocText = await tocLink.innerText();
  await tocLink.click();
  await page.waitForTimeout(120);
  await check(page.url().includes('#sources::'), 'TOC should use section::heading hash');
  await check(await page.locator('h1.section-title').innerText() === 'Источники', 'TOC click should keep current section');
  await check((await page.locator('#routeAnnouncer').innerText()).includes('Источники'), 'route announcer should describe active section');
  await check(tocText.length > 0, 'TOC link text should be visible');

  await page.goto(`http://127.0.0.1:${port}/#unknown-section`, { waitUntil: 'networkidle' });
  await check(await page.locator('h1.section-title').innerText() === 'Раздел не найден', 'unknown hash should show section 404');
  await check(await page.locator('.nav-group a.active').count() === 0, 'unknown hash should not mark a random nav link active');

  await page.goto(`http://127.0.0.1:${port}/#overview`, { waitUntil: 'networkidle' });
  const firstGroup = page.locator('button[data-group]').first();
  const controlledId = await firstGroup.getAttribute('aria-controls');
  await firstGroup.click();
  await check(await firstGroup.getAttribute('aria-expanded') === 'false', 'group should collapse on click');
  await check(await page.locator(`#${controlledId}`).evaluate(el => el.classList.contains('collapsed')), 'controlled group list should collapse');
  await page.locator('#nav a[href="#sources"]').click();
  await page.waitForTimeout(120);
  const sameGroup = page.locator(`#${await firstGroup.getAttribute('id')}`);
  await check(await sameGroup.getAttribute('aria-expanded') === 'false', 'group collapsed state should survive section navigation');

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'golden-paper'));
  const linkColor = await page.locator('a[href="#sources"]').evaluate(el => getComputedStyle(el).color);
  await check(linkColor !== 'rgb(255, 255, 255)', 'golden-paper link color should be readable, not white');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await check(await page.locator('#menuToggle').getAttribute('aria-expanded') === 'false', 'mobile menu should start collapsed');
  await check(await page.locator('#nav').evaluate(el => el.classList.contains('nav-collapsed')), 'mobile nav should start collapsed');
  await page.locator('#menuToggle').click();
  await check(await page.locator('#menuToggle').getAttribute('aria-expanded') === 'true', 'mobile menu toggle should update aria-expanded');
  await check(await page.locator('#nav').evaluate(el => !el.classList.contains('nav-collapsed')), 'mobile menu toggle should expand nav');
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error('browser-smoke: FAIL');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('browser-smoke: PASS');
