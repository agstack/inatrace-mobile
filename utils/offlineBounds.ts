/**
 * Bounds and size helpers for the offline map download screen.
 *
 * The screen used to ask the map for its visible bounds after every idle
 * event. That request is asynchronous and can race with the map ref, and the
 * screen never rendered the map at all without a location fix, so the download
 * could not be started.
 *
 * The map now reports the visible area through `onRegionDidChange`. Its payload
 * is a GeoJSON feature whose `properties` carry `visibleBounds` and `zoomLevel`.
 * The typings shipped with @rnmapbox/maps describe a different `MapState`
 * (`properties.bounds` / `properties.zoom`) that the Android view never sends,
 * so both shapes are accepted here.
 */

type Position = [number, number];

type MapRegionLike = {
  properties?: {
    visibleBounds?: [Position, Position] | null;
    bounds?: { ne?: Position | null; sw?: Position | null } | null;
    zoomLevel?: number | null;
    zoom?: number | null;
  } | null;
};

export type DownloadBounds = [Position, Position];

/**
 * `createPack` expects `[southWest, northEast]`.
 *
 * `visibleBounds` is ordered `[[rightLon, topLat], [leftLon, bottomLat]]`, the
 * opposite of what `createPack` wants, so it is normalised to south-west first
 * by comparing latitude. `bounds` (the other shape) already names its corners.
 */
export function boundsFromMapState(state: unknown): DownloadBounds | null {
  const properties = ((state ?? {}) as MapRegionLike).properties;
  if (!properties) return null;

  const visible = properties.visibleBounds;
  if (Array.isArray(visible) && visible.length === 2) {
    const [first, second] = visible;
    if (isPosition(first) && isPosition(second)) {
      const sw: Position = [Math.min(first[0], second[0]), Math.min(first[1], second[1])];
      const ne: Position = [Math.max(first[0], second[0]), Math.max(first[1], second[1])];
      if (sw[0] === ne[0] || sw[1] === ne[1]) return null;
      return [sw, ne];
    }
  }

  const sw = properties.bounds?.sw;
  const ne = properties.bounds?.ne;
  if (!isPosition(sw) || !isPosition(ne)) return null;
  if (sw[0] === ne[0] && sw[1] === ne[1]) return null;
  return [
    [sw[0], sw[1]],
    [ne[0], ne[1]],
  ];
}

/** Zoom level reported by the same event. */
export function zoomFromMapState(state: unknown): number | null {
  const properties = ((state ?? {}) as MapRegionLike).properties;
  const zoom = properties?.zoomLevel ?? properties?.zoom;
  return typeof zoom === 'number' && Number.isFinite(zoom) && zoom > 0
    ? zoom
    : null;
}

/**
 * Rough download size in MB for the visible area. Kept identical to the
 * estimate the screen used before so the number shown does not change.
 */
export function estimatePackSize(zoomLevel: number | null): number {
  if (zoomLevel === null) return 0;
  if (zoomLevel < 13) return number(Math.abs(20 - zoomLevel) * 20);
  if (zoomLevel < 14) return number(Math.abs(20 - zoomLevel) * 10);
  return number(Math.abs(20 - zoomLevel) * 6);
}

/**
 * True when the bounds can be handed to `createPack`. Guards the confirm
 * action so the user gets the "no area selected" message only when the map
 * really has not reported an area yet.
 */
export function boundsReady(bounds: unknown): bounds is DownloadBounds {
  if (!Array.isArray(bounds) || bounds.length !== 2) return false;
  if (!isPosition(bounds[0]) || !isPosition(bounds[1])) return false;
  return !(bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1]);
}

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function number(value: number): number {
  return parseFloat(value.toFixed(2));
}
