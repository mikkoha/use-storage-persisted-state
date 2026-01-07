import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStoragePersistedState } from "./useStoragePersistedState";

describe("useStoragePersistedState", () => {
  describe("Basic functionality", () => {
    beforeEach(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should initialize with default value when storage is empty", () => {
      const { result } = renderHook(() =>
        useStoragePersistedState("test-key", "default"),
      );

      expect(result.current[0]).toBe("default");
      expect(window.localStorage.getItem("test-key")).toBeNull();
    });

    it("should persist value to storage when set", () => {
      const { result } = renderHook(() =>
        useStoragePersistedState("test-key", "default"),
      );

      act(() => {
        result.current[1]("new-value");
      });

      expect(result.current[0]).toBe("new-value");
      expect(window.localStorage.getItem("test-key")).toBe("new-value");
    });

    it("should remove key from storage when set to undefined", () => {
      window.localStorage.setItem("test-key", "initial");
      const { result } = renderHook(() =>
        useStoragePersistedState<string | undefined>("test-key", "initial"),
      );

      act(() => {
        result.current[1](undefined);
      });

      expect(window.localStorage.getItem("test-key")).toBeNull();
    });

    it("should remove key from storage when set to null", () => {
      window.localStorage.setItem("test-key", "initial");
      const { result } = renderHook(() =>
        useStoragePersistedState<string | null>("test-key", "initial"),
      );

      act(() => {
        result.current[1](null);
      });

      expect(window.localStorage.getItem("test-key")).toBeNull();
    });

    it("should remove key from storage when remove is called", () => {
      window.localStorage.setItem("remove-key", "stored");
      const { result } = renderHook(() =>
        useStoragePersistedState("remove-key", "default"),
      );

      expect(result.current[0]).toBe("stored");

      act(() => {
        result.current[2]();
      });

      expect(result.current[0]).toBe("default");
      expect(window.localStorage.getItem("remove-key")).toBeNull();
    });

    it("should use session storage when configured", () => {
      const { result } = renderHook(() =>
        useStoragePersistedState("session-key", "start", {
          storageType: "sessionStorage",
        }),
      );

      act(() => {
        result.current[1]("updated");
      });

      expect(window.sessionStorage.getItem("session-key")).toBe("updated");
      expect(window.localStorage.getItem("session-key")).toBeNull();
    });
  });
});
