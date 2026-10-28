// Kitchen screenshots driving the real flow, with a stateful /api/** mock (no backend needed).
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
const all = common.groups.flatMap((g) => g.items);

// Stateful mock: the pantry lives here and bulk add/remove really changes it.
function makeServer() {
  let pantry = []; // { id, name }
  let extra = 500;
  const entries = () => pantry.map((i) => ({ id: i.id + 100, userId: 1, ingredientId: i.id, addedAt: '2026-01-01', ingredient: { id: i.id, name: i.name, category: null } }));
  const resolveText = (text) => {
    const known = all.find((i) => i.name.toLowerCase() === text.toLowerCase() || i.name.toLowerCase() === text.toLowerCase().replace(/s$/, ''));
    return known ? { ...known, known: true } : { id: ++extra, name: text[0].toUpperCase() + text.slice(1), canonical: text, known: false };
  };
  return async (page) => {
    await page.route('**/api/**', (route) => {
      const req = route.request();
      const p = new URL(req.url()).pathname;
      const body = req.postData() ? JSON.parse(req.postData()) : {};
      let data = {};
      if (p.endsWith('/auth/profile')) data = { user };
      else if (p.endsWith('/ingredients/common')) data = common;
      else if (p.endsWith('/ingredients/suggest')) {
        const q = new URL(req.url()).searchParams.get('q').toLowerCase();
        data = { items: all.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 8).map((i) => ({ ...i, category: null })) };
      } else if (p.endsWith('/ingredients/user/parse')) {
        data = {
          items: body.text.split(',').map((s) => s.trim()).filter(Boolean).map((input) => {
            const r = resolveText(input);
            return { input, name: r.name, canonical: r.canonical, known: r.known, ingredientId: r.known ? r.id : null };
          }),
        };
      } else if (p.endsWith('/ingredients/user/bulk')) {
        for (const a of body.add ?? []) {
          const r = typeof a === 'number' ? all.find((i) => i.id === a) : resolveText(a);
          if (r && !pantry.some((i) => i.id === r.id)) pantry.push({ id: r.id, name: r.name });
        }
        pantry = pantry.filter((i) => !(body.remove ?? []).includes(i.id));
        data = { ingredients: entries(), resolved: [] };
      } else if (p.endsWith('/ingredients/user')) data = { ingredients: entries() };
      else if (p.endsWith('/recipes/suggestions')) {
        data = { pantrySize: pantry.length, totalRecipes: 120, cookNow: Array.from({ length: pantry.length * 2 }, (_, i) => ({ id: i })), oneAway: [], twoAway: [] };
      }
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
    });
  };
}

const browser = await chromium.launch();
const sizes = { '390x844': { width: 390, height: 844 }, '1280x800': { width: 1280, height: 800 } };
const errors = [];
for (const [name, viewport] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name} ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${name} pageerror ${e.message}`));
  await makeServer()(page);
  await page.addInitScript((u) => {
    localStorage.setItem('authToken', 'fake');
    localStorage.setItem('user', JSON.stringify(u));
  }, user);
  await page.goto(BASE);
  await page.waitForSelector('.kitchen-group');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/kitchen-empty-${name}.png` });

  // Tick 5 quick-pick chips.
  for (const n of ['Onion', 'Garlic', 'Tomato', 'Butter', 'Rice']) {
    await page.locator('.kitchen-group').getByRole('button', { name: n, exact: true }).click();
  }
  // Free text -> Check -> confirm chips.
  const input = page.getByRole('combobox');
  await input.fill('eggs, scalions');
  await page.getByRole('button', { name: 'Check' }).click();
  await page.waitForSelector('.kitchen-confirm');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/kitchen-confirm-${name}.png` });

  await page.getByRole('button', { name: 'Add 2' }).click();
  await page.getByRole('heading', { name: 'In your kitchen (7)' }).waitFor();
  await page.waitForFunction(() => document.querySelector('.kitchen-cta .btn')?.textContent?.includes('(14)'));
  console.log(name, 'CTA:', (await page.locator('.kitchen-cta .btn').textContent()).trim());
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/kitchen-ticked-${name}.png` });
  if (name === '390x844') {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/kitchen-ticked-bottom-${name}.png` });
  }
  const minChip = await page.locator('.kitchen-chip').evaluateAll((els) => Math.min(...els.map((e) => e.getBoundingClientRect().height)));
  console.log(name, 'min chip height', minChip, 'overflow:', await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
  await ctx.close();
}
await browser.close();
console.log('console errors:', errors.length ? errors : 'none');
