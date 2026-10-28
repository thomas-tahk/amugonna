import { test, expect, type Page } from '@playwright/test';
import { signUp, uniqueEmail, PASSWORD, shot } from '../helpers';

const have = (page: Page, n: number) => page.getByRole('heading', { name: `In your kitchen (${n})` });
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name });
const chip = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const kitchenH = (page: Page) => page.getByRole('heading', { name: 'Your kitchen', exact: true });

test('1 empty pantry -> Cook shows the empty state', async ({ page }, ti) => {
  await signUp(page);
  await tab(page, 'Cook').click();
  await expect(page.getByRole('heading', { name: 'Your kitchen is empty' })).toBeVisible();
  await shot(page, ti, 'x1-cook-empty');
  await page.getByRole('main').getByRole('button').last().click();
  await expect(kitchenH(page)).toBeVisible();
});

test('2 unknown item "yuzu kosho"', async ({ page }, ti) => {
  await signUp(page);
  await page.getByRole('combobox').fill('yuzu kosho');
  await page.getByRole('button', { name: 'Check' }).click();
  const chips = page.getByRole('list', { name: 'Items to add' });
  await expect(chips).toContainText('new');
  await page.getByRole('button', { name: 'Add 1' }).click();
  await expect(have(page, 1)).toBeVisible();
  await shot(page, ti, 'x2-unknown');
  await tab(page, 'Cook').click();
  await page.waitForTimeout(500);
  console.log('Cook headings with only unknown item:', await page.getByRole('heading').allTextContents());
  await page.reload();
  await expect(have(page, 1)).toBeVisible();
});

test('3a rapid toggling 10 different chips settles and persists', async ({ page }) => {
  await signUp(page);
  const names = ['Onion', 'Garlic', 'Ginger', 'Carrot', 'Celery', 'Potato', 'Eggs', 'Milk', 'Butter', 'Rice'];
  for (const n of names) await chip(page, n).click();
  await expect(have(page, 10)).toBeVisible();
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(have(page, 10)).toBeVisible();
});

test('3b one chip tapped 10 times quickly ends off and stays off after reload', async ({ page }) => {
  await signUp(page);
  const c = chip(page, 'Onion');
  for (let i = 0; i < 10; i++) await c.click();
  await expect(c).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(have(page, 0)).toBeVisible();
  await expect(chip(page, 'Onion')).toHaveAttribute('aria-pressed', 'false');
});

for (const len of [80, 81, 500]) {
  test(`4 item name of ${len} chars`, async ({ page }, ti) => {
    await signUp(page);
    const name = 'x'.repeat(len);
    await page.getByRole('combobox').fill(name);
    await page.getByRole('button', { name: 'Check' }).click();
    await page.waitForTimeout(800);
    await shot(page, ti, `x4-${len}`);
    const addBtn = page.getByRole('button', { name: /^Add \d+$/ });
    if (await addBtn.count()) {
      await addBtn.click();
      await page.waitForTimeout(800);
    }
    const alerts = await page.getByRole('alert').allTextContents();
    const added = await have(page, 1).count();
    console.log(`len=${len} alerts=${JSON.stringify(alerts)} addedToKitchen=${added}`);
    expect(added > 0 || alerts.length > 0, 'neither added nor an error shown').toBeTruthy();
    for (const a of alerts) expect(a).not.toMatch(/500|undefined|\[object|Unexpected token/i);
  });
}

test('5a reload mid-flow: confirm chips are gone cleanly, nothing saved', async ({ page }) => {
  await signUp(page);
  await page.getByRole('combobox').fill('eggs, rice');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByRole('list', { name: 'Items to add' })).toBeVisible();
  await page.reload();
  await expect(have(page, 0)).toBeVisible();
});

test('5b tick a chip and reload immediately: the tap is not lost', async ({ page }) => {
  await signUp(page);
  await chip(page, 'Eggs').click();
  await page.reload();
  await expect(kitchenH(page)).toBeVisible();
  await expect(have(page, 1), 'tick lost on immediate reload').toBeVisible();
});

test('5c reload while inside a recipe', async ({ page }) => {
  await signUp(page);
  for (const n of ['Eggs', 'Butter', 'Cheddar']) await chip(page, n).click();
  await page.getByRole('button', { name: /See what I can cook/ }).click();
  await page.getByRole('region', { name: 'Cook now' }).getByRole('button').first().click();
  await expect(page.locator('h1.cook-view-title')).toBeVisible();
  await page.reload();
  await page.waitForTimeout(800);
  console.log('after reload inside recipe, headings:', await page.getByRole('heading').allTextContents());
});

test('6 log out then back in keeps the pantry', async ({ page }) => {
  const email = await signUp(page);
  await chip(page, 'Eggs').click();
  await expect(have(page, 1)).toBeVisible();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(have(page, 1)).toBeVisible();
  await expect(chip(page, 'Eggs')).toHaveAttribute('aria-pressed', 'true');
});

test('6b second user does not see first user pantry on the same browser', async ({ page }) => {
  await signUp(page);
  await chip(page, 'Eggs').click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await signUp(page, uniqueEmail('other'));
  await expect(have(page, 0)).toBeVisible();
});

