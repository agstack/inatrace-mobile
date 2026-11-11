export type OfflinePackView = {
  name: string;
  state: string;
  percentage: number;
  completedResourceSize: number;
  expires: string;
};

type PackStatusLike = {
  name?: string;
  state?: string | null;
  percentage?: number | null;
  completedResourceSize?: number | null;
  expires?: string | null;
  pack?: PackStatusLike | null;
};

/**
 * Mapbox exposes the pack status either at the root of the object
 * (progress events) or nested under `pack` (getPacks), depending on the
 * call. Normalise both shapes for the screen state.
 */
export function toPackView(pack: unknown): OfflinePackView {
  const value = (pack ?? {}) as PackStatusLike;
  const status = value.pack ?? value;

  return {
    name: value.name ?? '',
    state: status.state ?? 'unknown',
    percentage: status.percentage ?? 0,
    completedResourceSize: status.completedResourceSize ?? 0,
    expires: status.expires ?? 'unknown',
  };
}

/**
 * Merges a download progress event into the displayed pack list, adding the
 * pack when it is seen for the first time. The expiry comes from getPacks,
 * not from the progress event, so the previous value is kept.
 */
export function applyProgress(
  packs: OfflinePackView[],
  progress: PackStatusLike
): OfflinePackView[] {
  const incoming = toPackView(progress);
  const index = packs.findIndex((pack) => pack.name === incoming.name);

  if (index === -1) return [incoming, ...packs];

  const next = [...packs];
  next[index] = {
    ...next[index],
    state: incoming.state,
    percentage: incoming.percentage,
    completedResourceSize: incoming.completedResourceSize,
  };

  return next;
}

/**
 * The screen keeps polling while a download is known to be active, even
 * before the pack is visible in getPacks, and while a pack is unfinished.
 * `invalid` packs are terminal and do not need polling.
 */
export function shouldKeepPolling(
  packs: OfflinePackView[],
  downloadActive: boolean
): boolean {
  if (downloadActive) return true;

  return packs.some(
    (pack) => pack.state !== 'complete' && pack.state !== 'invalid'
  );
}
