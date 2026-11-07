export const PALETTES = [
  { id: 'cream', name: 'Original', description: 'Warm cream · paprika red' },
  { id: 'porcelain', name: 'Porcelain', description: 'Neutral white · paprika red' },
  { id: 'coast', name: 'Coast', description: 'Cool blue · deep teal' },
  { id: 'midnight', name: 'Midnight', description: 'Dark navy · amber' },
] as const;

export type PaletteId = typeof PALETTES[number]['id'];
const STORAGE_KEY = 'amugonna.palette';

export function savedPalette(): PaletteId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return PALETTES.find(palette => palette.id === saved)?.id ?? 'cream';
  } catch { return 'cream'; }
}

export function selectPalette(palette: PaletteId): boolean {
  document.documentElement.dataset.palette = palette;
  try {
    localStorage.setItem(STORAGE_KEY, palette);
    return true;
  } catch { return false; }
}

export function restorePalette(): void {
  document.documentElement.dataset.palette = savedPalette();
}
