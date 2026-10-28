import React, { useCallback, useEffect, useRef, useState } from 'react';
import { kitchenApi } from '../../services/kitchenApi';
import { pantrySync } from '../../services/pantrySync';
import type { UserIngredient } from '../../types';
import type { CommonData, SuggestItem } from '../../types/kitchen';
import type { TabId } from '../shell/tabs';
import { focusHeading } from '../shell/focus';
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
const COUNT_DEBOUNCE_MS = 200;
const DEFAULT_STAPLES = 'water, salt, black pepper, cooking oil';
const toHave = (list: UserIngredient[]): Have[] => list.map((u) => ({ id: u.ingredient.id, name: u.ingredient.name }));

const KitchenScreen: React.FC<Props> = ({ onNavigate }) => {
  const [server, setServer] = useState<Have[]>([]);
  const [common, setCommon] = useState<CommonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState({ text: '', n: 0 });
  const [filter, setFilter] = useState('');
  // Cook-now count for the CURRENT pantry: stale = a save is pending/queued or the fetch hasn't started yet.
  const [count, setCount] = useState<{ status: 'stale' | 'loading' | 'ready' | 'error'; n: number }>({ status: 'stale', n: 0 });
  const [writing, setWriting] = useState(0); // saves queued or in flight
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false); // the add box's confirm panel is open
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Taps not yet confirmed by the server (queued or in flight): ingredient id -> wanted state.
  const [pending, setPendingState] = useState<Pending>(new Map());
  const pendingRef = useRef<Pending>(pending);
  const serverRef = useRef<Have[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  // All pantry writes go through this one chain: a single request in flight at a time.
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const countSeq = useRef(0);

  const setPending = (next: Pending) => {
    pendingRef.current = next;
    if (alive.current) setPendingState(next);
  };
  const setServerList = (list: Have[]) => {
    serverRef.current = list;
    if (alive.current) setServer(list);
  };
  const say = (text: string) => setNotice((n) => ({ text, n: n.n + 1 }));

  // Only the newest request may set the count; anything older (or superseded by a later tap/save) is ignored.
  const refreshCount = useCallback(() => {
    const mine = ++countSeq.current;
    setCount({ status: 'loading', n: 0 });
    const current = () => alive.current && countSeq.current === mine;
    kitchenApi
      .cookNowCount()
      .then((n) => current() && setCount({ status: 'ready', n }))
      .catch(() => current() && setCount({ status: 'error', n: 0 })); // no count on error
  }, []);

  const enqueue = <T,>(job: () => Promise<T>): Promise<T> => {
    setWriting((w) => w + 1);
    const run = pantrySync.track(chain.current.then(job)).finally(() => {
      if (alive.current) setWriting((w) => w - 1);
    });
    chain.current = run.catch(() => undefined);
    return run;
  };

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([kitchenApi.pantry(), kitchenApi.common()])
      .then(([mine, c]) => {
        if (!alive.current) return;
        setServerList(toHave(mine));
        setCommon(c);
      })
      .catch((e: Error) => alive.current && setLoadError(e.message))
      .finally(() => alive.current && setLoading(false));
  }, []);

  // Sends the queued taps. Entries that already match the server are dropped; an empty change sends nothing.
  const flushJob = async (keepalive = false): Promise<boolean> => {
    const snapshot: Pending = new Map(pendingRef.current);
    const haveIds = new Set(serverRef.current.map((h) => h.id));
    const changes = [...snapshot].filter(([id, p]) => p.want !== haveIds.has(id));
    const add = changes.filter(([, p]) => p.want).map(([id]) => id);
    const remove = changes.filter(([, p]) => !p.want).map(([id]) => id);
    // Drop the snapshot's entries unless the person tapped them again while the call was in flight.
    const settle = () => {
      const next: Pending = new Map(pendingRef.current);
      snapshot.forEach((p, id) => {
        if (next.get(id)?.want === p.want) next.delete(id);
      });
      setPending(next);
    };
    if (changes.length === 0) {
      settle();
      return true;
    }
    try {
      const res = await kitchenApi.bulk({ ...(add.length && { add }), ...(remove.length && { remove }) }, { keepalive });
      setServerList(toHave(res.ingredients));
      if (alive.current) setActionError(null);
      settle();
      return true;
    } catch (e) {
      settle(); // revert the optimistic change
      if (alive.current) {
        const names = [...new Set([...snapshot.values()].map((p) => p.name))].join(', ');
        setActionError(`Couldn't save that change. ${e instanceof Error ? e.message : ''}`.trim());
        say(`Couldn't save ${names}. Your kitchen was not changed.`);
      }
      return false;
    }
  };

  const flushNow = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    return enqueue(flushJob);
  };

  // Page being closed, reloaded or hidden with taps still in the debounce window: send them now, bypassing
  // the chain, with keepalive so the browser finishes the request after the page is gone.
  useEffect(() => {
    const flushOnLeave = () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      timer.current = null;
      void pantrySync.track(flushJob(true));
    };
    const onVisibility = () => document.visibilityState === 'hidden' && flushOnLeave();
    window.addEventListener('pagehide', flushOnLeave);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flushOnLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
      if (timer.current) {
        // Leaving the screen with taps still waiting: send them now (fire and forget).
        clearTimeout(timer.current);
        timer.current = null;
        void enqueue(flushJob);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  // The count follows the pantry: while any tap/save is pending the old number is dropped (and any request
  // in flight is invalidated); once everything has settled, refetch after a short debounce.
  const unsettled = writing > 0 || pending.size > 0;
  useEffect(() => {
    if (loading) return;
    countSeq.current++;
    setCount((c) => (c.status === 'stale' ? c : { status: 'stale', n: 0 }));
    if (unsettled) return;
    const t = setTimeout(refreshCount, COUNT_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [loading, unsettled, server, refreshCount]);

  // What the screen shows: server state with unconfirmed taps applied on top.
  const have: Have[] = [
    ...server.filter((h) => pending.get(h.id)?.want !== false),
    ...[...pending.entries()]
      .filter(([id, p]) => p.want && !server.some((h) => h.id === id))
      .map(([id, p]) => ({ id, name: p.name })),
  ];
  const haveIds = new Set(have.map((h) => h.id));

  // Once the kitchen has loaded, put focus on the screen heading (sign-up and tab switches land here).
  useEffect(() => {
    if (!loading) focusHeading(titleRef.current);
  }, [loading]);

  const toggle = (id: number, name: string, want: boolean) => {
    const next: Pending = new Map(pendingRef.current);
    next.set(id, { want, name });
    setPending(next);
    setActionError(null);
    say(want ? `Added ${name}` : `Removed ${name}`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void enqueue(flushJob);
    }, BATCH_MS);
  };

  const pickSuggestion = (item: SuggestItem) => {
    if (!haveIds.has(item.id)) toggle(item.id, item.name, true);
    else say(`${item.name} is already in your kitchen`);
  };

  const addTexts = (texts: (number | string)[]) =>
    enqueue(async () => {
      const res = await kitchenApi.bulk({ add: texts });
      setServerList(toHave(res.ingredients));
      if (!alive.current) return;
      setActionError(null);
      say(`Added ${texts.length} ${texts.length === 1 ? 'item' : 'items'}`);
    });

  const goCook = async () => {
    setSaving(true);
    const ok = await flushNow(); // waits behind any in-flight save
    if (!alive.current) return;
    setSaving(false);
    if (ok) onNavigate?.('cook');
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
  // The last comma-separated piece of the input is what is being typed right now.
  const term = filter.split(',').pop()!.trim().toLowerCase();
  const groups = common.groups
    .map((g) => ({ ...g, items: term ? g.items.filter((i) => i.name.toLowerCase().includes(term)) : g.items }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="kitchen" data-confirming={confirming}>
      <h2 className="kitchen-title" ref={titleRef} tabIndex={-1}>Your kitchen</h2>

      <AddBox onPick={pickSuggestion} onAddTexts={addTexts} onTextChange={setFilter} onConfirmChange={setConfirming} />

      {actionError && (
        <div role="alert" className="kitchen-toast">
          <span>{actionError}</span>
          <button type="button" className="btn btn-secondary kitchen-toast-close" onClick={() => setActionError(null)}>
            Dismiss
          </button>
        </div>
      )}
      <p className="visually-hidden" role="status" aria-live="polite">
        {notice.text}
        {notice.n % 2 === 0 ? '​' : ''}
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
        {groups.length === 0 && <p className="kitchen-nomatch">No quick picks match "{term}".</p>}
        <div className="kitchen-groups">
          {groups.map((g) => (
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
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={goCook}
          disabled={saving}
          aria-busy={saving || unsettled || count.status === 'stale' || count.status === 'loading'}
        >
          {saving ? 'Saving…' : `See what I can cook${count.status === 'ready' ? ` (${count.n})` : ''} →`}
        </button>
      </div>
    </div>
  );
};

export default KitchenScreen;
