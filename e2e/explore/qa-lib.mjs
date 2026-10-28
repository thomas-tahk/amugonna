import { chromium, devices } from '@playwright/test';
import path from 'node:path';
export const BASE = 'http://localhost:4201';
export const OUT = path.resolve(import.meta.dirname, '../../docs/milestones/m1-evidence');
export const PW = 'Sup3rSecret!pw';
export const email = (t = 'qa') => `${t}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
export const VIEWS = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: devices['Pixel 7'].userAgent },
  desktop: { viewport: { width: 1280, height: 800 } },
};
export async function open(kind) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(VIEWS[kind]);
  const page = await ctx.newPage();
  return { browser, ctx, page };
}
export async function signUp(page, em = email()) {
  await page.goto(BASE + '/');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('First Name').fill('Tess');
  await page.getByLabel('Last Name').fill('Tester');
  await page.getByLabel('Email').fill(em);
  await page.getByLabel('Password', { exact: true }).fill(PW);
  const c = page.getByLabel(/confirm/i);
  if (await c.count()) await c.fill(PW);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await page.getByRole('heading', { name: 'Your kitchen', exact: true }).waitFor();
  return em;
}
export const shot = (page, name, full = false) => page.screenshot({ path: `${OUT}/qa-${name}.png`, fullPage: full });
