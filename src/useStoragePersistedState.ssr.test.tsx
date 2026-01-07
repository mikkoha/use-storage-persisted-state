import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Store original window reference
const originalWindow = globalThis.window;

describe("useStoragePersistedState", () => {
  describe("SSR compatibility", () => {
    beforeEach(() => {
      // Reset module cache before each test to ensure fresh imports
      vi.resetModules();
    });

    afterEach(() => {
      // Restore window after each test
      globalThis.window = originalWindow;
      vi.resetModules();
    });

    it("should not throw when storage.ts is imported without window", async () => {
      // Remove window to simulate SSR
      // @ts-expect-error - Intentionally removing window for SSR simulation
      delete globalThis.window;

      // This should not throw
      await expect(import("./storage")).resolves.not.toThrow();
    });

    it("should export localStorageSync without crashing in SSR", async () => {
      // @ts-expect-error - Intentionally removing window for SSR simulation
      delete globalThis.window;

      const storage = await import("./storage");

      // Should be able to access exports
      expect(storage.localStorageSync).toBeDefined();
      expect(storage.sessionStorageSync).toBeDefined();
      expect(storage.memoryStorageSync).toBeDefined();
    });

    it("should fall back to memory storage when window is undefined", async () => {
      // @ts-expect-error - Intentionally removing window for SSR simulation
      delete globalThis.window;

      const storage = await import("./storage");

      // Storage adapter should still be accessible and functional
      const adapter = storage.localStorageSync.storage;
      expect(adapter).toBeDefined();

      // Should be able to use memory fallback
      adapter.setItem("ssr-test", "value");
      expect(adapter.getItem("ssr-test")).toBe("value");
    });

    it("should not throw when useStoragePersistedState module is imported without window", async () => {
      // @ts-expect-error - Intentionally removing window for SSR simulation
      delete globalThis.window;

      await expect(import("./useStoragePersistedState")).resolves.not.toThrow();
    });

    it("should not throw when index.ts is imported without window", async () => {
      // @ts-expect-error - Intentionally removing window for SSR simulation
      delete globalThis.window;

      await expect(import("./index")).resolves.not.toThrow();
    });

    it("should export all expected items from index.ts", async () => {
      // @ts-expect-error - Intentionally removing window for SSR simulation
      delete globalThis.window;

      const exports = await import("./index");

      expect(exports.useStoragePersistedState).toBeDefined();
      expect(exports.JsonCodec).toBeDefined();
      expect(exports.StringCodec).toBeDefined();
      expect(exports.BooleanCodec).toBeDefined();
      expect(exports.NumberCodec).toBeDefined();
      expect(exports.inferCodec).toBeDefined();
    });
  });
});
