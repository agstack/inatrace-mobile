export type OfflineMapStatus =
  | 'unknown'
  | 'none'
  | 'downloading'
  | 'expired'
  | 'ready';

type OfflinePackStatusLike = {
  state?: string | null;
  expires?: string | null;
};

type OfflinePackLike = OfflinePackStatusLike & {
  pack?: OfflinePackStatusLike | null;
};

function asPackLike(value: unknown): OfflinePackLike {
  return (value ?? {}) as OfflinePackLike;
}

/**
 * Mapbox exposes the pack status either at the root of the object or nested
 * under `pack`, depending on the SDK version. Accept both so the classification
 * does not depend on that detail.
 */
function packState(pack: OfflinePackLike): string | null {
  return pack.pack?.state ?? pack.state ?? null;
}

function packExpires(pack: OfflinePackLike): string | null {
  return pack.pack?.expires ?? pack.expires ?? null;
}

function isExpired(expires: string | null, now: number): boolean {
  if (!expires) return false;

  const timestamp = Date.parse(expires);
  // Mapbox may send values such as "unknown" or an empty string. Only a real
  // date can mark a pack as expired.
  if (Number.isNaN(timestamp)) return false;

  return timestamp <= now;
}

/**
 * Resolves what the home screen should say about offline maps.
 *
 * Precedence: a usable map wins over everything, then a download in progress,
 * then an expired map, then no map at all. A failed query is mapped to
 * `unknown` by the caller and shows no notice.
 */
export function classifyOfflinePacks(
  packs: readonly unknown[],
  now: Date = new Date()
): OfflineMapStatus {
  const timestamp = now.getTime();
  const entries = packs.map(asPackLike);
  const completed = entries.filter((pack) => packState(pack) === 'complete');
  const usable = completed.filter(
    (pack) => !isExpired(packExpires(pack), timestamp)
  );

  if (usable.length > 0) return 'ready';
  if (entries.some((pack) => packState(pack) === 'downloading')) {
    return 'downloading';
  }
  if (completed.length > 0) return 'expired';

  return 'none';
}
