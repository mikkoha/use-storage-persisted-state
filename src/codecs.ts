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
export const JsonCodec: Codec<any> = {
  encode: (value) => JSON.stringify(value),
  decode: (value) => {
    if (value === null) return null;
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn(
        `LocalStorage parse error for value "${value}". Falling back to null.`,
        e
      );
      return null;
    }
  },
};

export const StringCodec: Codec<string | null> = {
  encode: (value) => value ?? "",
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

  if (type === "boolean") return BooleanCodec as any;
  if (type === "number") return NumberCodec as any;
  if (type === "string") return StringCodec as any;

  // Default to JSON for objects, arrays, or undefined
  return JsonCodec;
}
