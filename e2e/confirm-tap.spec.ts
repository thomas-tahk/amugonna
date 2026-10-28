import { test, expect } from '@playwright/test';
import { shot, signUp } from './helpers';

/**
 * QA #16: with ~11 chips in the confirm panel, the sticky "See what I can cook" bar used to cover the
 * Add / Cancel buttons on a phone, so a real tap did nothing. No force, no scrolling by the test.
 */
test('phone: a real tap on Add works with an 11-item paste', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'phone layout only');
  await signUp(page);

  await page
    .getByRole('combobox', { name: /add ingredients/i })
    .fill('2 eggs, half an onion, some garlic, leftover rice, chicken thighs, spinach, parmesan, milk, butter, frozen peas, soy sauce');
  await page.getByRole('button', { name: 'Check' }).click();
  const chips = page.getByRole('list', { name: 'Items to add' });
  await expect(chips.getByRole('listitem')).toHaveCount(11);

  // Focus moved to the panel heading, the sticky CTA is out of the way, and Add is on screen.
  await expect(page.getByRole('heading', { name: /Here is what we found/ })).toBeFocused();
  await expect(page.getByRole('button', { name: /See what I can cook/ })).toBeHidden();
  const add = page.getByRole('button', { name: 'Add 11' });
  await expect(add).toBeInViewport({ ratio: 1 });
  await shot(page, testInfo, 'confirm-11-chips');

  // The tap lands on Add itself, not on whatever floats over it.
  const box = (await add.boundingBox())!;
  const topmost = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.textContent ?? '',
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(topmost).toContain('Add 11');

  await add.click(); // real click, no force
  await expect(page.getByRole('heading', { name: /In your kitchen \(([1-9]|1\d)\)/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Items to add' })).toBeHidden();
  await expect(page.getByRole('button', { name: /See what I can cook/ })).toBeVisible();
  await expect(page.getByRole('combobox', { name: /add ingredients/i })).toBeFocused();
});
