import { open, signUp, shot } from './qa-lib.mjs';
const kind = process.argv[2] || 'phone';
const { browser, page } = await open(kind);
await signUp(page);
const box = page.getByRole('combobox');
// type like a human on a phone
await box.click();
await box.pressSequentially('2 eggs, half an onion, some garlic, leftover rice, chicken thighs, spinach, parmesan, milk, butter, frozen peas, soy sauce', { delay: 5 });
await shot(page, `${kind}-01-typed`);
const tCheck = Date.now();
await page.getByRole('button', { name: 'Check' }).click();
const chips = page.getByRole('list', { name: 'Items to add' });
await chips.waitFor();
console.log('check ms', Date.now() - tCheck);
console.log('CHIPS:\n' + (await chips.innerText()));
await shot(page, `${kind}-02-confirm-chips`);
await page.screenshot({ path: `docs/milestones/m1-evidence/qa-${kind}-02b-confirm-full.png`, fullPage: true });
const add = page.getByRole('button', { name: /^Add \d+/ });
console.log('add btn:', await add.textContent());
await add.click();
await page.getByRole('heading', { name: /In your kitchen \(\d+\)/ }).waitFor();
// quick picks
for (const n of ['Cheddar', 'Pasta', 'Garlic', 'Tomato', 'Bread']) {
  const c = page.getByRole('button', { name: n, exact: true });
  if ((await c.getAttribute('aria-pressed')) !== 'true') await c.click();
}
console.log('H:', await page.getByRole('heading', { name: /In your kitchen/ }).textContent());
console.log('kitchen items:', await page.locator('[aria-label*="Remove"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))));
await shot(page, `${kind}-03-kitchen-after-add`);
const cta = page.getByRole('button', { name: /See what I can cook/ });
await cta.scrollIntoViewIfNeeded();
await shot(page, `${kind}-04-kitchen-cta`);
const t0 = Date.now();
await cta.click();
await page.getByRole('region', { name: 'Cook now' }).waitFor({ timeout: 10000 }).catch(() => console.log('NO COOK NOW REGION'));
console.log('cook ms', Date.now() - t0);
await page.waitForTimeout(500);
console.log('COOK TEXT:\n' + (await page.locator('main').innerText()));
await shot(page, `${kind}-05-cook`);
await page.screenshot({ path: `docs/milestones/m1-evidence/qa-${kind}-05b-cook-full.png`, fullPage: true });
const first = page.getByRole('region', { name: 'Cook now' }).getByRole('listitem').first().getByRole('button');
await first.click();
await page.getByRole('article').waitFor();
await page.waitForTimeout(300);
console.log('RECIPE TEXT:\n' + (await page.locator('main').innerText()));
await shot(page, `${kind}-06-recipe-top`);
await page.screenshot({ path: `docs/milestones/m1-evidence/qa-${kind}-06b-recipe-full.png`, fullPage: true });
const fs = await page.evaluate(() => {
  const r = {};
  for (const sel of ['article h1', 'article li', 'article p', 'article button', 'body']) {
    const e = document.querySelector(sel);
    if (e) r[sel] = getComputedStyle(e).fontSize + ' lh ' + getComputedStyle(e).lineHeight;
  }
  r.scrollW = document.documentElement.scrollWidth; r.clientW = document.documentElement.clientWidth;
  return r;
});
console.log('FONT', fs);
await browser.close();
