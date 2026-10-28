// Run in the background; when it prints WAITING_FOR_SERVER_STOP, stop the API server by PID, then `touch $QA_FLAG`.
import { open, signUp, shot } from './qa-lib.mjs';
import fs from 'node:fs';
const kind = process.argv[2] || 'phone';
const tab = (page, n) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: n });
const { browser, page } = await open(kind);
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await signUp(page);
for (const n of ['Eggs', 'Butter', 'Bread']) await page.getByRole('button', { name: n, exact: true }).click();
await page.waitForTimeout(800);
// junk text mixed with a real item
await page.getByRole('combobox').fill('12345, milk');
await page.getByRole('button', { name: 'Check' }).click(); await page.waitForTimeout(800);
console.log('"12345, milk" ->', (await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 200));
await page.getByRole('button', { name: 'Cancel' }).click().catch(() => {});
await tab(page, 'Cook').click();
await page.getByRole('region', { name: 'Cook now' }).waitFor();
console.log('Cook loaded with server up');
await tab(page, 'Kitchen').click();
console.log('WAITING_FOR_SERVER_STOP');
while (!fs.existsSync(process.env.QA_FLAG)) await page.waitForTimeout(200);
await page.waitForTimeout(500);
// tick an item while server is down
const chip = page.getByRole('button', { name: 'Tofu', exact: true });
await chip.click(); await page.waitForTimeout(1500);
console.log('Tofu pressed while down:', await chip.getAttribute('aria-pressed'), '| heading:', await page.getByRole('heading', { name: /In your kitchen/ }).textContent(), '| alerts:', await page.getByRole('alert').allTextContents(), '| status:', await page.getByRole('status').allTextContents());
await shot(page, `${kind}-d1-kitchen-server-down`);
await tab(page, 'Cook').click(); await page.waitForTimeout(2500);
console.log('Cook while down ->', (await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 300));
await shot(page, `${kind}-d2-cook-server-down`);
const retry = page.getByRole('button', { name: /try again|retry/i });
if (await retry.count()) { await retry.click(); await page.waitForTimeout(1500); console.log('after Try again (still down):', (await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 200)); }
// open a recipe route while down? sign out while down
await page.getByRole('button', { name: 'Sign out' }).click(); await page.waitForTimeout(800);
console.log('sign out while down ->', (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 120));
console.log('pageerrors', errs);
await browser.close();
