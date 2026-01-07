import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStoragePersistedState } from "./useStoragePersistedState";

describe("useStoragePersistedState", () => {
  describe("Type serialization (codecs)", () => {
    beforeEach(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe("BooleanCodec", () => {
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

    describe("NumberCodec", () => {
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

          expect(window.localStorage.getItem("num-key")).toBe(
            testCase.expected,
          );
          testCase.assert(result.current[0]);
        });
      }
    });

    describe("StringCodec", () => {
      const stringCases: Array<{
        name: string;
        value: string;
        expected: string;
      }> = [
        { name: "empty string", value: "", expected: "" },
        {
          name: "normal string",
          value: "hello world",
          expected: "hello world",
        },
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

          expect(window.localStorage.getItem("str-key")).toBe(
            testCase.expected,
          );
          expect(result.current[0]).toBe(testCase.value);
          expect(typeof result.current[0]).toBe("string");
        });
      }
    });

    describe("JsonCodec", () => {
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

      it("should serialize arrays", () => {
        const defaultValue: Array<number | string> = [1, 2, 3];
        const { result } = renderHook(() =>
          useStoragePersistedState("array-key", defaultValue),
        );

        const newValue = ["a", "b", "c", 4];
        act(() => {
          result.current[1](newValue);
        });

        expect(result.current[0]).toEqual(newValue);
        expect(window.localStorage.getItem("array-key")).toBe(
          JSON.stringify(newValue),
        );
      });

      it("should serialize nested objects and arrays", () => {
        const defaultValue = {
          id: 1,
          tags: ["alpha", "beta"],
          meta: { flags: { active: true }, counts: [1, 2, [3]] },
        };
        const { result } = renderHook(() =>
          useStoragePersistedState("obj-nested-key", defaultValue),
        );

        const newValue = {
          id: 2,
          tags: ["gamma", "delta", "epsilon"],
          meta: { flags: { active: false }, counts: [3, 2, [1]] },
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
        const defaultValue = { a: 1 };
        const { result } = renderHook(() =>
          useStoragePersistedState<object | null>(
            "null-key-default",
            defaultValue,
          ),
        );

        act(() => {
          result.current[1](null);
        });

        // Setting null should remove the key from storage -> default on next read
        expect(result.current[0]).toEqual(defaultValue);
        expect(window.localStorage.getItem("null-key-default")).toBeNull();
      });

      it("should handle undefined with JSON codec", () => {
        const defaultValue = { a: 1 };
        const { result } = renderHook(() =>
          useStoragePersistedState<object | undefined>(
            "undefined-key-default",
            defaultValue,
          ),
        );

        act(() => {
          result.current[1](undefined);
        });

        // Setting undefined should remove the key from storage -> default on next read
        expect(result.current[0]).toEqual(defaultValue);
        expect(window.localStorage.getItem("undefined-key-default")).toBeNull();
      });
    });
  });
});
