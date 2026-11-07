import { test, expect } from '@playwright/test';
import { signUp } from './helpers';

test('paste, edit, save privately, favorite, note, reload, then cook imported recipe', async ({ page }) => {
  await signUp(page);
  await page.getByRole('button', { name: 'My recipes' }).click();
  await page.getByRole('button', { name: 'Import recipe' }).click();
  await page.getByLabel('Recipe text').fill([
    'Ginger Rice Bowl',
    'A simple weeknight bowl.',
    'Ingredients',
    '½ cup rice',
    '1 tbsp fresh ginger',
    'Instructions',
    'Rinse the rice.',
    'Cook rice with ginger until tender.',
  ].join('\n'));
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await page.getByLabel('Title', { exact: true }).fill('My Ginger Rice Bowl');
  await page.getByLabel('Korean title', { exact: true }).fill('생강밥');
  await expect(page.getByRole('button', { name: 'Save privately' })).toBeVisible();
  await page.getByRole('button', { name: 'Save privately' }).click();

  await expect(page.getByRole('heading', { name: 'My Ginger Rice Bowl' })).toBeVisible();
  await expect(page.getByText('생강밥', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Title *', { exact: true }).fill('My Edited Ginger Rice Bowl');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Edited Ginger Rice Bowl', exact: true })).toBeVisible();
  await expect(page.locator('.recipe-detail')).toContainText('½ cup');
  await page.getByRole('button', { name: 'Add to favorites' }).click();
  await page.getByLabel('Personal notes').fill('Use a little extra ginger next time.');
  await page.getByRole('button', { name: 'Save notes' }).click();
  await expect(page.getByRole('status')).toContainText('Notes saved');
  await page.reload();
  await page.getByRole('tab', { name: 'Favorites' }).click();
  await page.getByRole('button', { name: /My Edited Ginger Rice Bowl/ }).click();
  await expect(page.getByLabel('Personal notes')).toHaveValue('Use a little extra ginger next time.');
  await page.getByRole('button', { name: 'Cook this recipe' }).click();
  await expect(page).toHaveURL(/#cook\/recipe\/\d+$/);
  await expect(page.getByRole('heading', { name: 'My Edited Ginger Rice Bowl' })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('½ cup');
  await expect(page.getByText('생강밥', { exact: true })).toBeVisible();
});
