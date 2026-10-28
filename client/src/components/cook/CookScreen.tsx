import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cookApi } from '../../services/cookApi';
import { pantrySync } from '../../services/pantrySync';
import type { RecipeMatch, Suggestions } from '../../types/cook';
import type { TabId } from '../shell/tabs';
import { focusHeading } from '../shell/focus';
import { navigate, recipeHash, replaceRoute, tabHash, useRoute } from '../shell/route';
import RecipeView from './RecipeView';
import './Cook.css';

interface Props {
  onNavigate?: (tabId: TabId) => void;
}

const meta = (r: RecipeMatch) =>
  [r.category, r.area, r.totalTime ? `${r.totalTime} min` : null].filter(Boolean).join(' · ');

const RecipeCard: React.FC<{ recipe: RecipeMatch; onOpen: (id: number) => void }> = ({ recipe, onOpen }) => (
  <li className="cook-grid-item">
    <button type="button" className="card cook-card" onClick={() => onOpen(recipe.id)}>
      <span className="cook-card-media">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="cook-card-placeholder" aria-hidden="true">
            {recipe.title.charAt(0)}
          </span>
        )}
      </span>
      <span className="cook-card-body">
        <span className="cook-card-title">{recipe.title}</span>
        {meta(recipe) && <span className="cook-card-meta">{meta(recipe)}</span>}
        {recipe.usedCount > 0 && <span className="cook-card-uses">uses {recipe.usedCount} of your items</span>}
        {recipe.missing.length > 0 && (
          <span className="cook-card-need">Need: {recipe.missing.map((m) => m.name).join(', ')}</span>
        )}
        {recipe.swaps.map((s) => (
          <span key={s.need} className="cook-card-swap">
            using {s.using} for {s.need}
          </span>
        ))}
      </span>
    </button>
  </li>
);

const Section: React.FC<{ title: string; recipes: RecipeMatch[]; onOpen: (id: number) => void }> = ({
  title,
  recipes,
  onOpen,
}) => (
  <section className="cook-section" aria-label={title}>
    <h2 className="cook-heading">
      {title} ({recipes.length})
    </h2>
    <ul className="cook-grid">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} onOpen={onOpen} />
      ))}
    </ul>
  </section>
);

const CookScreen: React.FC<Props> = ({ onNavigate }) => {
  const [data, setData] = useState<Suggestions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // The open recipe lives in the URL (#cook/recipe/<id>), so reload, Back and Forward all just work.
  const openId = useRoute().recipeId;
  // True when we pushed the recipe entry ourselves, so on-screen Back can pop it instead of leaving the app.
  const pushed = useRef(false);
  const [showTwo, setShowTwo] = useState(false);

  const latest = useRef(0);
  const load = useCallback(() => {
    const mine = ++latest.current;
    setLoading(true);
    setError(null);
    // Wait for any pantry save still in flight (e.g. from a Kitchen that just unmounted).
    pantrySync
      .idle()
      .then(() => cookApi.getSuggestions())
      .then((d) => mine === latest.current && setData(d))
      .catch((e: Error) => mine === latest.current && setError(e.message))
      .finally(() => mine === latest.current && setLoading(false));
  }, []);

  useEffect(load, [load]);

  // Safety net: while showing "kitchen is empty", look again when the person comes back to this tab/window.
  const empty = !loading && !error && data?.pantrySize === 0;
  useEffect(() => {
    if (!empty) return;
    const again = () => document.visibilityState !== 'hidden' && load();
    window.addEventListener('focus', again);
    document.addEventListener('visibilitychange', again);
    return () => {
      window.removeEventListener('focus', again);
      document.removeEventListener('visibilitychange', again);
    };
  }, [empty, load]);

  const savedScroll = useRef<number | null>(null);

  const open = useCallback((id: number) => {
    savedScroll.current = window.scrollY;
    pushed.current = true;
    navigate(recipeHash(id));
    window.scrollTo(0, 0);
  }, []);

  // Back to results: restore where the list was.
  useLayoutEffect(() => {
    if (openId === null && savedScroll.current !== null) {
      window.scrollTo(0, savedScroll.current);
      savedScroll.current = null;
    }
  }, [openId]);

  // The on-screen Back goes through history so it stays in sync with the phone back button.
  // After a reload on a recipe URL there is no in-app entry to go back to, so go to the results directly.
  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else replaceRoute(tabHash('cook'));
  }, []);

  // Focus: the first heading of the results once they show (and again on Back from a recipe).
  useEffect(() => {
    if (openId !== null || loading) return;
    focusHeading(document.querySelector<HTMLElement>('.cook h2'), { preventScroll: true });
  }, [openId, loading]);

  if (openId !== null) return <RecipeView recipeId={openId} onBack={close} />;

  if (loading) {
    return (
      <div className="cook" aria-busy="true">
        <p className="visually-hidden" role="status">
          Loading recipes
        </p>
        <div className="cook-skeleton-heading" />
        <ul className="cook-grid">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="cook-grid-item" aria-hidden="true">
              <div className="card cook-card cook-skeleton-card">
                <div className="cook-card-media cook-skeleton" />
                <div className="cook-card-body">
                  <div className="cook-skeleton cook-skeleton-line" />
                  <div className="cook-skeleton cook-skeleton-line cook-skeleton-short" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="cook">
        <div className="card cook-state" role="alert">
          <h2>Couldn't load recipes</h2>
          <p>{error ?? 'Something went wrong.'}</p>
          <button type="button" className="btn btn-primary" onClick={load}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (data.pantrySize === 0) {
    return (
      <div className="cook">
        <div className="card cook-state">
          <h2>Your kitchen is empty</h2>
          <p>Add what you have and we'll show you what you can cook right now.</p>
          <button type="button" className="btn btn-primary" onClick={() => onNavigate?.('kitchen')}>
            Fill your kitchen
          </button>
        </div>
      </div>
    );
  }

  const { cookNow, oneAway, twoAway } = data;
  const nothing = cookNow.length === 0 && oneAway.length === 0 && twoAway.length === 0;

  return (
    <div className="cook">
      {cookNow.length > 0 && <Section title="Cook now" recipes={cookNow} onOpen={open} />}
      {cookNow.length === 0 && (
        <div className="card cook-state cook-hint">
          <h2>Nothing you can cook right now</h2>
          <p>
            {nothing
              ? 'No recipes are within two ingredients of what you have. Add more to your kitchen to see matches.'
              : 'Add a few more ingredients to your kitchen, or pick something that is only a little way off below.'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => onNavigate?.('kitchen')}>
            Update your kitchen
          </button>
        </div>
      )}
      {oneAway.length > 0 && <Section title="1 ingredient away" recipes={oneAway} onOpen={open} />}
      {twoAway.length > 0 && (
        <div className="cook-section">
          <button
            type="button"
            className="chip"
            aria-expanded={showTwo}
            onClick={() => setShowTwo((v) => !v)}
          >
            {showTwo ? 'Hide' : 'Show'} 2 ingredients away ({twoAway.length})
          </button>
          {showTwo && <Section title="2 ingredients away" recipes={twoAway} onOpen={open} />}
        </div>
      )}
    </div>
  );
};

export default CookScreen;
