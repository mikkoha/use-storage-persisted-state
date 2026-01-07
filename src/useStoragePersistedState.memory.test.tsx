import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useStoragePersistedState } from "./useStoragePersistedState";

describe("useStoragePersistedState", () => {
  describe("Memory storage", () => {
    beforeEach(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    afterEach(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    it("stores values in memory without touching localStorage", () => {
      const key = "memory-only";
      const { result } = renderHook(() =>
        useStoragePersistedState(key, "default", { storageType: "memory" }),
      );

      expect(result.current[0]).toBe("default");

      act(() => {
        result.current[1]("next");
      });

      expect(result.current[0]).toBe("next");
      expect(window.localStorage.getItem(key)).toBe(null);
    });

    it("syncs between hooks using the same memory key", async () => {
      const key = "memory-sync";
      const hookA = renderHook(() =>
        useStoragePersistedState(key, 0, { storageType: "memory" }),
      );
      const hookB = renderHook(() =>
        useStoragePersistedState(key, 0, { storageType: "memory" }),
      );

      act(() => {
        hookA.result.current[1](1);
      });

      await waitFor(() => {
        expect(hookB.result.current[0]).toBe(1);
      });
    });

    it("ignores storage events from other tabs for memory storage", () => {
      const key = "memory-event";
      const { result } = renderHook(() =>
        useStoragePersistedState(key, "default", { storageType: "memory" }),
      );

      act(() => {
        window.localStorage.setItem(key, "external");
        window.dispatchEvent(
          new StorageEvent("storage", {
            key,
            newValue: "external",
            storageArea: window.localStorage,
          }),
        );
      });

      expect(result.current[0]).toBe("default");
    });
  });
});
