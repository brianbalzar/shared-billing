import { clearActors } from './browser-start.mjs';
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.argv[2] || 'https://brianbalzar.github.io/shared-billing/');
  await clearActors(page);
  await page.getByRole('button', { name: 'Try it', exact: true }).click();
  await page.getByRole('button', { name: 'John Goodman, show linking films. Drag to pin.', exact: true }).waitFor();
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.chosen .node-button img')];
    return images.length === 2 && images.every(img => img.complete && img.naturalWidth > 0);
  });
  await page.getByRole('button', { name: 'John Goodman, show linking films. Drag to pin.', exact: true }).click();
  await page.getByRole('link', { name: 'Always', exact: true }).waitFor();
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.poster img')];
    return images.length >= 2 && images.every(img => img.complete && img.naturalWidth > 0);
  });
  await page.screenshot({ path: 'qa/live-images.png' });
  await page.getByRole('button', { name: 'About Shared Billing and its data' }).click();
  await page.waitForFunction(() => { const logo = document.querySelector('.tmdb-logo'); return logo?.complete && logo.naturalWidth > 0; });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Deployed actor headshots, evidence posters, TMDB logo, and attribution verified.');
} finally { await browser.close(); }
