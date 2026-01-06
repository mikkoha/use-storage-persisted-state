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
    if (value === null) return undefined;
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn(
        `LocalStorage parse error for value "${value}". Falling back to undefined.`
      );
      return undefined;
    }
  },
};

export const StringCodec: Codec<string | undefined> = {
  encode: (value) => value ?? "",
  decode: (value) => value ?? undefined, // 'null' means key didn't exist
};

export const BooleanCodec: Codec<boolean> = {
  encode: (value) => (value ? "true" : "false"),
  decode: (value) => value === "true",
};

export const NumberCodec: Codec<number | undefined> = {
  encode: (value) => String(value),
  decode: (value) => {
    if (value === null || value === "") return undefined;
    const parsed = Number(value);
    return isNaN(parsed) ? undefined : parsed;
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
