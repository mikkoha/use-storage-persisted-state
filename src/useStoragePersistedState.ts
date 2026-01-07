import { useCallback, useMemo, useRef } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import { Codec, inferCodec } from "./codecs";
import { localStorageSync, sessionStorageSync } from "./storage";

type StorageType = "localStorage" | "sessionStorage";

/**
 * Options for the useStoragePersistedState hook
 */
interface Options<T> {
  /**
   * Explicit codec for complex types or when defaultValue is null.
   */
  codec?: Codec<T>;
  storageType?: StorageType;
}

// Overload 1: Default provided, T inferred
export function useStoragePersistedState<T>(
  key: string,
  defaultValue: Exclude<T, null | undefined>,
  options?: Options<T>,
): [T, (newValue: T | ((prev: T) => T)) => void, () => void];

// Overload 2: Explicit Codec provided, defaultValue can be null or undefined
export function useStoragePersistedState<T>(
  key: string,
  defaultValue: null | undefined,
  options: Options<T> & { codec: Codec<T> },
): [T | null, (newValue: T | ((prev: T) => T)) => void, () => void];

// Implementation
export function useStoragePersistedState<T>(
  key: string,
  defaultValue: T,
  options: Options<T> = {},
) {
  const syncManager =
    options.storageType === "sessionStorage"
      ? sessionStorageSync
      : localStorageSync;
  const adapter = syncManager.storage;

  // 1. Determine the codec.
  // If no explicit codec is passed, we try to infer it from defaultValue.
  // If defaultValue is undefined and no codec is passed, we fall back to JSON.
  const codec = useMemo(() => {
    if (options?.codec) return options.codec;
    return inferCodec(defaultValue);
  }, [defaultValue, options?.codec]);

  if ((defaultValue === undefined || defaultValue === null) && !options.codec) {
    console.warn(
      `useStorage: Key "${key}" uses undefined or null default without explicit Codec. defaulting to JSON.`,
    );
  }

  // Memoize the decoded value to prevent infinite loops in useSyncExternalStore
  // when the codec returns a new object reference (e.g. JSON.parse).
  const lastRaw = useRef<string | null>(null); // string | null, because storage returns null for missing keys
  const lastParsed = useRef<T | undefined>(undefined);

  const getSnapshot = useCallback(() => {
    const raw = adapter.getItem(key);

    // Return default if storage is missing the key
    if (raw === null && defaultValue !== undefined) {
      return defaultValue as T;
    }

    // If raw value matches cache, return cached object.
    if (raw === lastRaw.current) {
      if (lastParsed.current === undefined) {
        return null as T;
      }
      return lastParsed.current as T;
    }

    // Decode new raw value
    try {
      const decoded = codec.decode(raw);

      lastRaw.current = raw;
      lastParsed.current = decoded;
      return decoded;
    } catch (e) {
      console.error(`Error parsing storage key "${key}"`, e);
      return defaultValue as T;
    }
  }, [adapter, key, codec, defaultValue]);

  // 2. Subscribe to the external store (Local/SessionStorage + Polling/Events)
  // useSyncExternalStore handles the hydration mismatch automatically by
  // taking a `getServerSnapshot` (returning defaultValue).
  const value = useSyncExternalStore(
    (callback) => syncManager.subscribe(key, callback),
    getSnapshot,
    () => defaultValue as T, // Server Snapshot
  );

  // 3. Create the Setter
  const setValue = useCallback(
    (newValueOrFn: T | ((prev: T) => T)) => {
      try {
        const currentRaw = adapter.getItem(key);
        const current =
          currentRaw !== null ? codec.decode(currentRaw) : defaultValue;

        const newValue =
          newValueOrFn instanceof Function
            ? newValueOrFn(current)
            : newValueOrFn;

        if (newValue === undefined || newValue === null) {
          lastRaw.current = null;
          lastParsed.current = undefined;
          adapter.removeItem(key);
        } else {
          const encoded = codec.encode(newValue);
          lastRaw.current = encoded;
          lastParsed.current = newValue;

          if (encoded === null || encoded === undefined) {
            adapter.removeItem(key);
          } else {
            adapter.setItem(key, encoded);
          }
        }

        // Notify other hooks/tabs
        syncManager.notify(key);
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [adapter, key, codec, defaultValue, syncManager],
  );

  const removeItem = useCallback(() => {
    try {
      lastRaw.current = null;
      lastParsed.current = undefined;
      adapter.removeItem(key);
      syncManager.notify(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [adapter, key, syncManager]);

  return [value, setValue, removeItem] as const;
}
