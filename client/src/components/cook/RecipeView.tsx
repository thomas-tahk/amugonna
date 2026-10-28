import React, { useEffect, useState } from 'react';
import { cookApi } from '../../services/cookApi';
import type { CookIngredient, CookRecipe } from '../../types/cook';
import './Cook.css';

interface Props {
  recipeId: number;
  onBack: () => void;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}
type NavWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
};

const Badge: React.FC<{ ing: CookIngredient }> = ({ ing }) => {
  switch (ing.status) {
    case 'have':
      return <span className="badge badge-have">✓ Have</span>;
    case 'swap':
      return <span className="badge badge-swap">using {ing.using}</span>;
    case 'missing':
      return <span className="badge badge-missing">Missing</span>;
    default:
      return <span className="badge badge-staple">Assumed</span>;
  }
};

const IngredientRow: React.FC<{ ing: CookIngredient }> = ({ ing }) => (
  <li className={`cook-ing cook-ing-${ing.status}`}>
    <span className="cook-ing-text">
      {ing.measure && <span className="cook-ing-measure">{ing.measure} </span>}
      {ing.name}
      {ing.optional && <span className="cook-ing-optional"> (optional)</span>}
    </span>
    <Badge ing={ing} />
  </li>
);

const RecipeView: React.FC<Props> = ({ recipeId, onBack }) => {
  const [recipe, setRecipe] = useState<CookRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRecipe(null);
    setError(null);
    cookApi
      .getRecipe(recipeId)
      .then((r) => !cancelled && setRecipe(r))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [recipeId, attempt]);

  // Keep the screen awake while cooking; silently skip when unsupported.
  useEffect(() => {
    let sentinel: WakeLockSentinelLike | null = null;
    let closed = false;
    const wl = (navigator as NavWithWakeLock).wakeLock;
    if (wl) {
      wl.request('screen')
        .then((s) => {
          if (closed) void s.release();
          else sentinel = s;
        })
        .catch(() => {});
    }
    return () => {
      closed = true;
      if (sentinel) void sentinel.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const back = (
    <button type="button" className="btn btn-secondary cook-back" onClick={onBack}>
      ← Back
    </button>
  );

  if (error) {
    return (
      <div className="cook">
        {back}
        <div className="card cook-state" role="alert">
          <h2>Couldn't open this recipe</h2>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="cook" aria-busy="true">
        {back}
        <p className="visually-hidden" role="status">
          Loading recipe
        </p>
        <div className="cook-skeleton cook-view-media" />
        <div className="cook-skeleton cook-skeleton-line" />
      </div>
    );
  }

  const missing = recipe.ingredients.filter((i) => i.status === 'missing');
  const others = recipe.ingredients.filter((i) => i.status !== 'missing');
  const time = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
  const metaLine = [
    recipe.category,
    recipe.area,
    time ? `${time} min` : null,
    recipe.servings ? `Serves ${recipe.servings}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const source = recipe.attribution ?? (recipe.sourceName ? `Recipe from ${recipe.sourceName}` : null);

  const copyMissing = async () => {
    try {
      await navigator.clipboard.writeText(missing.map((m) => m.name).join('\n'));
      setToast('Copied');
    } catch {
      setToast("Couldn't copy");
    }
  };

  const toggleStep = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <article className="cook cook-view">
      {back}
      <h1 className="cook-view-title">{recipe.title}</h1>
      {recipe.imageUrl ? (
        <img className="cook-view-media" src={recipe.imageUrl} alt={recipe.title} />
      ) : (
        <div className="cook-view-media cook-card-placeholder" aria-hidden="true">
          {recipe.title.charAt(0)}
        </div>
      )}
      {metaLine && <p className="cook-view-meta">{metaLine}</p>}

      <div className="cook-view-cols">
        <section className="cook-view-ingredients" aria-labelledby="cook-ing-h">
          <h2 id="cook-ing-h" className="cook-heading">
            Ingredients
          </h2>
          {missing.length > 0 && (
            <div className="cook-missing">
              <p className="cook-missing-title">Missing ({missing.length})</p>
              <ul className="cook-ing-list">
                {missing.map((i) => (
                  <IngredientRow key={i.canonical + i.name} ing={i} />
                ))}
              </ul>
              <button type="button" className="btn btn-secondary" onClick={copyMissing}>
                Copy missing items
              </button>
            </div>
          )}
          <ul className="cook-ing-list">
            {others.map((i) => (
              <IngredientRow key={i.canonical + i.name} ing={i} />
            ))}
          </ul>
        </section>

        <section className="cook-view-steps" aria-labelledby="cook-steps-h">
          <h2 id="cook-steps-h" className="cook-heading">
            Steps
          </h2>
          <ol className="cook-steps">
            {recipe.steps.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={`cook-step${done.has(i) ? ' cook-step-done' : ''}`}
                  aria-pressed={done.has(i)}
                  onClick={() => toggleStep(i)}
                >
                  {s}
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {source && (
        <p className="cook-source">
          {recipe.sourceUrl ? (
            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
              {source}
            </a>
          ) : (
            source
          )}
        </p>
      )}
      {toast && (
        <div className="cook-toast" role="status">
          {toast}
        </div>
      )}
    </article>
  );
};

export default RecipeView;
