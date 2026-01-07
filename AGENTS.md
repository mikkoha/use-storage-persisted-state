React hook `useStoragePersistedState` for persisted state in `localStorage`/`sessionStorage`/`in memory`. State is synched between hooks; optional cross-tab sync with events + sync with polling. The project is published as an NPM-package.

## Structure:

### Main layers:

1. Hook API layer: `useStoragePersistedState` hook (`src/useStoragePersistedState.ts`)
2. Storage sync layer: `StorageSyncManager` singleton (`src/storage.ts`)
3. Codec layer: codecs for serializing/deserializing values (built-ins for JSON, boolean, number, string; user-defined codecs supported) (`src/codecs.ts`)

### Other notable files:

- `src/index.ts` package entry (tsup builds `dist` from here; currently empty).

## Build/test tooling:

Agents should not build or publish the project, unless explicitly assigned.

- Build: `tsup` -> `dist` (`npm run build`/`npm run dev`).
- Tests: `vitest` (`npm run test`, `npm run test:watch`).
- Lint/typecheck: `eslint`, `tsc`.

## After making changes, run:

1. Run Checks (Typecheck & Lint):
   ```bash
   npm run check
   ```
2. Run Tests:
   ```bash
   npm run test
   ```
3. Format Code:
   ```bash
   npm run format
   ```
   Ensure all commands pass before considering the task complete.
