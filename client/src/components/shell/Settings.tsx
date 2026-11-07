import { useRef, useState } from 'react';
import { PALETTES, savedPalette, selectPalette, type PaletteId } from '../../styles/palette';
import './Settings.css';

export default function Settings() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<PaletteId>(savedPalette);
  const [notice, setNotice] = useState('');
  const choose = (id: PaletteId) => {
    const saved = selectPalette(id);
    setSelected(id);
    setNotice(saved ? 'Palette saved as your default on this browser.' : 'Palette applied for this visit. Browser storage is unavailable.');
  };

  return <>
    <button type="button" className="btn btn-signout settings-toggle" aria-label="Settings" onClick={() => dialog.current?.showModal()}>
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#fffafa" stroke="#e7cdd4" strokeWidth=".6" d="M12 2C13 1 15 1.3 15.5 2.7C17 2 18.8 3 18.8 4.6C20.5 4.8 21.5 6.5 20.8 8C22.3 9 22.3 11 21 12C22.2 13.3 21.8 15.2 20.3 15.8C20.8 17.5 19.4 19.2 17.8 19C17.4 20.7 15.5 21.4 14.2 20.5C13 22 11 22 10 20.7C8.5 21.7 6.6 20.8 6.2 19.2C4.5 19.5 3 18 3.3 16.3C1.7 15.8 1.3 13.8 2.5 12.6C1 11.5 1.2 9.5 2.7 8.6C2 7 3 5.2 4.7 5C4.5 3.4 6.2 2.2 7.7 2.8C8.5 1.2 10.7 1 12 2Z" />
        <path fill="none" stroke="#f075a1" strokeWidth="1.8" strokeLinecap="round" d="M17.5 14.8C19.3 11.8 17.5 7.5 13.8 6.8C10 6 6.5 8.7 6.8 12.2C7 15.3 10.2 17.2 13 16C15.5 15 16 11.8 14 10.3C12.3 9 10.1 10.2 10.3 12C10.4 13.2 11.8 13.7 12.6 12.9" />
      </svg>
      <span className="settings-tooltip" aria-hidden="true">Settings</span>
    </button>
    <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-title">
      <div className="settings-heading">
        <h2 id="settings-title">Settings</h2>
        <button type="button" className="btn btn-secondary" aria-label="Close settings" onClick={() => dialog.current?.close()}>Close</button>
      </div>
      <fieldset className="palette-options">
        <legend>Appearance</legend>
        <p>Choose your palette. Saved automatically on this browser.</p>
        <div className="palette-grid">
          {PALETTES.map(palette => <label key={palette.id} className="palette-option">
            <span className="palette-preview" data-palette={palette.id} aria-hidden="true">
              <span className="palette-preview-header" />
              <span className="palette-preview-card"><span /><span /></span>
              <span className="palette-preview-button" />
            </span>
            <span className="palette-label"><input type="radio" name="palette" value={palette.id} checked={selected === palette.id} onChange={() => choose(palette.id)} /> <strong>{palette.name}</strong></span>
            <span className="palette-description">{palette.description}</span>
          </label>)}
        </div>
      </fieldset>
      <p className="settings-notice" role="status">{notice}</p>
    </dialog>
  </>;
}
