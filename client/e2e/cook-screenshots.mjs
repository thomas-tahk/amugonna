// Screenshots of the Cook tab with /api/** mocked (no backend needed).
// Usage: start `npx vite --port 5199` in client/, then `node client/e2e/cook-screenshots.mjs`
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:5199';
const OUT = process.env.OUT_DIR ?? 'docs/milestones/m1-evidence';

const user = { id: 1, email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace', createdAt: '2026-01-01' };
const svg = (c1, c2) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/></svg>`,
  );
const m = (id, title, category, area, totalTime, imageUrl, missing = [], swaps = []) => ({
  id, title, imageUrl, category, area, totalTime, ingredientCount: 6, usedCount: 6 - missing.length, missing, swaps,
});
const need = (name) => ({ name, canonical: name });

const suggestions = {
  pantrySize: 14,
  totalRecipes: 320,
  cookNow: [
    m(1, 'Garlic Butter Chicken Thighs', 'Chicken', 'American', 35, svg('#c8250a', '#f7a600')),
    m(2, 'Egg Fried Rice', 'Side', 'Chinese', 20, null),
    m(3, 'Tomato Basil Pasta', 'Pasta', 'Italian', 25, svg('#146c2e', '#c8250a')),
    m(4, 'Spicy Chickpea Stew', 'Vegetarian', 'Moroccan', 45, null),
  ],
  oneAway: [
    m(5, 'Lemon Herb Chicken', 'Chicken', 'Greek', 40, svg('#f7a600', '#146c2e'), [need('lemon')]),
    m(6, 'Mac and Cheese', 'Pasta', 'American', 30, null, [need('milk')], [{ need: 'parmesan', using: 'cheddar' }]),
    m(7, 'Beef Tacos', 'Beef', 'Mexican', 25, svg('#1a1210', '#c8250a'), [need('tortillas')]),
  ],
  twoAway: [m(8, 'Beef Stroganoff', 'Beef', 'Russian', 50, null, [need('mushrooms'), need('sour cream')])],
};

const recipe = {
  id: 5, title: 'Lemon Herb Chicken', description: null, imageUrl: svg('#f7a600', '#146c2e'),
  category: 'Chicken', area: 'Greek', servings: 4, prepTime: 10, cookTime: 30,
  steps: [
    'Heat the oven to 200C. Pat the chicken thighs dry and season generously with salt and pepper.',
    'Mix the olive oil, minced garlic and oregano in a bowl, then rub the mixture all over the chicken.',
    'Sear the chicken skin-side down in an oven-proof pan for 5 minutes until golden, then flip.',
    'Squeeze the lemon over the pan, add the stock, and roast for 25 minutes until cooked through.',
    'Rest for 5 minutes, spoon the pan juices over the top and serve with rice.',
  ],
  sourceName: 'TheMealDB', sourceUrl: 'https://www.themealdb.com/meal/52000', attribution: 'Recipe from TheMealDB', license: null,
  isFavorite: false, isOwner: false,
  ingredients: [
    { name: 'Chicken thighs', canonical: 'chicken', measure: '800g', optional: false, status: 'have' },
    { name: 'Garlic', canonical: 'garlic', measure: '4 cloves', optional: false, status: 'have' },
    { name: 'Parmesan', canonical: 'parmesan', measure: '30g', optional: true, status: 'swap', using: 'cheddar' },
    { name: 'Lemon', canonical: 'lemon', measure: '1', optional: false, status: 'missing' },
    { name: 'Olive oil', canonical: 'olive oil', measure: '3 tbsp', optional: false, status: 'staple' },
    { name: 'Salt', canonical: 'salt', measure: null, optional: false, status: 'staple' },
  ],
};

async function setup(browser, viewport, pantrySize) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('pageerror', (e) => errors.push(`pageerror ${e.message}`));
  await page.route('**/api/**', (route) => {
    const p = new URL(route.request().url()).pathname;
    let data = {};
    if (p.endsWith('/auth/profile')) data = { user };
    else if (p.endsWith('/recipes/suggestions'))
      data = pantrySize === 0 ? { pantrySize: 0, totalRecipes: 320, cookNow: [], oneAway: [], twoAway: [] } : suggestions;
    else if (p.endsWith('/recipes/5')) data = { recipe };
    else if (p.endsWith('/ingredients/user')) data = { ingredients: [] };
    else if (p.endsWith('/ingredients/categories')) data = { categories: [] };
    else if (p.endsWith('/ingredients')) data = { ingredients: [] };
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data }) });
  });
  await page.addInitScript((u) => {
    localStorage.setItem('authToken', 'fake');
    localStorage.setItem('user', JSON.stringify(u));
  }, user);
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Cook', exact: true }).click();
  return { ctx, page, errors };
}

const browser = await chromium.launch();
const sizes = { '390x844': { width: 390, height: 844 }, '1280x800': { width: 1280, height: 800 } };
const allErrors = [];
for (const [name, viewport] of Object.entries(sizes)) {
  let { ctx, page, errors } = await setup(browser, viewport, 14);
  await page.waitForSelector('.cook-card');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/cook-results-${name}.png` });
  await page.screenshot({ path: `${OUT}/cook-results-full-${name}.png`, fullPage: true });
  await page.getByRole('button', { name: /Lemon Herb Chicken/ }).click();
  await page.waitForSelector('.cook-view-title');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/cook-view-top-${name}.png` });
  await page.locator('.cook-view-ingredients').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector('.cook-view-ingredients').scrollIntoView());
  await page.getByRole('button', { name: /^Heat the oven/ }).click();
  await page.getByRole('button', { name: 'Copy missing items' }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/cook-view-${name}.png` });
  console.log(name, 'clipboard:', JSON.stringify(await page.evaluate(() => navigator.clipboard.readText()).catch((e) => String(e))));
  await page.goBack();
  await page.waitForSelector('.cook-card');
  console.log(name, 'phone back returns to results:', await page.getByText('Cook now (4)').isVisible());
  console.log(name, 'horizontal overflow:', await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
  allErrors.push(...errors);
  await ctx.close();

  ({ ctx, page, errors } = await setup(browser, viewport, 0));
  await page.getByRole('button', { name: 'Fill your kitchen' }).waitFor();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/cook-empty-${name}.png` });
  await page.getByRole('button', { name: 'Fill your kitchen' }).click();
  console.log(name, 'Kitchen tab active after CTA:', await page.getByRole('button', { name: 'Kitchen' }).getAttribute('aria-current'));
  allErrors.push(...errors);
  await ctx.close();
}
await browser.close();
console.log('console errors:', allErrors.length ? allErrors : 'none');
