import { classifyOfflinePacks } from '@/utils/offlineMaps';

const NOW = new Date('2026-11-11T12:00:00Z');

function pack(state, expires = null) {
  return { name: 'pack', pack: { state, expires } };
}

test('reports no map when there are no packs', () => {
  expect(classifyOfflinePacks([], NOW)).toBe('none');
});

test('treats invalid or inactive packs as no map', () => {
  expect(classifyOfflinePacks([pack('invalid'), pack('inactive')], NOW)).toBe(
    'none'
  );
});

test('reports a completed pack as ready', () => {
  expect(classifyOfflinePacks([pack('complete')], NOW)).toBe('ready');
});

test('reports a download in progress', () => {
  expect(classifyOfflinePacks([pack('downloading')], NOW)).toBe('downloading');
});

test('reports an expired pack instead of claiming it is usable', () => {
  expect(
    classifyOfflinePacks([pack('complete', '2026-11-01T00:00:00Z')], NOW)
  ).toBe('expired');
});

test('keeps a usable map even when another pack expired', () => {
  const packs = [
    pack('complete', '2026-11-01T00:00:00Z'),
    pack('complete', null),
    pack('downloading'),
  ];
  expect(classifyOfflinePacks(packs, NOW)).toBe('ready');
});

test('treats a missing or unrecognised expiry as no expiry', () => {
  expect(classifyOfflinePacks([pack('complete', 'unknown')], NOW)).toBe(
    'ready'
  );
  expect(classifyOfflinePacks([pack('complete', null)], NOW)).toBe('ready');
  expect(classifyOfflinePacks([pack('complete', '')], NOW)).toBe('ready');
});

test('accepts the pack status at the root of the object', () => {
  expect(classifyOfflinePacks([{ state: 'complete' }], NOW)).toBe('ready');
});

test('prefers a download in progress over an expired pack', () => {
  const packs = [pack('complete', '2026-11-01T00:00:00Z'), pack('downloading')];
  expect(classifyOfflinePacks(packs, NOW)).toBe('downloading');
});
