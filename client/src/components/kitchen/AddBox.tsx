import React, { useEffect, useId, useRef, useState } from 'react';
import { kitchenApi } from '../../services/kitchenApi';
import type { ParsedItem, SuggestItem } from '../../types/kitchen';

interface Props {
  /** Add one known ingredient picked from type-ahead. */
  onPick: (item: SuggestItem) => void;
  /** Add several free-text strings; resolves when saved, rejects with a readable error. */
  onAddTexts: (texts: string[]) => Promise<void>;
}

const AddBox: React.FC<Props> = ({ onPick, onAddTexts }) => {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [active, setActive] = useState(-1);
  const [parsed, setParsed] = useState<ParsedItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const listId = useId();

  // Debounced type-ahead (~150ms); stale responses are ignored.
  useEffect(() => {
    const q = text.trim();
    const mine = ++seq.current;
    if (!q || parsed) return;
    const t = setTimeout(() => {
      kitchenApi
        .suggest(q)
        .then((items) => {
          if (seq.current === mine) {
            setSuggestions(items);
            setActive(-1);
          }
        })
        .catch(() => {
          if (seq.current === mine) setSuggestions([]);
        });
    }, 150);
    return () => clearTimeout(t);
  }, [text, parsed]);

  const reset = () => {
    seq.current++;
    setText('');
    setSuggestions([]);
    setActive(-1);
    setParsed(null);
  };

  const pick = (item: SuggestItem) => {
    onPick(item);
    reset();
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) return pick(suggestions[active]);
    const value = text.trim();
    if (!value || busy) return;
    seq.current++;
    setBusy(true);
    setError(null);
    try {
      const items = await kitchenApi.parse(value);
      if (items.length === 0) setError('Nothing to add. Try something like "eggs, scallions".');
      else {
        setParsed(items);
        setSuggestions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that.');
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setActive(-1);
    }
  };

  const confirm = async () => {
    if (!parsed?.length) return;
    setBusy(true);
    setError(null);
    try {
      await onAddTexts(parsed.map((p) => p.input));
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const showList = suggestions.length > 0 && !parsed && text.trim() !== '';

  return (
    <section className="kitchen-add" aria-label="Add to your kitchen">
      <form onSubmit={submit} className="kitchen-add-form">
        <label htmlFor={`${listId}-input`} className="visually-hidden">
          Add ingredients to your kitchen
        </label>
        <div className="kitchen-add-field">
          <input
            id={`${listId}-input`}
            className="input"
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            enterKeyHint="go"
            placeholder="Add anything — e.g. eggs, scallions, half a cabbage"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setParsed(null);
              setError(null);
              if (!e.target.value.trim()) setSuggestions([]);
            }}
            onKeyDown={onKeyDown}
          />
          {showList && (
            <ul id={listId} role="listbox" className="kitchen-suggest card" aria-label="Suggestions">
              {suggestions.map((s, i) => (
                <li
                  key={s.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className="kitchen-suggest-item"
                  data-active={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                >
                  <span>{s.name}</span>
                  {s.category && <span className="kitchen-suggest-cat">{s.category}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" className="btn btn-secondary" disabled={busy || !text.trim()}>
          Check
        </button>
      </form>

      {error && (
        <p role="alert" className="kitchen-error">
          {error}
        </p>
      )}

      {parsed && (
        <div className="kitchen-confirm card">
          <p className="kitchen-confirm-title">Here is what we found. Tap × to drop anything wrong.</p>
          <ul className="kitchen-chips" aria-label="Items to add">
            {parsed.map((p, i) => (
              <li key={`${p.input}-${i}`}>
                <span className="chip kitchen-chip">
                  {p.name}
                  {!p.known && <span className="badge badge-swap">new</span>}
                  <button
                    type="button"
                    className="kitchen-x"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => {
                      const rest = parsed.filter((_, j) => j !== i);
                      setParsed(rest.length ? rest : null);
                      if (!rest.length) setText('');
                    }}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="kitchen-confirm-actions">
            <button type="button" className="btn btn-primary" onClick={confirm} disabled={busy}>
              Add {parsed.length}
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default AddBox;
