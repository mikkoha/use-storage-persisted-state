import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStoragePersistedState } from "./useStoragePersistedState";

const createQuotaError = () =>
  new DOMException("Quota exceeded", "QuotaExceededError");

describe("useStoragePersistedState", () => {
  describe("Quota fallback", () => {
    beforeEach(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    it("updates in memory when localStorage.setItem throws", async () => {
      const key = "quota-key";
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw createQuotaError();
      });

      const hookA = renderHook(() => useStoragePersistedState(key, "base"));
      const hookB = renderHook(() => useStoragePersistedState(key, "base"));

      act(() => {
        hookA.result.current[1]("next");
      });

      expect(hookA.result.current[0]).toBe("next");
      expect(window.localStorage.getItem(key)).toBe(null);

      await waitFor(() => {
        expect(hookB.result.current[0]).toBe("next");
      });
    });

    it("clears the in-memory fallback when removeItem is called", () => {
      const key = "quota-remove";
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw createQuotaError();
      });

      const { result } = renderHook(() =>
        useStoragePersistedState(key, "base"),
      );

      act(() => {
        result.current[1]("next");
      });

      expect(result.current[0]).toBe("next");

      act(() => {
        result.current[2]();
      });

      expect(result.current[0]).toBe("base");
    });

    it("clears fallback after localStorage writes succeed again", () => {
      const key = "quota-recover";
      const originalSetItem = Storage.prototype.setItem;
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
      setItemSpy.mockImplementationOnce(() => {
        throw createQuotaError();
      });
      setItemSpy.mockImplementation(function (this: Storage, item, value) {
        return originalSetItem.call(this, item, value);
      });

      const hookA = renderHook(() => useStoragePersistedState(key, "base"));

      act(() => {
        hookA.result.current[1]("first");
      });

      expect(hookA.result.current[0]).toBe("first");
      expect(window.localStorage.getItem(key)).toBe(null);

      act(() => {
        hookA.result.current[1]("second");
      });

      expect(window.localStorage.getItem(key)).toBe("second");

      const hookB = renderHook(() => useStoragePersistedState(key, "base"));
      expect(hookB.result.current[0]).toBe("second");
    });

    it("falls back to memory when sessionStorage.setItem throws", async () => {
      const key = "session-quota";
      const originalSetItem = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
        this: Storage,
        item,
        value,
      ) {
        if (this === window.sessionStorage) {
          throw createQuotaError();
        }
        return originalSetItem.call(this, item, value);
      });

      const hookA = renderHook(() =>
        useStoragePersistedState(key, "base", {
          storageType: "sessionStorage",
        }),
      );
      const hookB = renderHook(() =>
        useStoragePersistedState(key, "base", {
          storageType: "sessionStorage",
        }),
      );

      act(() => {
        hookA.result.current[1]("next");
      });

      expect(hookA.result.current[0]).toBe("next");
      expect(window.sessionStorage.getItem(key)).toBe(null);

      await waitFor(() => {
        expect(hookB.result.current[0]).toBe("next");
      });
    });
  });
});
