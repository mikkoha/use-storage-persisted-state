/**
 * Interface allows swapping LocalStorage for SessionStorage or Async Storage later
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SubscribeOptions {
  crossTabSync?: boolean;
  pollingIntervalMs?: number | null;
}

interface ListenerOptions {
  crossTabSync: boolean;
  pollingIntervalMs: number | null;
}

// Singleton manager ensures we only have ONE listener per key globally
class StorageSyncManager {
  private listeners = new Map<string, Map<() => void, ListenerOptions>>();
  private pollingIntervalId: number | null = null;
  private pollingIntervalMsActive: number | null = null;

  constructor(
    public readonly storage: StorageAdapter,
    private defaultPollingIntervalMs = 2000,
  ) {
    if (typeof window !== "undefined") {
      // 1. Cross-tab sync ("storage" event is a built-in browser feature that fires
      // when localStorage/sessionStorage changes in ANOTHER tab)
      // We do not remove this listener because this manager is a singleton meant to last
      // the entire application lifecycle. It is effectively cleaned up when the page unloads.
      window.addEventListener("storage", (e) => {
        if (e.key && this.listeners.has(e.key)) {
          this.notifyCrossTab(e.key);
        }
      });
      // 2. Start polling for DevTools or direct window.localStorage changes (robustness)
      // We only poll if there are listeners. Lazy start in subscribe.
    }
  }

  subscribe(key: string, callback: () => void, options: SubscribeOptions = {}) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Map());
    }
    const listenerOptions: ListenerOptions = {
      crossTabSync: options.crossTabSync ?? true,
      pollingIntervalMs: this.normalizePollingInterval(
        options.pollingIntervalMs,
      ),
    };
    this.listeners.get(key)!.set(callback, listenerOptions);

    this.updatePollingInterval();

    return () => {
      const listenersForKey = this.listeners.get(key);
      listenersForKey?.delete(callback);
      if (listenersForKey?.size === 0) {
        this.listeners.delete(key);
      }
      this.updatePollingInterval();
    };
  }

  // Called when WE change the value in this tab
  notify(key: string) {
    this.notifyListeners(key);
  }

  // Keep a cache of values to detect changes during polling
  private snapshotCache = new Map<string, string | null>();

  private notifyListeners(
    key: string,
    predicate?: (options: ListenerOptions) => boolean,
  ) {
    this.listeners.get(key)?.forEach((options, cb) => {
      if (!predicate || predicate(options)) {
        cb();
      }
    });
  }

  private notifyCrossTab(key: string) {
    this.notifyListeners(key, (options) => options.crossTabSync);
  }

  private notifyPolling(key: string) {
    this.notifyListeners(key, (options) => options.pollingIntervalMs !== null);
  }

  private normalizePollingInterval(
    pollingIntervalMs: number | null | undefined,
  ) {
    if (pollingIntervalMs === null) return null;
    if (pollingIntervalMs === undefined) return this.defaultPollingIntervalMs;
    if (pollingIntervalMs <= 0 || Number.isNaN(pollingIntervalMs)) {
      return null;
    }
    return pollingIntervalMs;
  }

  private getMinPollingIntervalMs() {
    let minInterval: number | null = null;
    this.listeners.forEach((listenersForKey) => {
      listenersForKey.forEach((options) => {
        if (options.pollingIntervalMs === null) return;
        if (minInterval === null || options.pollingIntervalMs < minInterval) {
          minInterval = options.pollingIntervalMs;
        }
      });
    });
    return minInterval;
  }

  private updatePollingInterval() {
    if (typeof window === "undefined") return;

    const nextInterval = this.getMinPollingIntervalMs();
    if (nextInterval === null) {
      if (this.pollingIntervalId) {
        clearInterval(this.pollingIntervalId);
      }
      this.pollingIntervalId = null;
      this.pollingIntervalMsActive = null;
      this.snapshotCache.clear();
      return;
    }

    if (
      this.pollingIntervalId &&
      this.pollingIntervalMsActive === nextInterval
    ) {
      return;
    }

    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
    }

    this.pollingIntervalId = window.setInterval(() => {
      this.listeners.forEach((listenersForKey, key) => {
        const shouldPoll = Array.from(listenersForKey.values()).some(
          (options) => options.pollingIntervalMs !== null,
        );
        if (!shouldPoll) return;

        const currentValue = this.storage.getItem(key);
        const lastValue = this.snapshotCache.get(key);

        if (currentValue !== lastValue) {
          this.snapshotCache.set(key, currentValue);
          this.notifyPolling(key);
        }
      });
    }, nextInterval);
    this.pollingIntervalMsActive = nextInterval;
  }
}

export const localStorageSync = new StorageSyncManager(window.localStorage);
export const sessionStorageSync = new StorageSyncManager(window.sessionStorage);
