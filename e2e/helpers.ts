import { expect, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

/** Screenshot into test-results and, with E2E_EVIDENCE=1, into docs/milestones/m1-evidence. */
export async function shot(page: Page, testInfo: TestInfo, name: string) {
  const file = `e2e-${testInfo.project.name}-${name}.png`;
  const buf = await page.screenshot({ fullPage: false });
  await testInfo.attach(file, { body: buf, contentType: 'image/png' });
  if (process.env.E2E_EVIDENCE) {
    const dir = path.join(root, 'docs/milestones/m1-evidence');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, file), buf);
  }
}

export function uniqueEmail(tag = 'e2e') {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export const PASSWORD = 'Sup3rSecret!pw';

export async function signUp(page: Page, email = uniqueEmail()) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('First Name').fill('Test');
  await page.getByLabel('Last Name').fill('Cook');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  const confirm = page.getByLabel(/confirm/i);
  if (await confirm.count()) await confirm.fill(PASSWORD);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByRole('heading', { name: 'Your kitchen', exact: true })).toBeVisible();
  return email;
}
