import type { Farmer } from '@/types/farmer';

/**
 * Rebuilds the offline farmer cache from the API.
 *
 * `fetchFarmers` in the auth context used to delete every synced row before
 * calling the API. When a request failed the cache was already gone, which is
 * exactly when the list needed it. This module fetches everything first and
 * only then replaces the rows, in a single Realm transaction.
 */

export type FarmerRecord = {
  id: string;
  userId: string;
  companyId: string;
  data: string;
  name: string;
  surname: string;
  synced: boolean;
};

export type CompanyFarmers = {
  companyId: number | string;
  items: Farmer[];
};

/** Converts the API responses into the flat records the Realm schema expects. */
export function buildFarmerRecords(
  userId: number | string,
  companies: CompanyFarmers[]
): FarmerRecord[] {
  const records: FarmerRecord[] = [];

  for (const { companyId, items } of companies) {
    for (const farmer of items) {
      records.push({
        id: farmer.id !== undefined && farmer.id !== null ? String(farmer.id) : '',
        userId: userId !== undefined && userId !== null ? String(userId) : '',
        companyId: String(companyId ?? ''),
        data: JSON.stringify(farmer),
        name: farmer.name ?? '',
        surname: farmer.surname ?? '',
        synced: true,
      });
    }
  }

  return records;
}

type SyncOptions = {
  userId: number | string;
  companyIds: Array<number | string>;
  instance: string;
  /** Injected so the tests can answer without HTTP. */
  request: (url: string) => Promise<any>;
  /** Injected so the tests can assert what would be written. */
  replace: (records: FarmerRecord[]) => Promise<void>;
};

/**
 * Fetches every company first and replaces the cache only when all of them
 * answered. A failed or non-OK request throws before `replace`, so the rows
 * already saved on the device survive.
 *
 * Returns the number of records that would be written.
 */
export async function syncFarmerCache({
  userId,
  companyIds,
  instance,
  request,
  replace,
}: SyncOptions): Promise<number> {
  const companies = await Promise.all(
    companyIds.map(async (companyId) => {
      const response = await request(
        `${instance}/api/company/userCustomers/${companyId}/FARMER?limit=5000`
      );

      if (response?.data?.status !== 'OK') {
        throw new Error(`Farmer request failed for company ${companyId}`);
      }

      return {
        companyId,
        items: (response.data.data.items ?? []) as Farmer[],
      };
    })
  );

  const records = buildFarmerRecords(userId, companies);
  await replace(records);
  return records.length;
}
