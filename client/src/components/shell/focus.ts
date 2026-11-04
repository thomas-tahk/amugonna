/**
 * Move keyboard/screen-reader focus to a heading (or other element) after the screen changed.
 * Only takes focus when the person's focus was lost (on <body>) or is on the tab bar, so it never
 * steals focus from something they are using. `force` skips that check.
 */
export function focusHeading(
  el: HTMLElement | null | undefined,
  opts: { preventScroll?: boolean; force?: boolean } = {},
) {
  if (!el) return;
  const active = document.activeElement;
  const lost = !active || active === document.body || !!active.closest('nav.tabs');
  if (!lost && !opts.force) return;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: opts.preventScroll ?? false });
}
