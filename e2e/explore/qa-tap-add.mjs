// Real touch tap at the centre of the "Add N" button (no scrollIntoView), as a thumb would.
import { open, signUp, shot } from './qa-lib.mjs';
const { browser, page } = await open('phone');
await signUp(page);
await page.getByRole('combobox').fill('2 eggs, half an onion, some garlic, leftover rice, chicken thighs, spinach, parmesan, milk, butter, frozen peas, soy sauce');
await page.getByRole('button', { name: 'Check' }).click();
await page.getByRole('list', { name: 'Items to add' }).waitFor();
const r = await page.getByRole('button', { name: /^Add \d+/ }).boundingBox();
console.log('Add button box', JSON.stringify(r));
await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
await page.waitForTimeout(1200);
console.log('after tap on Add ->', (await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 160));
await shot(page, 'phone-b6-tap-add-hits-cta');
await browser.close();
