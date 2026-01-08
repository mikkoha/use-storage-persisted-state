export { useStoragePersistedState } from "./useStoragePersistedState";
export type {
  StoragePersistedStateOptions,
  StorageType,
} from "./useStoragePersistedState";
export type { Codec } from "./codecs";
export {
  JsonCodec,
  StringCodec,
  BooleanCodec,
  NumberCodec,
  inferCodec,
} from "./codecs";
export {
  getStoragePersistedState,
  getStoragePersistedState as readStoragePersistedState,
  setStoragePersistedState,
  removeStoragePersistedState,
} from "./storagePersistedState";
