// Screenshots of the app shell with /api/** mocked (no backend needed).
// Usage: start `npx vite --port 5199` in client/, then `node client/e2e/shell-screenshots.mjs`
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:5199';
const OUT = process.env.OUT_DIR ?? 'docs/milestones/m1-evidence';

const user = { id: 1, email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace', createdAt: '2026-01-01' };
const ing = (id, name, category) => ({ id, name, category, commonUnits: ['g'] });
const pantry = [
  ing(1, 'Chicken thighs', 'Meat'),
  ing(2, 'Garlic', 'Produce'),
  ing(3, 'Basmati rice', 'Grains'),
].map((i, n) => ({ id: n + 1, userId: 1, ingredientId: i.id, addedAt: '2026-01-01', ingredient: i }));

async function mockApi(page) {
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    let data = {};
    if (p.endsWith('/auth/profile')) data = { user };
    else if (p.endsWith('/ingredients/user')) data = { ingredients: pantry };
    else if (p.endsWith('/ingredients/categories')) data = { categories: ['Meat', 'Produce', 'Grains'] };
    else if (p.endsWith('/ingredients')) data = { ingredients: [] };
    else if (p.endsWith('/recipes/suggestions')) data = { pantrySize: 3, suggestions: { canMakeNow: [], almostThere: [], aspirational: [] } };
    else if (p.includes('/recipes')) data = { recipes: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data }) });
  });
}

const browser = await chromium.launch();
const sizes = { '390x844': { width: 390, height: 844 }, '1280x800': { width: 1280, height: 800 } };
const errors = [];
for (const [name, viewport] of Object.entries(sizes)) {
  for (const signedIn of [false, true]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', (m) => m.type() === 'error' && errors.push(`${name} ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`${name} pageerror ${e.message}`));
    await mockApi(page);
    if (signedIn) {
      await page.addInitScript((u) => {
        localStorage.setItem('authToken', 'fake');
        localStorage.setItem('user', JSON.stringify(u));
      }, user);
    }
    await page.goto(BASE);
    await page.waitForSelector(signedIn ? 'nav[aria-label=Main] button' : 'form');
    await page.waitForTimeout(400);
    const label = signedIn ? 'signed-in' : 'signed-out';
    await page.screenshot({ path: `${OUT}/shell-${label}-${name}.png` });
    if (signedIn) {
      await page.getByRole('button', { name: 'Cook', exact: true }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/shell-signed-in-cook-${name}.png` });
      const boxes = await page.locator('nav[aria-label=Main] button').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      console.log(name, 'tab heights', boxes);
      const probe = await page.evaluate(() => {
        const b = document.createElement('button');
        b.className = 'btn btn-primary';
        b.textContent = 'probe';
        document.body.appendChild(b);
        const c = getComputedStyle(b);
        const r = { bg: c.backgroundColor, radius: c.borderRadius, minH: c.minHeight, weight: c.fontWeight };
        b.remove();
        return r;
      });
      console.log(name, 'plain .btn.btn-primary outside components:', JSON.stringify(probe));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      console.log(name, 'horizontal overflow:', overflow);
    }
    await ctx.close();
  }
}
await browser.close();
console.log('console errors:', errors.length ? errors : 'none');
