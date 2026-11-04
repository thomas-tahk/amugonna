import { open, signUp, shot, BASE, PW, email } from './qa-lib.mjs';
const log = (...a) => console.log(...a);
const kind = process.argv[2] || 'phone';
const text = async (page) => (await page.locator('main, [role=alert], body').first().innerText()).replace(/\n+/g, ' | ').slice(0, 400);

// ---- A. sign-up validation
{
  const { browser, page } = await open(kind);
  await page.goto(BASE + '/');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByRole('button', { name: 'Create Account' }).click();
  await page.waitForTimeout(300);
  log('A1 empty submit ->', await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 300)));
  await shot(page, `${kind}-b1-signup-empty`);
  const fill = async (f, l, e, p, c) => {
    await page.getByLabel('First Name').fill(f); await page.getByLabel('Last Name').fill(l);
    await page.getByLabel('Email').fill(e); await page.getByLabel('Password', { exact: true }).fill(p);
    const cf = page.getByLabel(/confirm/i); if (await cf.count()) await cf.fill(c ?? p);
  };
  const submit = async (tag) => { await page.getByRole('button', { name: 'Create Account' }).click(); await page.waitForTimeout(700); log(tag, '->', await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 260)), '| url', page.url().replace(BASE, '')); };
  await fill('A', 'B', 'not-an-email', PW); await submit('A2 bad email');
  await fill('A', 'B', email(), 'short1'); await submit('A3 short pw');
  await fill('A', 'B', email(), 'alllowercase'); await submit('A4 weak pw (no digit/upper)'); await shot(page, `${kind}-b2-signup-error`);
  
  await browser.close();
}
// ---- B. duplicate email + wrong password + double submit
{
  const { browser, page, ctx } = await open(kind);
  const em = await signUp(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Email').waitFor();
  await page.getByLabel('Email').fill(em); await page.getByLabel('Password', { exact: true }).fill('WrongPass1!');
  await page.getByRole('button', { name: 'Sign In' }).click(); await page.waitForTimeout(700);
  log('B1 wrong password ->', await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 260)));
  await shot(page, `${kind}-b3-wrong-password`);
  await page.getByLabel('Email').fill('nobody-' + em); await page.getByRole('button', { name: 'Sign In' }).click(); await page.waitForTimeout(700);
  log('B2 unknown user ->', await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 260)));
  // duplicate signup
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('First Name').fill('D'); await page.getByLabel('Last Name').fill('Up');
  await page.getByLabel('Email').fill(em); await page.getByLabel('Password', { exact: true }).fill(PW);
  const cf = page.getByLabel(/confirm/i); if (await cf.count()) await cf.fill(PW);
  await page.getByRole('button', { name: 'Create Account' }).click(); await page.waitForTimeout(700);
  log('B3 duplicate email ->', await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 260)));
  // double submit sign-in
  await page.getByRole('button', { name: /Sign in/i }).last().click().catch(() => {});
  await page.getByLabel('Email').fill(em); await page.getByLabel('Password', { exact: true }).fill(PW);
  const btn = page.getByRole('button', { name: 'Sign In' });
  await btn.dblclick(); await page.waitForTimeout(1200);
  log('B4 double-click sign in -> heading', await page.getByRole('heading', { level: 1 }).allTextContents(), await page.getByRole('heading', { name: 'Your kitchen', exact: true }).count());
  await browser.close();
}
// ---- C. garbage / expired / tampered tokens
{
  for (const [name, tok, usr] of [['garbage', 'not.a.jwt', '{"id":1}'], ['empty-string-ish', ' ', 'null'], ['expired-looking', 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEsImV4cCI6MX0.sig', '{"id":1,"firstName":"X","email":"x@x.com"}'], ['broken user json', 'x', '{broken']]) {
    const { browser, page } = await open(kind);
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(BASE + '/');
    await page.evaluate(([t, u]) => { localStorage.setItem('authToken', t); localStorage.setItem('user', u); }, [tok, usr]);
    await page.reload(); await page.waitForTimeout(1200);
    const body = await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 120));
    log('C', name, '-> ', body, '| pageerrors', errs.length, errs[0] ?? '', '| ls token after:', await page.evaluate(() => localStorage.getItem('authToken')));
    if (name === 'garbage') await shot(page, `${kind}-b4-garbage-token`);
    await browser.close();
  }
  // token valid-signature-but-removed mid-session: signed in, then token goes bad before Cook
  const { browser, page } = await open(kind);
  await signUp(page);
  await page.getByRole('button', { name: 'Eggs', exact: true }).click();
  await page.waitForTimeout(500);
  await page.evaluate(() => localStorage.setItem('authToken', 'garbage'));
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Cook' }).click(); await page.waitForTimeout(1200);
  log('C5 token turned bad mid-session, tap Cook ->', await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 260)));
  await shot(page, `${kind}-b5-token-bad-midsession`);
  await browser.close();
}
