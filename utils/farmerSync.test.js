import { buildFarmerRecords, syncFarmerCache } from './farmerSync';

const farmer = (id, name, surname) => ({ id, name, surname });

describe('buildFarmerRecords', () => {
  it('flattens the companies into the records the Realm schema expects', () => {
    const records = buildFarmerRecords(7, [
      { companyId: 3, items: [farmer(1, 'Ana', 'Silva')] },
      { companyId: '4', items: [farmer('2', 'Beto', 'Souza')] },
    ]);

    expect(records).toEqual([
      {
        id: '1',
        userId: '7',
        companyId: '3',
        data: JSON.stringify(farmer(1, 'Ana', 'Silva')),
        name: 'Ana',
        surname: 'Silva',
        synced: true,
      },
      {
        id: '2',
        userId: '7',
        companyId: '4',
        data: JSON.stringify(farmer('2', 'Beto', 'Souza')),
        name: 'Beto',
        surname: 'Souza',
        synced: true,
      },
    ]);
  });

  it('keeps the record even when the farmer has no name', () => {
    const records = buildFarmerRecords(1, [
      { companyId: 1, items: [{ id: 9 }] },
    ]);

    expect(records[0].name).toBe('');
    expect(records[0].surname).toBe('');
    expect(records[0].synced).toBe(true);
  });
});

describe('syncFarmerCache', () => {
  const ok = (items) => ({ data: { status: 'OK', data: { items } } });

  it('replaces the cache once after every company answered', async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce(ok([farmer(1, 'Ana', 'Silva')]))
      .mockResolvedValueOnce(ok([farmer(2, 'Beto', 'Souza')]));
    const replace = jest.fn().mockResolvedValue(undefined);

    const count = await syncFarmerCache({
      userId: 7,
      companyIds: [3, 4],
      instance: 'http://server',
      request,
      replace,
    });

    expect(count).toBe(2);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.calls[0][0]).toHaveLength(2);
    expect(request).toHaveBeenCalledWith(
      'http://server/api/company/userCustomers/3/FARMER?limit=5000'
    );
    expect(request).toHaveBeenCalledWith(
      'http://server/api/company/userCustomers/4/FARMER?limit=5000'
    );
  });

  it('does not touch the cache when a request fails', async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce(ok([farmer(1, 'Ana', 'Silva')]))
      .mockRejectedValueOnce(new Error('network down'));
    const replace = jest.fn();

    await expect(
      syncFarmerCache({
        userId: 7,
        companyIds: [3, 4],
        instance: 'http://server',
        request,
        replace,
      })
    ).rejects.toThrow('network down');

    expect(replace).not.toHaveBeenCalled();
  });

  it('keeps the cache when the API answers without status OK', async () => {
    const request = jest.fn().mockResolvedValue({ data: { status: 'ERROR' } });
    const replace = jest.fn();

    await expect(
      syncFarmerCache({
        userId: 7,
        companyIds: [3],
        instance: 'http://server',
        request,
        replace,
      })
    ).rejects.toThrow('Farmer request failed for company 3');

    expect(replace).not.toHaveBeenCalled();
  });

  it('accepts an empty company list and replaces with nothing', async () => {
    const replace = jest.fn().mockResolvedValue(undefined);

    const count = await syncFarmerCache({
      userId: 7,
      companyIds: [],
      instance: 'http://server',
      request: jest.fn(),
      replace,
    });

    expect(count).toBe(0);
    expect(replace).toHaveBeenCalledWith([]);
  });
});
