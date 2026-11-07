import { test, expect } from '@playwright/test';
import { signUp } from './helpers';

test('Korean shelf opens a source link in an editable import preview', async ({ page }) => {
  await signUp(page);
  await page.getByRole('button', { name: 'My recipes' }).click();
  await page.getByRole('tab', { name: 'Korean shelf' }).click();
  await expect(page.getByRole('heading', { name: 'Kimchi Jjigae' })).toBeVisible();
  await expect(page.getByText('김치찌개')).toBeVisible();
  await expect(page.getByText(/other proteins and broths exist/i)).toBeVisible();

  let previewPayload: { url?: string } | undefined;
  await page.route('**/api/recipe-imports/preview', async route => {
    previewPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { draft: {
        title: 'Kimchi Jjigae', description: 'Hyosun’s kimchi-stew version', ingredients: ['kimchi', 'pork'],
        instructions: 'Simmer until tender.', sourceUrl: 'https://www.koreanbapsang.com/kimchi-jjigae-kimchi-stew/',
        sourceName: 'Korean Bapsang · Hyosun', cuisineTypes: ['Korean'], prepTime: 10, cookTime: 30, servings: 4,
      }, warnings: [] } }),
    });
  });

  await page.getByRole('button', { name: 'Preview import Kimchi Jjigae' }).click();
  await expect(page.getByRole('heading', { name: 'Import a recipe' })).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Kimchi Jjigae');
  await expect(page.getByLabel('Korean title')).toHaveValue('김치찌개');
  expect(previewPayload?.url).toBe('https://www.koreanbapsang.com/kimchi-jjigae-kimchi-stew/');
});
