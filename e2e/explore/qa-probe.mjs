import { open, signUp, shot } from './qa-lib.mjs';
const API = 'http://localhost:3201/api';
const { browser, page } = await open('phone');
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await signUp(page);
const token = await page.evaluate(() => localStorage.getItem('authToken'));
const common = await (await fetch(API + '/ingredients/common')).json();
const ids = common.data.groups.flatMap((g) => g.items.map((i) => i.id));
console.log('vocab quick-pick ids', ids.length, 'unique', new Set(ids).size);
// My recipes tab, fresh user
await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'My recipes' }).click();
await page.waitForTimeout(1000);
console.log('My recipes text:', (await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 300));
console.log('errs', errs.length, errs[0]);
await shot(page, 'phone-c3-my-recipes');
// 120 items typed into the text box
const names = Array.from({ length: 120 }, (_, i) => `thing${i}`).join(', ');
await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Kitchen' }).click();
await page.getByRole('combobox').fill(names);
await page.getByRole('button', { name: 'Check' }).click();
await page.waitForTimeout(1500);
console.log('120 typed ->', (await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 300));
await shot(page, 'phone-c4-120-typed');
const add = page.getByRole('button', { name: /^Add \d+/ });
if (await add.count()) { console.log('add label', await add.textContent()); await add.click(); await page.waitForTimeout(1500); console.log('after add heading:', await page.getByRole('heading', { name: /In your kitchen/ }).textContent(), '| alert:', await page.getByRole('alert').allTextContents()); }
await browser.close();
