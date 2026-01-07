# use-storage-persisted-state

A robust, type-safe React hook for persisting state backed by `localStorage`, `sessionStorage`, or memory.

`useStoragePersistedState` works like `useState`, but it automatically persists your state to the browser and keeps it synchronized across all components, tabs, and even direct localStorage changes, or manual changes in DevTools.

## Features (Why another storage hook?)

- **Type safety**: Full TypeScript type inference and safety.
- **Sync between components**: Keeps state synchronized across all components using the same key.
- **Cross-tab sync**: Automatically synchronizes state across tabs (using native `StorageEvent`).
- **External change detection**: Detects changes made directly to storage (e.g., via DevTools or `window.localStorage.setItem`) using (optional) polling.
- **SSR ready**: Safe for Server-Side Rendering (e.g., Next.js) using proper hydration techniques (React `useSyncExternalStore` with a shim for React 16.8+ support).
- **Custom serialization**: Supports custom serializer implementation for advanced use cases like data schema migration.
- **Graceful error handling**: Automatically falls back to in-memory storage if `QuotaExceededError` occurs or storage is unavailable.

## Installation

```bash
npm install use-storage-persisted-state
```

## Usage

### 1. Basic usage

```tsx
import { useStoragePersistedState } from "use-storage-persisted-state";

function Counter() {
  const [count, setCount] = useStoragePersistedState("count", 0);

  return (
    <button onClick={() => setCount((prev) => prev + 1)}>Count: {count}</button>
  );
}
```

### 2. Basic sync example

Any component using the same key will stay in sync, even across different tabs. The state survives page reloads, because it is stored in `localStorage` (default).

```tsx
import { useStoragePersistedState } from "use-storage-persisted-state";

function ComponentA() {
  const [username, setUsername] = useStoragePersistedState(
    "user_name",
    "Guest",
  );
  return (
    <input value={username} onChange={(e) => setUsername(e.target.value)} />
  );
}

function ComponentB() {
  const [username] = useStoragePersistedState("user_name", "Guest");
  return <p>Hello, {username}!</p>;
}
```

### 3. Explicit codec (undefined default value)

If your default value is `undefined` or `null`, you must provide an explicit codec so the hook knows how to serialize/deserialize the data.

```tsx
import {
  useStoragePersistedState,
  StringCodec,
} from "use-storage-persisted-state";

function FavoriteColor() {
  // We use StringCodec explicitly since defaultValue is undefined and Codec cannot be inferred.
  const [color, setColor] = useStoragePersistedState<string | undefined>(
    "favorite_color",
    undefined,
    { codec: StringCodec },
  );

  return (
    <input
      value={color ?? ""}
      onChange={(e) => setColor(e.target.value || undefined)}
      placeholder="Enter your favorite color"
    />
  );
}
```

```tsx
import {
  useStoragePersistedState,
  JsonCodec,
} from "use-storage-persisted-state";

function UserProfile() {
  // We use JsonCodec explicitly since Codec inference from 'null' is ambiguous (could be string | null, number | null, etc.)
  const [user, setUser] = useStoragePersistedState<{ name: string } | null>(
    "user_profile",
    null,
    { codec: JsonCodec },
  );

  if (!user)
    return <button onClick={() => setUser({ name: "Alice" })}>Login</button>;

  return <div>Welcome, {user.name}</div>;
}
```

By default, the codec is inferred from the type of `defaultValue` if possible.

- If `defaultValue` is a primitive type (string, number, boolean), the value is stored as a simple string (with StringCodec, NumberCodec, or BooleanCodec respectively).
- If `defaultValue` is an object or array, a built-in `JsonCodec` is used by default.
- There is nothing magical about codecs; they are just objects with `encode` (e.g., `JSON.stringify`) and `decode` (e.g., `JSON.parse`) methods. You can provide your own codec for custom serialization logic.

## Advanced usage

### Data schema migration with custom codec

You can handle schema migrations (e.g., renaming fields) by creating a custom codec.

```tsx
import {
  useStoragePersistedState,
  Codec,
  JsonCodec,
} from "use-storage-persisted-state";

interface OldSettings {
  darkMode: boolean;
}

interface NewSettings {
  theme: "dark" | "light";
}

const SettingsCodec: Codec<NewSettings> = {
  encode: (value) => JSON.stringify(value),
  decode: (value) => {
    if (value === null) return { theme: "light" };

    try {
      const parsed = JSON.parse(value);

      // Migration logic: convert old boolean to new string enum
      if ("darkMode" in parsed) {
        return { theme: parsed.darkMode ? "dark" : "light" };
      }

      return parsed;
    } catch {
      return { theme: "light" };
    }
  },
};

function Settings() {
  const [settings, setSettings] = useStoragePersistedState<NewSettings>(
    "app_settings",
    { theme: "light" },
    { codec: SettingsCodec },
  );

  return <div>Current Theme: {settings.theme}</div>;
}
```

## Options

`useStoragePersistedState(key, defaultValue, options)`

- `key: string` - The storage key to be used with `localStorage`, `sessionStorage`, or `memory` storage.
- `defaultValue: T` - The default value to use if there is no value in storage. Note: this is not just the initial value; it is returned whenever the stored value is missing (e.g., after removal or a read error).
- `options?: StoragePersistedStateOptions<T>` - Optional configuration object. See table below.

| Option              | Type                                                 | Default          | Description                                                                                                              |
| ------------------- | ---------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `codec`             | `Codec<T>`                                           | Inferred         | Defines how to encode/decode values. Required if `defaultValue` is `null`/`undefined`.                                   |
| `storageType`       | `'localStorage'` \| `'sessionStorage'` \| `'memory'` | `'localStorage'` | Which storage backend to use. `memory` is a simple in-memory storage that does not persist across reloads.               |
| `crossTabSync`      | `boolean`                                            | `true`           | Enables syncing between tabs via listening to native `StorageEvent`.                                                     |
| `pollingIntervalMs` | `number` \| `null`                                   | `2000`           | Polling interval (milliseconds) to detect changes made outside this hook (e.g. devtools). Set `null` to disable polling. |

## FAQ

### How is `QuotaExceededError` handled?

If `localStorage` or `sessionStorage` is full, writing to it will typically throw a `QuotaExceededError`. This library handles this gracefully by catching the error and automatically falling back to an in-memory storage for that specific key. This means your application won't crash, and the state will persist for the session (until page reload), even if it couldn't be persisted.

### How is this different from other storage hooks?

This package shares similarities with, for example:

- `use-storage-state`
- `usehooks-ts` (`useLocalStorage`)
- `use-local-storage-state`

Key differences include:

- built-in or custom serialize/deserialize support that saves by default primitive types as simple strings, and objects and arrays as JSON
- automatic in-memory fallback (or, can be used as a memory-only synced state hook)
- robust sync behavior with optional polling for catching all external changes to underlying storage
- full TypeScript type inference and safety
- SSR ready with proper hydration using `useSyncExternalStore` (with React 16.8+ support via shim)
- handles edge-cases like `QuotaExceededError`, and other storage unavailability

### How does the hook handle null and undefined values?

When the state is set to `null` or `undefined`, the hook will remove the corresponding item from the underlying storage (`localStorage`/`sessionStorage`). This means that subsequent reads will return the `defaultValue` provided to the hook until an explicit value is set.
