import { test, expect } from '@playwright/test';
import { signUp } from './helpers';

/**
 * The Kitchen CTA count must reflect the latest settled pantry even when the network is slow:
 * saves (POST /bulk) take +300 ms and the FIRST GET /suggestions takes +500 ms.
 */
test('CTA count is never stale under slow saves/suggestions and matches the Cook tab', async ({ page }) => {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let suggestionCalls = 0;
  await page.route('**/ingredients/user/bulk', async (route) => {
    await delay(300);
    await route.continue();
  });
  await page.route('**/recipes/suggestions', async (route) => {
    if (suggestionCalls++ === 0) await delay(500);
    await route.continue();
  });

  await signUp(page);
  await expect(page.getByRole('heading', { name: 'In your kitchen (0)' })).toBeVisible();

  const picks = ['Eggs', 'Rice', 'Onion', 'Garlic', 'Chicken', 'Butter', 'Cheddar', 'Pasta'];
  for (const name of picks) await page.getByRole('button', { name, exact: true }).click();

  await page.getByRole('combobox', { name: /add ingredients/i }).fill('canned tomatoes, scalions');
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByRole('button', { name: 'Add 2' }).click();
  await expect(page.getByRole('heading', { name: `In your kitchen (${picks.length + 2})` })).toBeVisible();

  const cta = page.getByRole('button', { name: /See what I can cook/ });
  await expect(cta).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 });
  await expect(cta).toHaveText(/\(\d+\)/);
  const n = Number(/\((\d+)\)/.exec((await cta.textContent()) ?? '')![1]);
  expect(n).toBeGreaterThan(0);

  await cta.click();
  const cookNow = page.getByRole('region', { name: 'Cook now' });
  await expect(cookNow).toBeVisible();
  await expect(cookNow.getByRole('listitem')).toHaveCount(n);
});
