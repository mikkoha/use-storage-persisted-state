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

export const StringCodec: Codec<string | null> = {
  encode: (value) => value ?? null,
  decode: (value) => value ?? null,
};

export const BooleanCodec: Codec<boolean> = {
  encode: (value) => (value ? "true" : "false"),
  decode: (value) => value === "true",
};

export const NumberCodec: Codec<number | null> = {
  encode: (value) => String(value),
  decode: (value) => {
    if (value === null || value === "") return null;
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  },
};

/**
 * Helper to infer codec based on default value type.
 * Used when the user doesn't provide an explicit codec.
 */
export function inferCodec<T>(defaultValue: T): Codec<T> {
  const type = typeof defaultValue;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (type === "boolean") return BooleanCodec as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (type === "number") return NumberCodec as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (type === "string") return StringCodec as any;

  // Default to JSON for objects, arrays, or undefined
  return JsonCodec;
}
