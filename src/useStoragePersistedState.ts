import { useCallback, useSyncExternalStore, useMemo, useRef } from "react";
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
// TODO: T can not include null or undefined here?
export function useStoragePersistedState<T>(
  key: string,
  defaultValue: T,
  options?: Options<T>,
): [T, (newValue: T | ((prev: T) => T)) => void];

// Overload 2: Explicit Codec provided, defaultValue can be null or undefined
export function useStoragePersistedState<T>(
  key: string,
  defaultValue: null | undefined,
  options: Options<T> & { codec: Codec<T> },
): [T | null, (newValue: T | ((prev: T) => T)) => void];

// Implementation
export function useStoragePersistedState<T>(
  key: string,
  defaultValue: T,
  options: Options<T> = {},
) {
  // TODO: Access this from the sync manager directly?
  const adapter =
    options.storageType === "sessionStorage"
      ? window.sessionStorage
      : window.localStorage;
  const syncManager =
    options.storageType === "sessionStorage"
      ? sessionStorageSync
      : localStorageSync;

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
  const lastRaw = useRef<string | null>(null);
  const lastParsed = useRef<T | undefined>(undefined);

  const getSnapshot = useCallback(() => {
    const raw = adapter.getItem(key);

    // If raw value matches cache, return cached object.
    if (raw === lastRaw.current && lastParsed.current !== undefined)
      return lastParsed.current as T;

    // If key is missing, return default.
    if (raw === null) return defaultValue as T;

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
  // TODO: Support also pre 18 React versions? (as defined in package.json peerDeps)
  const value = useSyncExternalStore(
    (callback) => syncManager.subscribe(key, callback),
    getSnapshot,
    () => defaultValue as T, // Server Snapshot
  );

  // 3. Create the Setter
  const setValue = useCallback(
    (newValueOrFn: T | ((prev: T) => T)) => {
      try {
        const raw = adapter.getItem(key);
        // We can reuse getSnapshot logic or just decode again.
        // Decoding is safer to be fresh, but we can optimistically use value?
        // Let's stick to reading from storage to be safe (concurrent updates).
        const current = raw !== null ? codec.decode(raw) : defaultValue;

        const newValue =
          newValueOrFn instanceof Function
            ? newValueOrFn(current)
            : newValueOrFn;

        if (newValue === undefined) {
          lastRaw.current = null;
          lastParsed.current = undefined;
          adapter.removeItem(key);
        } else {
          const encoded = codec.encode(newValue);
          lastRaw.current = encoded;
          lastParsed.current = newValue;

          if (encoded === null) {
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

  return [value, setValue] as const;
}