test('7 two tabs editing the pantry end up merged, not clobbered', async ({ page, context }) => {
  await signUp(page);
  const b = await context.newPage();
  await b.goto('/');
  await expect(kitchenH(b)).toBeVisible();
  await chip(page, 'Eggs').click();
  await chip(b, 'Rice').click();
  await expect(have(page, 1)).toBeVisible();
  await expect(have(b, 1)).toBeVisible();
  await page.waitForTimeout(1500);
  await page.reload();
  await b.reload();
  await expect(have(page, 2), 'tab A after reload').toBeVisible();
  await expect(have(b, 2), 'tab B after reload').toBeVisible();
});

test('7b two tabs: B removes Eggs, stale A still shows it; A then adds Milk; A shows what after reload', async ({ page, context }) => {
  await signUp(page);
  await chip(page, 'Eggs').click();
  await page.waitForTimeout(1000);
  const b = await context.newPage();
  await b.goto('/');
  await expect(have(b, 1)).toBeVisible();
  await chip(b, 'Eggs').click();
  await b.waitForTimeout(1000);
  await chip(page, 'Milk').click();
  await page.waitForTimeout(1500);
  const heading = await page.getByRole('heading', { name: /In your kitchen/ }).textContent();
  console.log('A after stale add (expect Milk only => 1):', heading, '| Eggs pressed in A:', await chip(page, 'Eggs').getAttribute('aria-pressed'));
  await page.reload();
  console.log('A after reload:', await page.getByRole('heading', { name: /In your kitchen/ }).textContent());
});

test('8 back button after opening a recipe then switching tabs', async ({ page }) => {
  await signUp(page);
  for (const n of ['Eggs', 'Butter', 'Cheddar']) await chip(page, n).click();
  await page.getByRole('button', { name: /See what I can cook/ }).click();
  await page.getByRole('region', { name: 'Cook now' }).getByRole('button').first().click();
  await expect(page.locator('h1.cook-view-title')).toBeVisible();
  await tab(page, 'Kitchen').click();
  await expect(kitchenH(page)).toBeVisible();
  await page.goBack();
  console.log('after goBack:', await page.getByRole('heading').allTextContents(), page.url());
  await tab(page, 'Cook').click();
  console.log('Cook tab after returning:', await page.getByRole('heading').allTextContents());
  // Further Back leaves the site (about:blank): the app has no history entries of its own beyond recipe views. Expected.
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});

test('9 slow bulk (2s): navigate to Cook right after ticking shows the new pantry', async ({ page }, ti) => {
  await signUp(page);
  await page.route('**/ingredients/user/bulk', async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });
  for (const n of ['Eggs', 'Butter', 'Cheddar']) await chip(page, n).click();
  await tab(page, 'Cook').click();
  await page.waitForTimeout(300);
  await shot(page, ti, 'x9-cook-300ms');
  console.log('Cook @300ms:', await page.getByRole('heading').allTextContents());
  await expect(page.getByRole('region', { name: 'Cook now' }), 'Cook now should reflect ticked items once saved').toBeVisible({ timeout: 6000 });
  console.log('Cook @settled:', await page.getByRole('heading').allTextContents());
});

test('9b failed bulk shows an error and reverts', async ({ page }) => {
  await signUp(page);
  await page.route('**/ingredients/user/bulk', (r) => r.abort());
  await chip(page, 'Eggs').click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(chip(page, 'Eggs')).toHaveAttribute('aria-pressed', 'false');
});

test('10 keyboard only: type, Enter, Add', async ({ page }) => {
  await signUp(page);
  await page.getByRole('combobox').focus();
  await page.keyboard.type('eggs, rice');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Add 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Add 2' }).focus();
  await page.keyboard.press('Enter');
  await expect(have(page, 2)).toBeVisible();
});

test('11 double click Check / Add does not duplicate', async ({ page }) => {
  await signUp(page);
  await page.getByRole('combobox').fill('eggs');
  await page.getByRole('button', { name: 'Check' }).dblclick();
  await page.getByRole('button', { name: 'Add 1' }).dblclick();
  await page.waitForTimeout(1000);
  await expect(have(page, 1)).toBeVisible();
});

test('9c fast network: tick Eggs/Butter/Cheddar then tap the Cook TAB right away (not the CTA)', async ({ page }, ti) => {
  await signUp(page);
  for (const n of ['Eggs', 'Butter', 'Cheddar']) await chip(page, n).click();
  await tab(page, 'Cook').click();
  await page.waitForTimeout(1500);
  console.log('9c Cook after 1.5s:', await page.getByRole('heading').allTextContents());
  await shot(page, ti, 'x9c-cook-tab-race');
  await expect(page.getByRole('region', { name: 'Cook now' }), 'tab-switch right after ticking should still show Cook now').toBeVisible({ timeout: 1000 });
});

test('9d slow bulk then tab to Cook: after the save lands, does Cook ever update?', async ({ page }) => {
  await signUp(page);
  await page.route('**/ingredients/user/bulk', async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });
  for (const n of ['Eggs', 'Butter', 'Cheddar']) await chip(page, n).click();
  await tab(page, 'Cook').click();
  await page.waitForTimeout(5000);
  console.log('9d Cook @5s:', await page.getByRole('heading').allTextContents());
  await tab(page, 'Kitchen').click();
  console.log('9d Kitchen after:', await page.getByRole('heading', { name: /In your kitchen/ }).textContent());
});
