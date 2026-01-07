import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStoragePersistedState } from "./useStoragePersistedState";

describe("useStoragePersistedState", () => {
  describe("Synchronization", () => {
    beforeEach(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("should update when storage event fires", async () => {
      const { result } = renderHook(() =>
        useStoragePersistedState("sync-key", "initial"),
      );

      act(() => {
        // Simulate foreign storage event
        window.localStorage.setItem("sync-key", "updated-external");
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "sync-key",
            newValue: "updated-external",
            storageArea: window.localStorage,
          }),
        );
      });

      expect(result.current[0]).toBe("updated-external");
      expect(window.localStorage.getItem("sync-key")).toBe("updated-external");
    });

    it("should ignore storage events when cross-tab sync is disabled", () => {
      const { result } = renderHook(() =>
        useStoragePersistedState("sync-disabled-key", "initial", {
          crossTabSync: false,
          pollingIntervalMs: null,
        }),
      );

      act(() => {
        window.localStorage.setItem("sync-disabled-key", "updated-external");
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "sync-disabled-key",
            newValue: "updated-external",
            storageArea: window.localStorage,
          }),
        );
      });

      expect(result.current[0]).toBe("initial");
      expect(window.localStorage.getItem("sync-disabled-key")).toBe(
        "updated-external",
      );
    });

    it("should only update hooks with cross-tab sync enabled when options differ", () => {
      const { result: enabled } = renderHook(() =>
        useStoragePersistedState("mixed-sync-key", "enabled-default", {
          crossTabSync: true,
          pollingIntervalMs: null,
        }),
      );
      const { result: disabled } = renderHook(() =>
        useStoragePersistedState("mixed-sync-key", "disabled-default", {
          crossTabSync: false,
          pollingIntervalMs: null,
        }),
      );

      act(() => {
        window.localStorage.setItem("mixed-sync-key", "updated-external");
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "mixed-sync-key",
            newValue: "updated-external",
            storageArea: window.localStorage,
          }),
        );
      });

      expect(enabled.current[0]).toBe("updated-external");
      expect(disabled.current[0]).toBe("disabled-default");
      expect(window.localStorage.getItem("mixed-sync-key")).toBe(
        "updated-external",
      );
    });

    it("should return default value if key is deleted in another tab", () => {
      const defaultValue = { v: "to-be-deleted" };
      const { result } = renderHook(() =>
        useStoragePersistedState("delete-key", defaultValue),
      );

      act(() => {
        // Simulate foreign storage event deleting the key
        window.localStorage.removeItem("delete-key");
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "delete-key",
            newValue: null,
            storageArea: window.localStorage,
          }),
        );
      });

      expect(result.current[0]).toEqual(defaultValue);
      expect(window.localStorage.getItem("delete-key")).toBeNull();
    });

    it("should return default value if key is deleted by another hook", () => {
      const defaultValue = { v: "to-be-deleted-by-hook" };
      const { result: hook1 } = renderHook(() =>
        useStoragePersistedState("delete-hook-key", defaultValue),
      );
      const { result: hook2 } = renderHook(() =>
        useStoragePersistedState("delete-hook-key", defaultValue),
      );

      act(() => {
        // Hook 1 deletes the key
        hook1.current[2]();
      });

      expect(hook2.current[0]).toEqual(defaultValue);
      expect(window.localStorage.getItem("delete-hook-key")).toBeNull();
    });

    it("should handle different default values in two hooks for the same key", () => {
      const { result: hook1 } = renderHook(() =>
        useStoragePersistedState("diff-defaults-key", "default-1"),
      );
      const { result: hook2 } = renderHook(() =>
        useStoragePersistedState("diff-defaults-key", "default-2"),
      );

      // Initially both hooks should read the same default (first one wins)
      expect(hook1.current[0]).toBe("default-1");
      expect(hook2.current[0]).toBe("default-2");
      expect(window.localStorage.getItem("diff-defaults-key")).toBeNull();

      // Hook 2 sets a value
      act(() => {
        hook2.current[1]("set-by-hook-2");
      });
      expect(hook1.current[0]).toBe("set-by-hook-2");
      expect(hook2.current[0]).toBe("set-by-hook-2");

      // Hook 1 deletes the key
      act(() => {
        hook1.current[2]();
      });
      expect(hook1.current[0]).toBe("default-1");
      expect(hook2.current[0]).toBe("default-2");
    });

    it("should sync between two hooks in same tab", () => {
      const { result: hook1 } = renderHook(() =>
        useStoragePersistedState("shared-key", "initial"),
      );
      const { result: hook2 } = renderHook(() =>
        useStoragePersistedState("shared-key", "initial"),
      );

      act(() => {
        hook1.current[1]("changed-by-1");
      });

      expect(hook2.current[0]).toBe("changed-by-1");
      expect(hook1.current[0]).toBe("changed-by-1");
    });

    it("should increment with a set function", () => {
      const { result } = renderHook(() =>
        useStoragePersistedState("counter-key", 0),
      );

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      expect(result.current[0]).toBe(1);
      expect(window.localStorage.getItem("counter-key")).toBe("1");
    });

    it("should handle concurrent increments from two hooks", () => {
      const { result: hook1 } = renderHook(() =>
        useStoragePersistedState("concurrent-key", 0),
      );
      const { result: hook2 } = renderHook(() =>
        useStoragePersistedState("concurrent-key", 0),
      );

      act(() => {
        hook1.current[1]((prev) => prev + 1);
        hook2.current[1]((prev) => prev + 1);
      });

      expect(hook1.current[0]).toBe(2);
      expect(hook2.current[0]).toBe(2);
    });

    it("should detect external changes via polling", async () => {
      // Use fake timers to control polling
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useStoragePersistedState("polling-key", "initial"),
      );

      // Bypass hook, bypass other-tab-event. Just set item.
      window.localStorage.setItem("polling-key", "silent-change");

      // Advance timers by polling interval (2000ms default)
      act(() => {
        vi.advanceTimersByTime(2500);
      });

      expect(result.current[0]).toBe("silent-change");

      vi.useRealTimers();
    });

    it("should use a custom polling interval", () => {
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useStoragePersistedState("polling-custom-key", "initial", {
          pollingIntervalMs: 500,
        }),
      );

      window.localStorage.setItem("polling-custom-key", "custom-change");

      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(result.current[0]).toBe("initial");

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current[0]).toBe("custom-change");
    });

    it("should use the shortest polling interval for the same key", () => {
      vi.useFakeTimers();

      const { result: slowHook } = renderHook(() =>
        useStoragePersistedState("polling-shared-key", "initial", {
          pollingIntervalMs: 1000,
        }),
      );
      const { result: fastHook } = renderHook(() =>
        useStoragePersistedState("polling-shared-key", "initial", {
          pollingIntervalMs: 200,
        }),
      );

      window.localStorage.setItem("polling-shared-key", "updated");

      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(slowHook.current[0]).toBe("initial");
      expect(fastHook.current[0]).toBe("initial");

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(slowHook.current[0]).toBe("updated");
      expect(fastHook.current[0]).toBe("updated");
    });

    it("should not notify hooks with polling disabled when another hook enables polling", () => {
      vi.useFakeTimers();

      const { result: pollingDisabled } = renderHook(() =>
        useStoragePersistedState("polling-mixed-key", "initial", {
          pollingIntervalMs: null,
        }),
      );
      const { result: pollingEnabled } = renderHook(() =>
        useStoragePersistedState("polling-mixed-key", "initial", {
          pollingIntervalMs: 200,
        }),
      );

      window.localStorage.setItem("polling-mixed-key", "updated");

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(pollingEnabled.current[0]).toBe("updated");
      expect(pollingDisabled.current[0]).toBe("initial");
    });

    it("should start and stop polling as hooks mount and unmount", () => {
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(window, "setInterval");
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");

      const { unmount, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useStoragePersistedState("polling-lifecycle-key", "initial", {
            pollingIntervalMs: enabled ? 200 : null,
          }),
        { initialProps: { enabled: true } },
      );

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);

      act(() => {
        rerender({ enabled: false });
      });
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

      act(() => {
        rerender({ enabled: true });
      });
      expect(setIntervalSpy).toHaveBeenCalledTimes(2);

      unmount();
      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
    });

    it("should not start polling when polling is disabled", () => {
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(window, "setInterval");

      renderHook(() =>
        useStoragePersistedState("polling-disabled-only-key", "initial", {
          pollingIntervalMs: null,
        }),
      );

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it("should reuse a single interval and update it when the shortest unmounts", () => {
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(window, "setInterval");
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");

      const { unmount: unmountFast } = renderHook(() =>
        useStoragePersistedState("polling-interval-reuse-key", "initial", {
          pollingIntervalMs: 200,
        }),
      );
      const { result: slowResult, unmount: unmountSlow } = renderHook(() =>
        useStoragePersistedState("polling-interval-reuse-key", "initial", {
          pollingIntervalMs: 1000,
        }),
      );

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      act(() => {
        unmountFast();
      });

      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(setIntervalSpy).toHaveBeenCalledTimes(2);

      window.localStorage.setItem("polling-interval-reuse-key", "updated");

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(slowResult.current[0]).toBe("initial");

      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(slowResult.current[0]).toBe("updated");

      unmountSlow();
      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("should allow disabling polling", () => {
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useStoragePersistedState("polling-disabled-key", "initial", {
          pollingIntervalMs: null,
        }),
      );

      window.localStorage.setItem("polling-disabled-key", "silent-change");

      act(() => {
        vi.advanceTimersByTime(2500);
      });

      expect(result.current[0]).toBe("initial");
    });
  });
});
