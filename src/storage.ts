/**
 * Interface allows swapping LocalStorage for SessionStorage or Async Storage later
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// Singleton manager ensures we only have ONE listener per key globally
class StorageSyncManager {
  private listeners = new Map<string, Set<() => void>>();

  constructor(
    private storage: StorageAdapter,
    private pollingIntervalMs = 2000,
  ) {
    if (typeof window !== "undefined") {
      // 1. Cross-tab sync
      // TODO: Where/when do we remove this listener? Should we? Comment if not needed.
      window.addEventListener("storage", (e) => {
        if (e.key && this.listeners.has(e.key)) {
          this.notify(e.key);
        }
      });
      // 2. Start polling for DevTools or direct window.localStorage changes (robustness)
      // We only poll if there are listeners. Lazy start in subscribe.
    }
  }

  subscribe(key: string, callback: () => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    this.startPolling();

    return () => {
      this.listeners.get(key)?.delete(callback);
      if (this.listeners.get(key)?.size === 0) {
        this.listeners.delete(key);
      }
      this.stopPollingIfIdle();
    };
  }

  // Called when WE change the value in this tab
  notify(key: string) {
    this.listeners.get(key)?.forEach((cb) => cb());
  }

  private pollingIntervalId: number | null = null;

  // Keep a cache of values to detect changes during polling
  private snapshotCache = new Map<string, string | null>();

  private startPolling() {
    if (this.pollingIntervalId || typeof window === "undefined") return;

    this.pollingIntervalId = window.setInterval(() => {
      this.listeners.forEach((_, key) => {
        const currentValue = this.storage.getItem(key);
        const lastValue = this.snapshotCache.get(key);

        if (currentValue !== lastValue) {
          this.snapshotCache.set(key, currentValue);
          this.notify(key);
        }
      });
    }, this.pollingIntervalMs);
  }

  private stopPollingIfIdle() {
    if (this.listeners.size === 0 && this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
      this.snapshotCache.clear();
    }
  }
}

export const localStorageSync = new StorageSyncManager(window.localStorage);
export const sessionStorageSync = new StorageSyncManager(window.sessionStorage);
