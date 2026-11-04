/**
 * Tiny registry of in-flight pantry writes, shared between screens.
 * Kitchen registers every save (including the one it fires as it unmounts); Cook waits for
 * `idle()` before reading suggestions, so it never reads the pantry before a save has landed.
 */
const inflight = new Set<Promise<unknown>>();

export const pantrySync = {
  /** Register a pantry write. Returns the same promise; only the waiting side ignores failures. */
  track<T>(promise: Promise<T>): Promise<T> {
    const settled = promise.then(
      () => undefined,
      () => undefined,
    );
    inflight.add(settled);
    void settled.then(() => inflight.delete(settled));
    return promise;
  },

  /** Resolves when every tracked write (including ones tracked while waiting) has settled. */
  async idle(): Promise<void> {
    while (inflight.size > 0) await Promise.all([...inflight]);
  },
};
