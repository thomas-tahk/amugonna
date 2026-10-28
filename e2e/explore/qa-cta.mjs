import { open, signUp } from './qa-lib.mjs';
const { browser, page } = await open('phone');
await signUp(page);
const box = page.getByRole('combobox');
await box.fill('2 eggs, half an onion, some garlic, leftover rice, chicken thighs, spinach, parmesan, milk, butter, frozen peas, soy sauce');
await page.getByRole('button', { name: 'Check' }).click();
await page.getByRole('button', { name: /^Add \d+/ }).click();
await page.getByRole('heading', { name: /In your kitchen \(\d+\)/ }).waitFor();
for (const n of ['Cheddar', 'Pasta', 'Tomato', 'Bread']) await page.getByRole('button', { name: n, exact: true }).click();
const cta = page.getByRole('button', { name: /See what I can cook/ });
for (let i = 0; i < 8; i++) { console.log(i * 250, 'ms CTA:', await cta.textContent()); await page.waitForTimeout(250); }
await cta.click();
await page.waitForTimeout(800);
console.log((await page.getByRole('heading', { level: 2 }).allTextContents()).join(' | '));
await browser.close();
