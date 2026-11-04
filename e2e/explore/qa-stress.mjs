import { open, signUp, shot, BASE } from './qa-lib.mjs';
const kind = process.argv[2] || 'phone';
const API = 'http://localhost:3201/api';
const tab = (page, n) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: n });
const { browser, page } = await open(kind);
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await signUp(page);
const token = await page.evaluate(() => localStorage.getItem('authToken'));
// ---- 100+ items via API (free text + ids), then load UI
const common = await (await fetch(API + '/ingredients/common')).json();
const ids = common.data.groups.flatMap((g) => g.items.map((i) => i.id));
const freeText = Array.from({ length: 40 }, (_, i) => `qa weird item ${i}`);
const all = [...ids, ...freeText];
let bulk = {};
for (let i = 0; i < all.length; i += 100) bulk = await (await fetch(API + '/ingredients/user/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ add: all.slice(i, i + 100) }) })).json();
console.log('pantry size via API:', bulk.data?.ingredients.length, bulk.message ?? '');
let t = Date.now();
await page.reload();
await page.getByRole('heading', { name: /In your kitchen \(\d+\)/ }).waitFor();
console.log('Kitchen reload -> heading ms:', Date.now() - t, await page.getByRole('heading', { name: /In your kitchen/ }).textContent());
console.log('DOM nodes:', await page.evaluate(() => document.querySelectorAll('*').length), 'scrollH', await page.evaluate(() => document.documentElement.scrollHeight));
await shot(page, `${kind}-c1-kitchen-150`);
// toggle a chip with a huge pantry: latency to aria-pressed flip
const chip = page.getByRole('button', { name: 'Tofu', exact: true });
const was = await chip.getAttribute('aria-pressed');
t = Date.now(); await chip.click(); await page.waitForFunction(([el, w]) => el.getAttribute('aria-pressed') !== w, [await chip.elementHandle(), was]);
console.log('chip toggle ms:', Date.now() - t);
t = Date.now(); await tab(page, 'Cook').click();
await page.getByRole('heading', { name: /Cook now|ingredient away|ingredients away|Nothing|empty/i }).first().waitFor({ timeout: 15000 });
console.log('Cook render ms with ~150 items:', Date.now() - t);
console.log('Cook headings:', await page.getByRole('heading', { level: 2 }).allTextContents());
await shot(page, `${kind}-c2-cook-150`);
// ---- fast tab switching
t = Date.now();
for (let i = 0; i < 30; i++) { for (const n of ['Kitchen', 'Cook', 'My recipes']) await tab(page, n).click({ noWaitAfter: true, force: true }); }
await tab(page, 'Cook').click();
await page.getByRole('region', { name: /Cook now|ingredient away/i }).first().waitFor({ timeout: 10000 }).catch(() => console.log('Cook regions not shown after tab storm'));
console.log('tab storm ms:', Date.now() - t, '| cook headings:', await page.getByRole('heading', { level: 2 }).allTextContents(), '| pageerrors', errs);
// ---- back / forward
await page.getByRole('region', { name: 'Cook now' }).getByRole('listitem').first().getByRole('button').click();
await page.getByRole('article').waitFor();
const u1 = page.url();
await page.goBack(); await page.waitForTimeout(400);
console.log('back from recipe -> cook visible:', await page.getByRole('region', { name: 'Cook now' }).isVisible().catch(() => false), 'url', page.url().replace(BASE, ''));
await page.goForward(); await page.waitForTimeout(400);
console.log('forward -> recipe visible:', await page.getByRole('article').isVisible().catch(() => false));
await page.goBack(); await page.waitForTimeout(300);
await page.goBack(); await page.waitForTimeout(600);
console.log('2nd back ->', page.url().replace(BASE, '') || '(origin)', '| body:', (await page.evaluate(() => document.body.innerText.slice(0, 80))).replace(/\n+/g, ' | '));
await page.goForward(); await page.waitForTimeout(600);
console.log('forward again -> heading:', await page.getByRole('heading', { level: 2 }).allTextContents());
// recipe: reload mid recipe
await page.getByRole('region', { name: 'Cook now' }).getByRole('listitem').first().getByRole('button').click().catch(() => {});
await page.getByRole('article').waitFor().catch(() => {});
await page.reload(); await page.waitForTimeout(1200);
console.log('reload on recipe screen ->', (await page.evaluate(() => document.body.innerText.slice(0, 100))).replace(/\n+/g, ' | '));
// kitchen back from deep: remove item then go Cook (staleness)
await tab(page, 'Kitchen').click();
console.log('pageerrors total:', errs);
await browser.close();
