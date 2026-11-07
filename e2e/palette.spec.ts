import { test, expect } from '@playwright/test';
import { signUp } from './helpers';

test('palette settings persist across reload, cooking tabs and sign out', async ({ page }, testInfo) => {
  await signUp(page);
  if (testInfo.project.name === 'phone') await page.setViewportSize({ width: 320, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('radio', { name: /Midnight/ }).check();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'midnight');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'midnight');
  await page.getByRole('button', { name: 'Cook', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'midnight');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'midnight');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('radio', { name: /Porcelain/ }).check();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'porcelain');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
