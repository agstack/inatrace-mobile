import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from 'expo-modules-core';
import { normalizeServerUrl } from '../utils/servers';

const KEY = 'offline_server_ids_v1';
let activePath: string | null = null;
let contextGeneration = 0;
let updateQueue: Promise<unknown> = Promise.resolve();

export async function selectOfflineContext(server: string, userId: string | number): Promise<string> {
  const generation = ++contextGeneration;
  const normalized = normalizeServerUrl(server, true, true);
  const job = updateQueue.then(async () => {
    const raw = await AsyncStorage.getItem(KEY);
    const ids: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (!ids[normalized]) {
      ids[normalized] = uuid.v4();
      await AsyncStorage.setItem(KEY, JSON.stringify(ids));
    }
    const account = String(userId);
    if (!/^[0-9]+$/.test(account)) throw new Error('Invalid account ID');
    return `offline-${ids[normalized]}-${account}.realm`;
  });
  updateQueue = job.catch(() => undefined);
  const path = await job;
  if (generation !== contextGeneration) throw new Error('Offline account context changed');
  activePath = path;
  return path;
}

export function clearOfflineContext(): void { contextGeneration++; activePath = null; }

export function currentOfflinePath(): string {
  if (!activePath) throw new Error('Offline account context is unavailable');
  return activePath;
}
