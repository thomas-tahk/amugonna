import { test, expect } from '@playwright/test';
import { shot, signUp } from './helpers';

/**
 * M1 done-gate: "On my phone or my computer I put what's in my fridge and pantry into Amugonna,
 * and within seconds of finishing I see recipes I can make with it, open one, and cook the meal
 * from that screen."
 */
test('done-gate: pantry -> recipes I can cook -> open one -> cook it', async ({ page, context, browserName }, testInfo) => {
  const isPhone = testInfo.project.name === 'phone';
  if (!isPhone) await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // 1. Sign up a fresh user, land on Kitchen.
  await signUp(page);
  await expect(page.getByRole('heading', { name: 'In your kitchen (0)' })).toBeVisible();
  await shot(page, testInfo, '01-kitchen-empty');

  // 2. Tick quick picks.
  const picks = ['Eggs', 'Rice', 'Onion', 'Garlic', 'Chicken', 'Butter', 'Cheddar', 'Pasta'];
  for (const name of picks) {
    const chip = page.getByRole('button', { name, exact: true });
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.getByRole('heading', { name: `In your kitchen (${picks.length})` })).toBeVisible();
  await shot(page, testInfo, '02-quick-picks-ticked');

  // 3. Free text: Check -> chips.
  const box = page.getByRole('combobox', { name: /add ingredients/i });
  await box.fill('canned tomatoes, scalions');
  await page.getByRole('button', { name: 'Check' }).click();
  const chips = page.getByRole('list', { name: 'Items to add' });
  await expect(chips).toBeVisible();
  await expect(chips.getByRole('listitem').filter({ hasText: 'Chopped Tomatoes' })).toHaveCount(1);
  await expect(chips.getByRole('listitem').filter({ hasText: 'Green Onion' })).toHaveCount(1);
  await shot(page, testInfo, '03-free-text-confirm');

  // 4. Add -> CTA with a count.
  await page.getByRole('button', { name: 'Add 2' }).click();
  await expect(page.getByRole('heading', { name: `In your kitchen (${picks.length + 2})` })).toBeVisible();
  const cta = page.getByRole('button', { name: /See what I can cook \(\d+\)/ });
  await expect(cta).toBeVisible();
  // The count is only meaningful once saves have settled and the count request is back.
  await expect(cta).toHaveAttribute('aria-busy', 'false');
  await expect(cta).toHaveText(/\(\d+\)/);
  const n = Number(/\((\d+)\)/.exec((await cta.textContent()) ?? '')![1]);
  expect(n).toBeGreaterThan(0);
  await shot(page, testInfo, '04-kitchen-with-cta');

  // 5. Cook tab: non-empty "Cook now" within 1 s of navigation.
  const t0 = Date.now();
  await cta.click();
  const cookNow = page.getByRole('region', { name: 'Cook now' });
  await expect(cookNow).toBeVisible({ timeout: 1000 });
  const cookNowMs = Date.now() - t0;
  const cards = cookNow.getByRole('listitem');
  expect(await cards.count()).toBeGreaterThan(0);
  testInfo.annotations.push({ type: 'cook-now-render-ms', description: String(cookNowMs) });
  console.log(`[${testInfo.project.name}] Cook now rendered ${cookNowMs} ms after tapping the CTA (${await cards.count()} recipes)`);
  expect(cookNowMs).toBeLessThan(1000);
  await shot(page, testInfo, '05-cook-now');

  // 6. Open the first cook-now recipe.
  await cards.first().getByRole('button').click();
  const title = page.getByRole('article').getByRole('heading', { level: 1 });
  await expect(title).toBeVisible();
  const ingredients = page.getByRole('region', { name: 'Ingredients' });
  await expect(ingredients.getByText(/✓ Have|Assumed|using /).first()).toBeVisible();
  expect(await ingredients.getByRole('listitem').count()).toBeGreaterThan(1);
  const steps = page.getByRole('region', { name: 'Steps' }).getByRole('listitem');
  expect(await steps.count()).toBeGreaterThanOrEqual(2);
  await shot(page, testInfo, '06-recipe-top');

  // 7. Tap a step -> marked done.
  const step = steps.first().getByRole('button');
  await expect(step).toHaveAttribute('aria-pressed', 'false');
  await step.scrollIntoViewIfNeeded();
  await step.click();
  await expect(step).toHaveAttribute('aria-pressed', 'true');
  await shot(page, testInfo, '07-step-done');

  // 8. Back returns to the results.
  await page.getByRole('button', { name: '← Back' }).first().click();
  await expect(cookNow).toBeVisible();

  // 9. Open a "1 ingredient away" recipe, copy missing items.
  const oneAway = page.getByRole('region', { name: '1 ingredient away' });
  await expect(oneAway).toBeVisible();
  await oneAway.getByRole('listitem').first().getByRole('button').click();
  await expect(page.getByText(/Missing \(1\)/)).toBeVisible();
  const copy = page.getByRole('button', { name: 'Copy missing items' });
  await expect(copy).toBeVisible();
  await shot(page, testInfo, '08-one-away-recipe');
  if (!isPhone) {
    await copy.click();
    await expect(page.getByRole('button', { name: /Copied/ })).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip.trim().length).toBeGreaterThan(0);
  }

  // 10. Reload: still signed in, Kitchen still has the items.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your kitchen', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: `In your kitchen (${picks.length + 2})` })).toBeVisible();
  for (const name of picks) {
    await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.getByRole('button', { name: 'Remove Green Onion from your kitchen' })).toBeVisible();
  await shot(page, testInfo, '09-after-reload');
});
