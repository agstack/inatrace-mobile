/**
 * Reads for the farmer card values.
 *
 * Records created offline store the payload from the creation form, while
 * records fetched from the API store the server payload. The card read
 * `data.location.address.village` directly, so a cached record without that
 * path rendered "undefined, undefined" instead of an empty value.
 */

type Unknown = Record<string, unknown> | null | undefined;

function read(source: Unknown, path: string[]): string | null {
  let current: unknown = source;
  for (const key of path) {
    if (current === null || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' && current.trim() !== '' ? current.trim() : null;
}

/** "village, cell" with dashes for the parts that are missing. */
export function farmerVillageAndCell(farmer: unknown): string {
  const village = read(farmer as Unknown, ['location', 'address', 'village']);
  const cell = read(farmer as Unknown, ['location', 'address', 'cell']);
  return `${village ?? '-'}, ${cell ?? '-'}`;
}

/** Gender as stored, or a dash when the record has none. */
export function farmerGender(farmer: unknown): string {
  return read(farmer as Unknown, ['gender']) ?? '-';
}

/** "name surname" without leaving a double space when one of them is missing. */
export function farmerDisplayName(farmer: unknown): string {
  const name = read(farmer as Unknown, ['name']) ?? '';
  const surname = read(farmer as Unknown, ['surname']) ?? '';
  return `${name} ${surname}`.trim();
}
