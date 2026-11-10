import { deleteItemAsync, setItemAsync, getItemAsync } from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReducer, useEffect, useCallback, useRef } from 'react';

type StorageValue = string | object | number | null | boolean;
type StorageType = 'secureStore' | 'asyncStorage';

type UseStateHook<T> = [T, (value: T) => Promise<void>];

function useAsyncState<T>(initialValue: T): UseStateHook<T> {
  return useReducer(
    (state: T, action: T): T => action,
    initialValue
  ) as UseStateHook<T>;
}

async function setStorageItemAsync(
  key: string,
  value: StorageValue,
  storageType: StorageType
) {
  const valueToStore = JSON.stringify(value);
  if (value === null) {
    if (storageType === 'secureStore') {
      await deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } else {
    if (storageType === 'secureStore') {
      await setItemAsync(key, valueToStore);
    } else {
      await AsyncStorage.setItem(key, valueToStore);
    }
  }
}

export function useStorageState<T extends StorageValue>(
  key: string,
  initialValue: T,
  storageType: StorageType = 'secureStore'
): UseStateHook<T> {
  const [state, setState] = useAsyncState<T>(initialValue);
  const didSetBeforeHydration = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        let value: string | null = null;
        if (storageType === 'secureStore') {
          value = await getItemAsync(key);
        } else {
          value = await AsyncStorage.getItem(key);
        }
        // A login/logout may set this key while the asynchronous read is
        // still in flight. Do not let the stale stored value overwrite it.
        if (didSetBeforeHydration.current) return;
        const parsedValue = value ? JSON.parse(value) : 'none';
        setState(parsedValue);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [key, storageType, initialValue]);

  const setValue = useCallback(
    async (value: T) => {
      didSetBeforeHydration.current = true;
      setState(value);
      await setStorageItemAsync(key, value, storageType);
    },
    [key, storageType]
  );

  return [state, setValue];
}
