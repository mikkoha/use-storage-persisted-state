import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStoragePersistedState } from "./useStoragePersistedState";

// Mocking console to avoid clutter during tests and to assert on warnings/errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe("useStoragePersistedState", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Basic functionality", () => {
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

  describe("Type serialization (codecs)", () => {
    it("should handle boolean false correctly", () => {
      const { result } = renderHook(() =>
        useStoragePersistedState("bool-key", true),
      );

      act(() => {
        result.current[1](false);
      });

      expect(result.current[0]).toBe(false);
      expect(window.localStorage.getItem("bool-key")).toBe("false");
    });

    it("should allow configuring custom boolean strings/values with a custom codec", () => {
      const CustomBoolCodec = {
        encode: (val: boolean) => (val ? "Y" : "N"),
        decode: (val: string | null) => val === "Y",
      };

      const { result } = renderHook(() =>
        useStoragePersistedState("bool-custom-key", true, {
          codec: CustomBoolCodec,
        }),
      );

      act(() => {
        result.current[1](false);
      });

      expect(window.localStorage.getItem("bool-custom-key")).toBe("N");
      expect(result.current[0]).toBe(false);
    });

    it("should handle boolean true correctly", () => {
      const { result } = renderHook(() =>
        useStoragePersistedState("bool-true-key", false),
      );

      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(true);
      expect(window.localStorage.getItem("bool-true-key")).toBe("true");
    });

    const numberCases: Array<{
      name: string;
      value: number;
      expected: string;
      assert: (current: number) => void;
    }> = [
      {
        name: "zero",
        value: 0,
        expected: "0",
        assert: (current) => expect(current).toBe(0),
      },
      {
        name: "negative integer",
        value: -42,
        expected: "-42",
        assert: (current) => expect(current).toBe(-42),
      },
      {
        name: "float",
        value: 3.25,
        expected: "3.25",
        assert: (current) => expect(current).toBe(3.25),
      },
      {
        name: "NaN",
        value: Number.NaN,
        expected: "NaN",
        assert: (current) => expect(Number.isNaN(current)).toBe(true),
      },
      {
        name: "Infinity",
        value: Infinity,
        expected: "Infinity",
        assert: (current) => expect(current).toBe(Infinity),
      },
      {
        name: "-Infinity",
        value: -Infinity,
        expected: "-Infinity",
        assert: (current) => expect(current).toBe(-Infinity),
      },
    ];

    for (const testCase of numberCases) {
      it(`should handle number ${testCase.name} correctly`, () => {
        const { result } = renderHook(() =>
          useStoragePersistedState("num-key", 10),
        );

        act(() => {
          result.current[1](testCase.value);
        });

        expect(window.localStorage.getItem("num-key")).toBe(testCase.expected);
        testCase.assert(result.current[0]);
      });
    }

    const stringCases: Array<{
      name: string;
      value: string;
      expected: string;
    }> = [
      { name: "empty string", value: "", expected: "" },
      { name: "normal string", value: "hello world", expected: "hello world" },
      {
        name: "special chars",
        value: "!@#$%^&*()_+-=[]{}|;:'\",.<>/?`~",
        expected: "!@#$%^&*()_+-=[]{}|;:'\",.<>/?`~",
      },
      {
        name: "unicode",
        value: "Iñtërnâtiônàlizætiøn こんにちは",
        expected: "Iñtërnâtiônàlizætiøn こんにちは",
      },
      {
        name: "json string",
        value: '{"foo":"bar","count":1}',
        expected: '{"foo":"bar","count":1}',
      },
    ];

    for (const testCase of stringCases) {
      it(`should handle ${testCase.name} correctly`, () => {
        const { result } = renderHook(() =>
          useStoragePersistedState("str-key", "default"),
        );

        act(() => {
          result.current[1](testCase.value);
        });

        expect(window.localStorage.getItem("str-key")).toBe(testCase.expected);
        expect(result.current[0]).toBe(testCase.value);
        expect(typeof result.current[0]).toBe("string");
      });
    }

    it("should serialize complex objects", () => {
      const defaultValue = { foo: "bar" };
      const { result } = renderHook(() =>
        useStoragePersistedState("obj-key", defaultValue),
      );

      const newValue = { foo: "baz", val: 123 };
      act(() => {
        result.current[1](newValue);
      });

      expect(result.current[0]).toEqual(newValue);
      expect(window.localStorage.getItem("obj-key")).toBe(
        JSON.stringify(newValue),
      );
    });

    it("should serialize nested objects and arrays", () => {
      const defaultValue = {
        id: 1,
        tags: ["alpha", "beta"],
        meta: { flags: { active: true }, counts: [1, 2, 3] },
      };
      const { result } = renderHook(() =>
        useStoragePersistedState("obj-nested-key", defaultValue),
      );

      const newValue = {
        id: 2,
        tags: ["gamma", "delta", "epsilon"],
        meta: { flags: { active: false }, counts: [3, 2, 1] },
      };

      act(() => {
        result.current[1](newValue);
      });

      expect(result.current[0]).toEqual(newValue);
      expect(window.localStorage.getItem("obj-nested-key")).toBe(
        JSON.stringify(newValue),
      );
    });

    it("should not persist explicit null values with JSON codec", () => {
      const { result } = renderHook(() =>
        useStoragePersistedState<object | null>("null-key-default", { a: 1 }),
      );

      act(() => {
        result.current[1](null);
      });

      expect(result.current[0]).toBeNull();
      expect(window.localStorage.getItem("null-key-default")).toBeNull();
    });
  });

  describe("Synchronization", () => {
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
  });

  describe("Edge cases & errors", () => {
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
