import { test, expect } from '@playwright/test';
import { signUp } from './helpers';

test('save a discovered recipe and find it in the favorites collection', async ({ page }) => {
  await signUp(page);
  for (const name of ['Eggs', 'Rice', 'Onion', 'Garlic', 'Chicken', 'Butter', 'Cheddar', 'Pasta']) {
    await page.getByRole('button', { name, exact: true }).click();
  }
  await page.getByRole('button', { name: /See what I can cook/ }).click();
  await page.getByRole('region', { name: 'Cook now', exact: true }).getByRole('button').first().click();
  const title = await page.getByRole('article').getByRole('heading', { level: 1 }).innerText();
  await page.getByRole('button', { name: 'Add to favorites', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove from favorites', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'My recipes', exact: true }).click();
  await page.getByRole('tab', { name: 'Favorites', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
});
