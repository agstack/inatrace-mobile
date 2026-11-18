import { farmerDisplayName, farmerGender, farmerVillageAndCell } from './farmerCard';

const withAddress = {
  name: 'Ana',
  surname: 'Imported',
  gender: 'FEMALE',
  location: { address: { village: 'Huye', cell: 'Ngoma' } },
};

describe('farmer card values', () => {
  it('reads the village and the cell when both are present', () => {
    expect(farmerVillageAndCell(withAddress)).toBe('Huye, Ngoma');
  });

  it('does not render undefined when the address is missing', () => {
    expect(farmerVillageAndCell({ name: 'Ana' })).toBe('-, -');
  });

  it('does not render undefined when the address exists but the fields do not', () => {
    expect(farmerVillageAndCell({ location: { address: {} } })).toBe('-, -');
  });

  it('ignores blank values', () => {
    expect(
      farmerVillageAndCell({ location: { address: { village: '   ', cell: 'Ngoma' } } })
    ).toBe('-, Ngoma');
  });

  it('handles a record that is not an object', () => {
    expect(farmerVillageAndCell(null)).toBe('-, -');
    expect(farmerVillageAndCell(undefined)).toBe('-, -');
  });

  it('reads the gender or falls back to a dash', () => {
    expect(farmerGender(withAddress)).toBe('FEMALE');
    expect(farmerGender({})).toBe('-');
    expect(farmerGender(null)).toBe('-');
  });

  it('builds the display name without leaving a gap', () => {
    expect(farmerDisplayName(withAddress)).toBe('Ana Imported');
    expect(farmerDisplayName({ name: 'Ana' })).toBe('Ana');
    expect(farmerDisplayName({ surname: 'Imported' })).toBe('Imported');
    expect(farmerDisplayName({})).toBe('');
  });
});
