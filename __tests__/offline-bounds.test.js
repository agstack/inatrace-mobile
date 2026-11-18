import {
  boundsFromMapState,
  boundsReady,
  estimatePackSize,
  zoomFromMapState,
} from '@/utils/offlineBounds';

// Payload the Android map view actually sends with onRegionDidChange:
// visibleBounds is [[rightLon, topLat], [leftLon, bottomLat]] and the zoom is
// under zoomLevel, not zoom.
const REGION_EVENT = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-74.00529999999999, 40.7123] },
  properties: {
    visibleBounds: [
      [-73.99648089673417, 40.72233462152107],
      [-74.01411910326516, 40.702263865962976],
    ],
    isUserInteraction: false,
    pitch: 0,
    heading: 0,
    animated: false,
    zoomLevel: 14,
  },
};

test('normalises the visible bounds to south-west first for createPack', () => {
  expect(boundsFromMapState(REGION_EVENT)).toEqual([
    [-74.01411910326516, 40.702263865962976],
    [-73.99648089673417, 40.72233462152107],
  ]);
});

test('reads the zoom level the Android payload carries', () => {
  expect(zoomFromMapState(REGION_EVENT)).toBe(14);
});

test('accepts the bounds/zoom shape described by the typings', () => {
  const state = {
    properties: {
      bounds: { sw: [-47.12, -22.95], ne: [-47.01, -22.86] },
      zoom: 15,
    },
  };
  expect(boundsFromMapState(state)).toEqual([
    [-47.12, -22.95],
    [-47.01, -22.86],
  ]);
  expect(zoomFromMapState(state)).toBe(15);
});

test('reports no bounds when the map has not reported its state yet', () => {
  expect(boundsFromMapState(undefined)).toBeNull();
  expect(boundsFromMapState(null)).toBeNull();
  expect(boundsFromMapState({})).toBeNull();
  expect(boundsFromMapState({ properties: {} })).toBeNull();
  expect(boundsFromMapState({ properties: { visibleBounds: null } })).toBeNull();
});

test('reports no bounds when the corners are missing or malformed', () => {
  expect(
    boundsFromMapState({ properties: { visibleBounds: [[-74, 40]] } })
  ).toBeNull();
  expect(
    boundsFromMapState({
      properties: { visibleBounds: [['-74', 40], [-73, 40.7]] },
    })
  ).toBeNull();
});

test('reports no bounds for a degenerate area', () => {
  expect(
    boundsFromMapState({
      properties: {
        visibleBounds: [
          [-74, 40],
          [-74, 40],
        ],
      },
    })
  ).toBeNull();
});

test('reports no zoom when the map has not reported its state yet', () => {
  expect(zoomFromMapState(undefined)).toBeNull();
  expect(zoomFromMapState({ properties: {} })).toBeNull();
  expect(zoomFromMapState({ properties: { zoomLevel: 0 } })).toBeNull();
  expect(zoomFromMapState({ properties: { zoomLevel: Number.NaN } })).toBeNull();
});

test('estimates a non-zero size for the zoom levels a user can select', () => {
  expect(estimatePackSize(10)).toBeGreaterThan(0);
  expect(estimatePackSize(13)).toBeGreaterThan(0);
  expect(estimatePackSize(14)).toBeGreaterThan(0);
  expect(estimatePackSize(18)).toBeGreaterThan(0);
});

test('keeps the estimate the screen showed before', () => {
  expect(estimatePackSize(10)).toBe(200);
  expect(estimatePackSize(13)).toBe(70);
  expect(estimatePackSize(14)).toBe(36);
  expect(estimatePackSize(16)).toBe(24);
});

test('estimates nothing while the zoom level is unknown', () => {
  expect(estimatePackSize(null)).toBe(0);
});

test('accepts only a complete, non-degenerate pair of corners', () => {
  expect(
    boundsReady([
      [-47.12, -22.95],
      [-47.01, -22.86],
    ])
  ).toBe(true);
  expect(boundsReady(null)).toBe(false);
  expect(boundsReady([])).toBe(false);
  expect(boundsReady([[-47.12, -22.95]])).toBe(false);
  expect(
    boundsReady([
      [-47.12, -22.95],
      [-47.12, -22.95],
    ])
  ).toBe(false);
});
