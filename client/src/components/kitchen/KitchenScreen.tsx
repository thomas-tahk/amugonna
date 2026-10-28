import React, { useCallback, useEffect, useRef, useState } from 'react';
import { kitchenApi } from '../../services/kitchenApi';
import type { UserIngredient } from '../../types';
import type { CommonData, SuggestItem } from '../../types/kitchen';
import type { TabId } from '../shell/tabs';
import AddBox from './AddBox';
import './Kitchen.css';

interface Props {
  onNavigate?: (tab: TabId) => void;
}

interface Have {
  id: number;
  name: string;
}
type Pending = Map<number, { want: boolean; name: string }>;

const BATCH_MS = 400;
const DEFAULT_STAPLES = 'water, salt, black pepper, cooking oil';
const toHave = (list: UserIngredient[]): Have[] => list.map((u) => ({ id: u.ingredient.id, name: u.ingredient.name }));

const KitchenScreen: React.FC<Props> = ({ onNavigate }) => {
  const [server, setServer] = useState<Have[]>([]);
  const [common, setCommon] = useState<CommonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  // Taps not yet confirmed by the server (queued or in flight): ingredient id -> wanted state.
  const [pending, setPendingState] = useState<Pending>(new Map());
  const pendingRef = useRef<Pending>(pending);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  const setPending = (next: Pending) => {
    pendingRef.current = next;
    setPendingState(next);
  };

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([kitchenApi.pantry(), kitchenApi.common()])
      .then(([mine, c]) => {
        if (!alive.current) return;
        setServer(toHave(mine));
        setCommon(c);
      })
      .catch((e: Error) => alive.current && setLoadError(e.message))
      .finally(() => alive.current && setLoading(false));
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  // What the screen shows: server state with unconfirmed taps applied on top.
  const have: Have[] = [
    ...server.filter((h) => pending.get(h.id)?.want !== false),
    ...[...pending.entries()]
      .filter(([id, p]) => p.want && !server.some((h) => h.id === id))
      .map(([id, p]) => ({ id, name: p.name })),
  ];
  const haveIds = new Set(have.map((h) => h.id));

  const flush = useCallback(async () => {
    timer.current = null;
    const snapshot: Pending = new Map(pendingRef.current);
    const add = [...snapshot].filter(([, p]) => p.want).map(([id]) => id);
    const remove = [...snapshot].filter(([, p]) => !p.want).map(([id]) => id);
    // Drop the snapshot's entries unless the person tapped them again while the call was in flight.
    const settle = () => {
      const next: Pending = new Map(pendingRef.current);
      snapshot.forEach((p, id) => {
        if (next.get(id)?.want === p.want) next.delete(id);
      });
      setPending(next);
    };
    try {
      const res = await kitchenApi.bulk({ ...(add.length && { add }), ...(remove.length && { remove }) });
      if (!alive.current) return;
      setServer(toHave(res.ingredients));
      setActionError(null);
      settle();
    } catch (e) {
      if (!alive.current) return;
      settle(); // revert the optimistic change
      setActionError(`Couldn't save that change. ${e instanceof Error ? e.message : ''}`.trim());
    }
  }, []);

  const toggle = (id: number, name: string, want: boolean) => {
    const next: Pending = new Map(pendingRef.current);
    next.set(id, { want, name });
    setPending(next);
    setActionError(null);
    setNotice(want ? `Added ${name}` : `Removed ${name}`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, BATCH_MS);
  };

  const pickSuggestion = (item: SuggestItem) => {
    if (!haveIds.has(item.id)) toggle(item.id, item.name, true);
    else setNotice(`${item.name} is already in your kitchen`);
  };

  const addTexts = async (texts: string[]) => {
    const res = await kitchenApi.bulk({ add: texts });
    setServer(toHave(res.ingredients));
    setActionError(null);
    setNotice(`Added ${texts.length} ${texts.length === 1 ? 'item' : 'items'}`);
  };

  if (loading) {
    return (
      <div className="kitchen-status" role="status">
        <div className="loading-spinner" aria-hidden="true" />
        <p>Loading your kitchen…</p>
      </div>
    );
  }
  if (loadError || !common) {
    return (
      <div className="kitchen-status">
        <p role="alert" className="kitchen-error">
          Couldn't load your kitchen. {loadError}
        </p>
        <button type="button" className="btn btn-primary" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  const staples = common.staples.length ? common.staples.map((s) => s.name.toLowerCase()).join(', ') : DEFAULT_STAPLES;

  return (
    <div className="kitchen">
      <h2 className="kitchen-title">Your kitchen</h2>

      <AddBox onPick={pickSuggestion} onAddTexts={addTexts} />

      {actionError && (
        <p role="alert" className="kitchen-error">
          {actionError}
        </p>
      )}
      <p className="visually-hidden" role="status" aria-live="polite">
        {notice}
      </p>

      <section className="kitchen-have" aria-labelledby="kitchen-have-h">
        <h3 id="kitchen-have-h">In your kitchen ({have.length})</h3>
        {have.length === 0 ? (
          <p className="kitchen-empty">Nothing yet. Tap items below, or type a few above.</p>
        ) : (
          <ul className="kitchen-chips">
            {have.map((h) => (
              <li key={h.id}>
                <span className="chip kitchen-chip">
                  {h.name}
                  <button
                    type="button"
                    className="kitchen-x"
                    aria-label={`Remove ${h.name} from your kitchen`}
                    onClick={() => toggle(h.id, h.name, false)}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="kitchen-quick-h">
        <h3 id="kitchen-quick-h">Quick picks</h3>
        <div className="kitchen-groups">
          {common.groups.map((g) => (
            <div key={g.category} className="kitchen-group card">
              <h4>{g.category}</h4>
              <ul className="kitchen-chips">
                {g.items.map((it) => {
                  const on = haveIds.has(it.id);
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        className="chip kitchen-chip"
                        aria-pressed={on}
                        onClick={() => toggle(it.id, it.name, !on)}
                      >
                        {on && <span aria-hidden="true">✓</span>}
                        {it.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <p className="kitchen-staples">Always assumed: {staples}</p>
      </section>

      <div className="kitchen-cta">
        <button type="button" className="btn btn-primary btn-block" onClick={() => onNavigate?.('cook')}>
          See what I can cook →
        </button>
      </div>
    </div>
  );
};

export default KitchenScreen;
