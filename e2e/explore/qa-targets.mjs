import { open, signUp } from './qa-lib.mjs';
const { browser, page } = await open('phone');
await signUp(page);
const small = () => page.evaluate(() => [...document.querySelectorAll('button, a, input, [role=button]')].map((e) => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute('aria-label') || e.innerText || e.placeholder || '').trim().slice(0, 28), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.w > 0 && (x.h < 44 || x.w < 44)));
console.log('kitchen small targets:', JSON.stringify(await small()));
await page.getByRole('combobox').fill('2 eggs, half an onion, some garlic, leftover rice, chicken thighs, spinach, parmesan, milk, butter, frozen peas, soy sauce');
await page.getByRole('button', { name: 'Check' }).click();
await page.getByRole('list', { name: 'Items to add' }).waitFor();
console.log('confirm small targets:', JSON.stringify(await small()));
// is Add button overlapped by sticky CTA at this scroll?
const o = await page.evaluate(() => { const add = [...document.querySelectorAll('button')].find((b) => /^Add \d/.test(b.innerText)); const r = add.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { addTop: r.top, addBottom: r.bottom, vh: innerHeight, topElement: el?.innerText?.slice(0, 40) }; });
console.log('Add button overlap check (no scroll):', JSON.stringify(o));
await browser.close();
