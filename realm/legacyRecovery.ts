import Realm from 'realm';
import { FarmerSchema, PlotSchema } from './schemas';
import { currentOfflinePath } from './context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const schemas = [FarmerSchema, PlotSchema];
const RECOVERY_KEY = 'legacy_offline_recovered_v1';

export async function legacyPendingCounts(): Promise<{ farmers: number; plots: number }> {
  if (await AsyncStorage.getItem(RECOVERY_KEY)) return { farmers: 0, plots: 0 };
  if (!Realm.exists({ path: 'myrealm', schema: schemas })) return { farmers: 0, plots: 0 };
  const legacy = await Realm.open({ path: 'myrealm', schema: schemas, readOnly: true });
  try {
    return { farmers: legacy.objects('Farmer').filtered('synced == false').length,
      plots: legacy.objects('Plot').filtered('synced == false').length };
  } finally { legacy.close(); }
}

// The caller must ask the user to confirm that every legacy record belongs to the current account.
export async function copyLegacyPending(userId: number): Promise<void> {
  if (await AsyncStorage.getItem(RECOVERY_KEY)) throw new Error('Legacy data already recovered');
  const targetPath = currentOfflinePath();
  if (!Realm.exists({ path: 'myrealm', schema: schemas })) return;
  const legacy = await Realm.open({ path: 'myrealm', schema: schemas, readOnly: true });
  try {
    const data = ['Farmer', 'Plot'].map(name => ({ name, rows: legacy.objects(name)
      .filtered('synced == false').map(row => ({ ...row, userId: String(userId) })) }));
    if (currentOfflinePath() !== targetPath) throw new Error('Session changed');
    const target = await Realm.open({ path: targetPath, schema: schemas });
    try {
      if (currentOfflinePath() !== targetPath) throw new Error('Session changed');
      target.write(() => {
        for (const { name, rows } of data) {
          for (const row of rows) {
            const existing = target.objectForPrimaryKey(name, (row as any).id) as any;
            if (existing) {
              const schema = schemas.find(item => item.name === name)!;
              if (!Object.keys(schema.properties).every(key => existing[key] === (row as any)[key])) {
                throw new Error('A different record with this ID already exists');
              }
            } else target.create(name, row);
          }
        }
      });
      await AsyncStorage.setItem(RECOVERY_KEY, targetPath);
    } finally { target.close(); }
  } finally { legacy.close(); }
}
