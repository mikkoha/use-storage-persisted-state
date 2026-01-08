/**
 * Defines how to serialize/deserialize a value from localStorage.
 * null means the key doesn't exist.
 */
export interface Codec<T> {
  encode: (value: T) => string | null;
  decode: (value: string | null) => T;
}

/**
 * A robust JSON codec that handles parsing errors gracefully.
 * Works with objects, arrays, and other JSON-serializable values.
 *
 * @example
 * ```ts
 * const [user, setUser] = useStoragePersistedState<User | null>(
 *   "user",
 *   null,
 *   { codec: JsonCodec }
 * );
 * ```
 * any type is needed to allow objects and arrays of any shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const JsonCodec: Codec<any> = {
  encode: (value) => {
    if (value === null) return null;
    return JSON.stringify(value);
  },
  decode: (value) => {
    if (value === null) return null;
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn(`LocalStorage parse error for value "${value}".`, e);
      throw e;
    }
  },
};

/**
 * Codec for string values. Stores strings as-is without any transformation.
 *
 * @example
 * ```ts
 * const [name, setName] = useStoragePersistedState("name", "Guest");
 * // Automatically uses StringCodec because defaultValue is a string
 * ```
 *
 * any type is needed to allow string enums.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StringCodec: Codec<any> = {
  encode: (value) => {
    if (value == null) return null;
    if (typeof value === "string") return value;
    console.error(
      `StringCodec encode expected a string but got ${typeof value}.`,
    );
    return String(value);
  },
  decode: (value) => {
    if (value == null) return null;
    if (typeof value === "string") return value;
    console.error(
      `StringCodec decode expected a string but got ${typeof value}.`,
    );
    return String(value);
  },
};

/**
 * Codec for boolean values. Stores as "true" or "false" strings.
 *
 * @example
 * ```ts
 * const [isDark, setIsDark] = useStoragePersistedState("darkMode", false);
 * // Automatically uses BooleanCodec because defaultValue is a boolean
 * ```
 */
export const BooleanCodec: Codec<boolean> = {
  encode: (value) => (value ? "true" : "false"),
  decode: (value) => value === "true",
};

/**
 * Codec for number values. Handles NaN, Infinity, and -Infinity correctly.
 * Returns null for unparseable values (e.g., empty string, invalid number string).
 *
 * @example
 * ```ts
 * const [count, setCount] = useStoragePersistedState("count", 0);
 * // Automatically uses NumberCodec because defaultValue is a number
 * ```
 *
 * any type is needed to allow number enums.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NumberCodec: Codec<any> = {
  encode: (value) => {
    if (value === null) return null;
    if (typeof value !== "number") {
      console.error(
        `NumberCodec encode expected a number but got ${typeof value}.`,
      );
    }
    return String(value);
  },
  decode: (value) => {
    if (value === null) return null;
    // Handle special numeric values
    if (value === "NaN") return NaN;
    if (value === "Infinity") return Infinity;
    if (value === "-Infinity") return -Infinity;
    if (value === "") {
      console.warn("NumberCodec decode received an empty string.");
      return null;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      console.warn(
        `NumberCodec decode received an invalid number string "${value}".`,
      );
      return null;
    }
    return parsed;
  },
};

/**
 * Infers the appropriate codec based on the default value's type.
 * Used internally when the user doesn't provide an explicit codec.
 *
 * - `boolean` → BooleanCodec
 * - `number` → NumberCodec
 * - `string` → StringCodec
 * - `object`, `array`, `undefined`, `null` → JsonCodec
 *
 * @param defaultValue - The default value to infer the codec from
 * @returns The inferred codec for the given value type
 */
export function inferCodec<T>(defaultValue: T): Codec<T> {
  const type = typeof defaultValue;

  // Type assertions through unknown are needed because we're doing runtime type inference
  // The actual codec returned will match the runtime type of defaultValue
  if (type === "boolean") return BooleanCodec as unknown as Codec<T>;
  if (type === "number") return NumberCodec as unknown as Codec<T>;
  if (type === "string") return StringCodec as unknown as Codec<T>;

  // Default to JSON for objects, arrays, or undefined
  return JsonCodec as unknown as Codec<T>;
}
