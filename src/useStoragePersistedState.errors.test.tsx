import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStoragePersistedState } from "./useStoragePersistedState";

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe("useStoragePersistedState", () => {
  describe("Edge cases & errors", () => {
    beforeEach(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      console.error = vi.fn();
      console.warn = vi.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      vi.restoreAllMocks();
    });

    it("should return default value on json parse error but keep storage intact", () => {
      window.localStorage.setItem("bad-json", "INVALID_JSON{");

      const { result } = renderHook(() =>
        useStoragePersistedState("bad-json", { foo: "default" }),
      );

      expect(result.current[0]).toEqual({ foo: "default" });
      expect(console.warn).toHaveBeenCalled(); // JsonCodec logs warning
      expect(window.localStorage.getItem("bad-json")).toBe("INVALID_JSON{");
    });

    it("should require codec if default is undefined", () => {
      // @ts-expect-error - Testing runtime warning for invalid usage
      renderHook(() => useStoragePersistedState("undefined-key", undefined));

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "uses undefined or null default without explicit Codec",
        ),
      );
    });

    it("should require codec if default is null", () => {
      // @ts-expect-error - Testing runtime warning for invalid usage
      renderHook(() => useStoragePersistedState("undefined-key", null));

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "uses undefined or null default without explicit Codec",
        ),
      );
    });
  });
});
