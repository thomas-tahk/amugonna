// Kitchen screenshots with /api/** mocked (no backend needed).
// Usage: start `npx vite --port 5199` in client/, then `node client/e2e/kitchen-screenshots.mjs`
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:5199';
const OUT = process.env.OUT_DIR ?? 'docs/milestones/m1-evidence';

const user = { id: 1, email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace', createdAt: '2026-01-01' };
const it = (id, name) => ({ id, name, canonical: name.toLowerCase() });
const groups = [
  ['Produce', ['Onion', 'Garlic', 'Tomato', 'Potato', 'Carrot', 'Lemon', 'Spinach', 'Bell pepper']],
  ['Dairy & eggs', ['Eggs', 'Butter', 'Milk', 'Cheddar', 'Yogurt']],
  ['Meat & fish', ['Chicken thighs', 'Ground beef', 'Bacon', 'Salmon']],
  ['Pantry', ['Rice', 'Pasta', 'Flour', 'Canned tomatoes', 'Soy sauce', 'Olive oil']],
  ['Spices', ['Cumin', 'Paprika', 'Oregano', 'Chili flakes']],
];
let nextId = 1;
const common = {
  groups: groups.map(([category, names]) => ({ category, items: names.map((n) => it(nextId++, n)) })),
  staples: [it(90, 'Water'), it(91, 'Salt'), it(92, 'Black pepper'), it(93, 'Cooking oil')],
};
const byName = Object.fromEntries(common.groups.flatMap((g) => g.items).map((i) => [i.name, i]));
const entry = (i) => ({ id: i.id + 100, userId: 1, ingredientId: i.id, addedAt: '2026-01-01', ingredient: { id: i.id, name: i.name, category: null } });
const eight = ['Onion', 'Garlic', 'Tomato', 'Eggs', 'Butter', 'Rice', 'Soy sauce', 'Chicken thighs'].map((n) => entry(byName[n]));

async function mockApi(page, pantry) {
  await page.route('**/api/**', (route) => {
    const p = new URL(route.request().url()).pathname;
    let data = {};
    if (p.endsWith('/auth/profile')) data = { user };
    else if (p.endsWith('/ingredients/common')) data = common;
    else if (p.endsWith('/ingredients/suggest')) data = { items: [] };
    else if (p.endsWith('/ingredients/user/parse')) {
      data = {
        items: [
          { input: 'eggs', name: 'Eggs', canonical: 'egg', known: true, ingredientId: byName.Eggs.id },
          { input: 'scallions', name: 'Scallions', canonical: 'scallion', known: false, ingredientId: null },
          { input: 'half a cabbage', name: 'Cabbage', canonical: 'cabbage', known: true, ingredientId: 200 },
        ],
      };
    } else if (p.endsWith('/ingredients/user/bulk')) data = { ingredients: pantry, resolved: [] };
    else if (p.endsWith('/ingredients/user')) data = { ingredients: pantry };
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  });
}

const browser = await chromium.launch();
const sizes = { '390x844': { width: 390, height: 844 }, '1280x800': { width: 1280, height: 800 } };
const errors = [];
for (const [name, viewport] of Object.entries(sizes)) {
  for (const state of ['empty', 'ticked', 'confirm']) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', (m) => m.type() === 'error' && errors.push(`${name} ${state} ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`${name} ${state} pageerror ${e.message}`));
    await mockApi(page, state === 'ticked' ? eight : []);
    await page.addInitScript((u) => {
      localStorage.setItem('authToken', 'fake');
      localStorage.setItem('user', JSON.stringify(u));
    }, user);
    await page.goto(BASE);
    await page.waitForSelector('.kitchen-group');
    if (state === 'confirm') {
      await page.getByRole('combobox').fill('eggs, scallions, half a cabbage');
      await page.getByRole('combobox').press('Enter');
      await page.waitForSelector('.kitchen-confirm');
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/kitchen-${state}-${name}.png` });
    if (state === 'ticked') {
      await page.screenshot({ path: `${OUT}/kitchen-${state}-full-${name}.png`, fullPage: true });
      const chips = await page.locator('.kitchen-chip').evaluateAll((els) => Math.min(...els.map((e) => e.getBoundingClientRect().height)));
      console.log(name, 'min chip height', chips);
    }
    console.log(name, state, 'horizontal overflow:', await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
    await ctx.close();
  }
}
await browser.close();
console.log('console errors:', errors.length ? errors : 'none');
