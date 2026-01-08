import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  readStoragePersistedState,
  setStoragePersistedState,
} from "./storagePersistedState";
import { useStoragePersistedState } from "./useStoragePersistedState";
import { NumberCodec } from "./codecs";

describe("storagePersistedState", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("should return default value when storage is empty", () => {
    const value = readStoragePersistedState("missing-key", "default");
    expect(value).toBe("default");
  });

  it("should return default object value when storage is empty", () => {
    const value = readStoragePersistedState("missing-object-key", {
      name: "Default",
    });
    expect(value).toEqual({ name: "Default" });
  });

  it("should decode values with inferred codec", () => {
    window.localStorage.setItem("json-key", JSON.stringify({ name: "Ada" }));

    const value = readStoragePersistedState("json-key", { name: "Unknown" });
    expect(value).toEqual({ name: "Ada" });
  });

  it("should notify hooks when set outside the hook", () => {
    const { result } = renderHook(() =>
      useStoragePersistedState("external-key", "initial", {
        pollingIntervalMs: null,
      }),
    );

    act(() => {
      setStoragePersistedState("external-key", "updated");
    });

    expect(result.current[0]).toBe("updated");
    expect(window.localStorage.getItem("external-key")).toBe("updated");
  });

  it("should support functional updates", () => {
    setStoragePersistedState<number>("counter-key", (prev) => (prev ?? 0) + 1, {
      codec: NumberCodec,
    });
    const value = readStoragePersistedState("counter-key", 0);
    expect(value).toBe(1);
    setStoragePersistedState<number>("counter-key", (prev) => (prev ?? 0) + 1, {
      codec: NumberCodec,
    });
    const value2 = readStoragePersistedState("counter-key", 0);
    expect(value2).toBe(2);
  });
});
