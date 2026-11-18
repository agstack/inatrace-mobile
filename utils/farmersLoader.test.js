import { loadFarmersPage } from './farmersLoader';

const entry = (id, synced) => ({ data: { id, name: `farmer-${id}` }, synced });

const args = {
  limit: 10,
  offset: 0,
  sort: ['BY', 'name', 'ASC'],
  search: '',
  searchBy: 'BY_NAME',
  companyId: '3',
  userId: '7',
};

function deps(overrides = {}) {
  return {
    online: true,
    readCache: jest.fn().mockResolvedValue([]),
    fetchApi: jest.fn().mockResolvedValue({ entries: [] }),
    ...overrides,
  };
}

describe('loadFarmersPage', () => {
  it('shows the cache when offline without calling the API', async () => {
    const d = deps({
      online: false,
      readCache: jest.fn().mockResolvedValue([entry(1, true), entry(2, false)]),
    });

    const page = await loadFarmersPage(d, args, { reset: true });

    expect(page).toEqual({
      entries: [entry(1, true), entry(2, false)],
      fromCache: true,
      failed: false,
    });
    expect(d.fetchApi).not.toHaveBeenCalled();
  });

  it('merges the API with the unsynchronized cached records', async () => {
    const d = deps({
      readCache: jest
        .fn()
        .mockResolvedValue([entry(1, true), entry(2, false)]),
      fetchApi: jest.fn().mockResolvedValue({
        entries: [entry(1, true), entry(3, true)],
      }),
    });

    const page = await loadFarmersPage(d, args, { reset: true });

    expect(page.entries.map((row) => row.data.id)).toEqual([2, 1, 3]);
    expect(page.entries).toHaveLength(3);
    expect(page.fromCache).toBe(false);
    expect(page.failed).toBe(false);
  });

  it('keeps the cache when the API fails', async () => {
    const d = deps({
      readCache: jest
        .fn()
        .mockResolvedValue([entry(1, true), entry(2, true)]),
      fetchApi: jest.fn().mockRejectedValue(new Error('network down')),
    });

    const page = await loadFarmersPage(d, args, { reset: true });

    expect(page.entries).toHaveLength(2);
    expect(page.fromCache).toBe(true);
    expect(page.failed).toBe(true);
  });

  it('reports offline without cache as empty', async () => {
    const d = deps({ online: false });

    const page = await loadFarmersPage(d, args, { reset: true });

    expect(page).toEqual({ entries: [], fromCache: true, failed: false });
  });

  it('keeps the cached rows on an offline refresh', async () => {
    const readCache = jest.fn().mockResolvedValue([entry(1, true)]);
    const d = deps({ online: false, readCache });

    const page = await loadFarmersPage(d, args, { reset: true });

    expect(readCache).toHaveBeenCalledWith(args);
    expect(page.entries).toEqual([entry(1, true)]);
  });

  it('hands the cache to the screen before the request finishes', async () => {
    let resolveApi;
    const pending = new Promise((resolve) => {
      resolveApi = resolve;
    });
    const onCache = jest.fn();
    const d = deps({
      readCache: jest.fn().mockResolvedValue([entry(1, true)]),
      fetchApi: jest.fn().mockReturnValue(pending),
    });

    const promise = loadFarmersPage(d, args, { reset: true, onCache });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onCache).toHaveBeenCalledWith([entry(1, true)]);

    resolveApi({ entries: [] });
    await promise;
  });

  it('does not read the cache when paginating online', async () => {
    const readCache = jest.fn().mockResolvedValue([entry(1, true)]);
    const d = deps({
      readCache,
      fetchApi: jest.fn().mockResolvedValue({ entries: [entry(11, true)] }),
    });

    const page = await loadFarmersPage(d, { ...args, offset: 10 }, { reset: false });

    expect(readCache).not.toHaveBeenCalled();
    expect(page.entries).toEqual([entry(11, true)]);
  });

  it('keeps what is on screen when a page request fails', async () => {
    const d = deps({
      fetchApi: jest.fn().mockRejectedValue(new Error('network down')),
    });

    const page = await loadFarmersPage(d, { ...args, offset: 10 }, { reset: false });

    expect(page).toEqual({ entries: [], fromCache: false, failed: true });
  });
});
