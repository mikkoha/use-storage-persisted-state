import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getStoragePersistedState,
  setStoragePersistedState,
  removeStoragePersistedState,
} from "./storagePersistedState";
import { useStoragePersistedState } from "./useStoragePersistedState";
import { NumberCodec, StringCodec } from "./codecs";

describe("storagePersistedState", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("should return default value when storage is empty", () => {
    const value = getStoragePersistedState("missing-key", "default");
    expect(value).toBe("default");
  });

  it("should return default object value when storage is empty", () => {
    const value = getStoragePersistedState("missing-object-key", {
      name: "Default",
    });
    expect(value).toEqual({ name: "Default" });
  });

  it("should decode values with inferred codec", () => {
    window.localStorage.setItem("json-key", JSON.stringify({ name: "Ada" }));

    const value = getStoragePersistedState("json-key", { name: "Unknown" });
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
    const value = getStoragePersistedState("counter-key", 0);
    expect(value).toBe(1);
    setStoragePersistedState<number>("counter-key", (prev) => (prev ?? 0) + 1, {
      codec: NumberCodec,
    });
    const value2 = getStoragePersistedState("counter-key", 0);
    expect(value2).toBe(2);
  });

  it("should remove item when set to null", () => {
    window.localStorage.setItem("to-be-removed-key", "value");
    setStoragePersistedState("to-be-removed-key", null, {
      codec: StringCodec,
    });
    expect(window.localStorage.getItem("to-be-removed-key")).toBeNull();
  });

  it("should remove item when set to undefined", () => {
    window.localStorage.setItem("to-be-removed-key", "value");
    setStoragePersistedState("to-be-removed-key", undefined, {
      codec: StringCodec,
    });
    expect(window.localStorage.getItem("to-be-removed-key")).toBeNull();
  });

  it("should remove a persisted value from localStorage", () => {
    window.localStorage.setItem("remove-key", "value");
    removeStoragePersistedState("remove-key");
    expect(window.localStorage.getItem("remove-key")).toBeNull();
  });

  it("should not throw when removing a non-existing key", () => {
    expect(() =>
      removeStoragePersistedState("missing-remove-key"),
    ).not.toThrow();
    expect(window.localStorage.getItem("missing-remove-key")).toBeNull();
  });

  it("should remove from the specified storage only", () => {
    window.localStorage.setItem("shared-key", "local");
    window.sessionStorage.setItem("shared-key", "session");

    removeStoragePersistedState("shared-key", "sessionStorage");

    expect(window.sessionStorage.getItem("shared-key")).toBeNull();
    expect(window.localStorage.getItem("shared-key")).toBe("local");
  });

  it("should notify hooks when removed outside the hook", () => {
    window.localStorage.setItem("notify-remove-key", "stored");
    const { result } = renderHook(() =>
      useStoragePersistedState("notify-remove-key", "default", {
        pollingIntervalMs: null,
      }),
    );

    expect(result.current[0]).toBe("stored");

    act(() => {
      removeStoragePersistedState("notify-remove-key");
    });

    expect(result.current[0]).toBe("default");
    expect(window.localStorage.getItem("notify-remove-key")).toBeNull();
  });
});
