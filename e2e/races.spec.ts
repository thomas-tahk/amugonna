import { test, expect } from '@playwright/test';
import { signUp } from './helpers';

/** #13: ticking items and tapping the Cook TAB (not the CTA) inside the 0.4 s save window. */
test('tick items then immediately tap the Cook tab -> Cook shows recipes, not "kitchen is empty"', async ({ page }) => {
  await signUp(page);
  await expect(page.getByRole('heading', { name: 'In your kitchen (0)' })).toBeVisible();

  const picks = ['Eggs', 'Rice', 'Onion', 'Garlic', 'Chicken', 'Butter', 'Cheddar', 'Pasta']; // same pantry as the done-gate
  for (const name of picks) await page.getByRole('button', { name, exact: true }).click();

  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: /cook/i }).click();

  const cookNow = page.getByRole('region', { name: 'Cook now' });
  await expect(cookNow).toBeVisible();
  expect(await cookNow.getByRole('listitem').count()).toBeGreaterThan(0);
  await expect(page.getByText('Your kitchen is empty')).toHaveCount(0);

  // The ticks were saved too.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: /kitchen/i }).click();
  await expect(page.getByRole('heading', { name: `In your kitchen (${picks.length})` })).toBeVisible();
});
