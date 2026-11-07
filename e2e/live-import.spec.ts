import { test, expect } from '@playwright/test';
import { signUp } from './helpers';

test.skip(!process.env.RUN_LIVE_IMPORT, 'Manual real-source verification; normal CI stays independent of publisher availability');

test('real Korean source -> reviewed private recipe -> subtitles -> cooking steps', async ({ page }, testInfo) => {
  await signUp(page);
  await page.getByRole('button', { name: 'My recipes', exact: true }).click();
  await page.getByRole('tab', { name: 'Korean shelf', exact: true }).click();
  await page.getByRole('button', { name: 'Preview import Kimchi Jjigae', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(/Kimchi/i, { timeout: 20000 });
  await expect(page.getByLabel('Korean title', { exact: true })).toHaveValue('김치찌개');
  await expect(page.getByLabel('Ingredients, one per line')).not.toHaveValue('');
  await page.screenshot({ path: `test-results/real-source-preview-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Save privately', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Kimchi Jjigae/i })).toBeVisible();
  await expect(page.getByText('김치찌개', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cook this recipe', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('김치찌개');
  const step = page.getByRole('region', { name: 'Steps', exact: true }).getByRole('button').first();
  await step.click();
  await expect(step).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: `test-results/real-source-cook-${testInfo.project.name}.png`, fullPage: true });
});
