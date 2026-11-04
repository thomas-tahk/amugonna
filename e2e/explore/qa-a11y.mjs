import { open, shot, BASE, PW, email } from './qa-lib.mjs';
const { browser, page } = await open('desktop');
const focusInfo = () => page.evaluate(() => {
  const e = document.activeElement; if (!e || e === document.body) return null;
  const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
  return { tag: e.tagName, label: (e.getAttribute('aria-label') || e.innerText || e.placeholder || e.id || '').trim().slice(0, 40), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, shadow: cs.boxShadow.slice(0, 60), vis: r.width > 0 && r.top >= 0 && r.bottom <= innerHeight };
});
async function tabTo(pred, max = 80, log = true) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const f = await focusInfo();
    if (log) console.log('  tab', i + 1, JSON.stringify(f));
    if (f && pred(f)) return f;
  }
  throw new Error('never reached target');
}
await page.goto(BASE + '/');
console.log('--- landing'); await shot(page, 'desktop-a0-landing');
console.log('first tabs:');
await tabTo((f) => /sign up/i.test(f.label), 10);
await page.keyboard.press('Enter');
await page.getByLabel('First Name').waitFor();
console.log('--- signup form: type by keyboard');
await page.getByLabel('First Name').focus();
await shot(page, 'desktop-a1-focus-input');
await page.keyboard.type('Kay');
for (const v of ['Board', email('kb'), PW, PW]) { await page.keyboard.press('Tab'); const f = await focusInfo(); console.log('  field', JSON.stringify(f)); await page.keyboard.type(v); }
await page.keyboard.press('Tab'); console.log('  next', JSON.stringify(await focusInfo()));
await page.keyboard.press('Tab'); console.log('  next', JSON.stringify(await focusInfo()));
const f = await focusInfo(); await shot(page, 'desktop-a2-focus-btn');
// submit via Enter in last field instead
await page.getByLabel('Password', { exact: true }).focus(); await page.keyboard.press('Enter');
await page.getByRole('heading', { name: 'Your kitchen', exact: true }).waitFor();
console.log('--- kitchen: focus after signup =', JSON.stringify(await focusInfo()));
console.log('--- kitchen tab order (first 12)');
for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); console.log('  ', JSON.stringify(await focusInfo())); }
// type free text w/ keyboard
await page.getByRole('combobox').focus();
await page.keyboard.type('eggs, milk, butter, bread, cheddar, tomato');
await page.keyboard.press('Tab'); console.log('after text tab:', JSON.stringify(await focusInfo()));
await page.keyboard.press('Enter');
await page.getByRole('list', { name: 'Items to add' }).waitFor();
console.log('focus after Check:', JSON.stringify(await focusInfo()));
await shot(page, 'desktop-a3-confirm');
await tabTo((f) => /^Add \d/.test(f.label), 20);
await page.keyboard.press('Enter');
await page.getByRole('heading', { name: /In your kitchen \(\d+\)/ }).waitFor();
console.log('focus after Add:', JSON.stringify(await focusInfo()));
// quick pick via space
const chip = page.getByRole('button', { name: 'Onion', exact: true }); await chip.focus(); await page.keyboard.press('Space');
console.log('onion pressed:', await chip.getAttribute('aria-pressed'));
await shot(page, 'desktop-a4-chip-focus');
// go to Cook with keyboard: find CTA
await page.waitForTimeout(800);
await tabTo((f) => /See what I can cook/.test(f.label), 150, false);
await page.keyboard.press('Enter');
await page.getByRole('region', { name: 'Cook now' }).waitFor();
console.log('focus after Cook nav:', JSON.stringify(await focusInfo()));
await shot(page, 'desktop-a5-cook');
await tabTo((f) => f.tag === 'BUTTON' && !/Kitchen|Cook$|My recipes|Sign out|Back/.test(f.label), 10);
console.log('card focused'); await shot(page, 'desktop-a6-card-focus');
await page.keyboard.press('Enter');
await page.getByRole('article').waitFor();
console.log('focus after open recipe:', JSON.stringify(await focusInfo()), ' scrollY', await page.evaluate(() => scrollY));
const step = page.getByRole('region', { name: 'Steps' }).getByRole('listitem').first().getByRole('button');
await step.focus(); await page.keyboard.press('Space');
console.log('step pressed:', await step.getAttribute('aria-pressed'));
await shot(page, 'desktop-a7-step-focus');
await page.keyboard.press('Shift+Tab');
const back = page.getByRole('button', { name: /Back/ }).first(); await back.focus(); await page.keyboard.press('Enter');
await page.getByRole('region', { name: 'Cook now' }).waitFor();
console.log('focus after Back:', JSON.stringify(await focusInfo()));

// contrast of visible text + buttons
const bad = await page.evaluate(() => {
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const parse = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { rgb: m.slice(0, 3), a: m[3] ?? 1 }; };
  const bgOf = (el) => { while (el) { const p = parse(getComputedStyle(el).backgroundColor); if (p.a > 0.9) return p.rgb; el = el.parentElement; } return [255, 255, 255]; };
  const res = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || el.offsetParent === null && cs.position !== 'fixed') continue;
    const fg = parse(cs.color).rgb, bg = bgOf(el);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5; const key = el.tagName + el.innerText.slice(0, 20);
    if (ratio < need && !seen.has(key)) { seen.add(key); res.push(`${ratio.toFixed(2)} < ${need} ${key} (${cs.color} on rgb(${bg}))`); }
  }
  return res;
});
console.log('LOW CONTRAST on Cook page:', bad);
await browser.close();
