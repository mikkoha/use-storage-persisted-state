"use client";

import { Codec, inferCodec, JsonCodec } from "./codecs";
import {
  localStorageSync,
  memoryStorageSync,
  sessionStorageSync,
} from "./storage";
import {
  StoragePersistedStateOptions,
  StorageType,
} from "./useStoragePersistedState";

function getSyncManager(storageType: StorageType | undefined) {
  if (storageType === "sessionStorage") return sessionStorageSync;
  if (storageType === "memory") return memoryStorageSync;
  return localStorageSync;
}

function resolveCodec<T>(
  key: string,
  valueHint: T,
  options?: StoragePersistedStateOptions<T>,
): Codec<T> {
  if (options?.codec) return options.codec;

  if ((valueHint === undefined || valueHint === null) && !options?.codec) {
    console.warn(
      `storagePersistedState: Key "${key}" uses undefined or null default without explicit Codec. defaulting to JSON.`,
    );
  }

  return inferCodec(valueHint);
}

// Overload 1: Default provided, T inferred
/**
 * Read a persisted value from storage using the same codec behavior as the hook.
 *
 * Returns the provided defaultValue when the key is missing or parsing fails.
 */
export function readStoragePersistedState<T>(
  key: string,
  defaultValue: Exclude<T, null | undefined>,
  options?: StoragePersistedStateOptions<T>,
): T;

// Overload 2: Explicit Codec provided, defaultValue can be null or undefined
/**
 * Read a persisted value from storage using an explicit codec.
 *
 * Use this overload when defaultValue is null or undefined.
 */
export function readStoragePersistedState<T>(
  key: string,
  defaultValue: null | undefined,
  options: StoragePersistedStateOptions<T> & { codec: Codec<T> },
): T | null;

export function readStoragePersistedState<T>(
  key: string,
  defaultValue: T,
  options: StoragePersistedStateOptions<T> = {},
) {
  const syncManager = getSyncManager(options.storageType);
  const adapter = syncManager.storage;
  const codec = resolveCodec(key, defaultValue, options);
  const raw = adapter.getItem(key);

  if (raw === null && defaultValue !== undefined) {
    return defaultValue as T;
  }

  try {
    return codec.decode(raw);
  } catch (error) {
    console.error(`Error parsing storage key "${key}"`, error);
    return defaultValue as T;
  }
}

// Overload 1: Default provided, T inferred
/**
 * Set a persisted value in storage and notify active hooks for the same key.
 *
 * Supports functional updates using the current decoded value.
 */
export function setStoragePersistedState<T>(
  key: string,
  newValue: Exclude<T, null | undefined>,
  options?: StoragePersistedStateOptions<T>,
): void;

// Overload 2: Explicit Codec provided, newValue can be null or undefined
/**
 * Set a persisted value in storage using an explicit codec and notify listeners.
 *
 * Use this overload when the new value is null or undefined or when you want custom serialization.
 */
export function setStoragePersistedState<T>(
  key: string,
  newValue: T | ((prev: T | null) => T),
  options: StoragePersistedStateOptions<T> & { codec: Codec<T> },
): void;

export function setStoragePersistedState<T>(
  key: string,
  newValueOrFn: T | ((prev: T | null) => T),
  options: StoragePersistedStateOptions<T> = {},
) {
  const syncManager = getSyncManager(options.storageType);
  const adapter = syncManager.storage;

  let codec: Codec<T>;
  if (!(newValueOrFn instanceof Function)) {
    codec = resolveCodec(key, newValueOrFn, options);
  } else {
    // For functional updates, we cannot infer from newValue
    if (!options.codec) {
      console.warn(
        `storagePersistedState: Key "${key}" uses functional update without explicit Codec. defaulting to JSON.`,
      );
    }
    codec = options.codec ?? (JsonCodec as unknown as Codec<T>);
  }

  try {
    const currentRaw = adapter.getItem(key);
    const current = currentRaw !== null ? codec.decode(currentRaw) : null;

    const newValue =
      newValueOrFn instanceof Function ? newValueOrFn(current) : newValueOrFn;

    if (newValue === undefined || newValue === null) {
      adapter.removeItem(key);
    } else {
      const encoded = codec.encode(newValue);
      if (encoded === null || encoded === undefined) {
        adapter.removeItem(key);
      } else {
        adapter.setItem(key, encoded);
      }
    }

    syncManager.notify(key);
  } catch (error) {
    console.error(`Error setting storage key "${key}":`, error);
  }
}
