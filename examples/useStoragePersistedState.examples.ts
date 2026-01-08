/**
 * These examples demonstrate type inference and usage of useStoragePersistedState.
 * Note that parts of the examples are not meant to be executed, not to make sense logically, but
 * rather to validate TypeScript types.
 */

import {
  BooleanCodec,
  Codec,
  JsonCodec,
  NumberCodec,
  StringCodec,
  useStoragePersistedState,
} from "../src";

type ThemePreference = "system" | "light" | "dark";

type UserProfile = {
  id: string;
  email: string;
  displayName: string;
};

const storageKeys = {
  themePreference: "theme_preference",
  onboardingStep: "onboarding_step",
  isBannerDismissed: "is_banner_dismissed",
  cartCount: "cart_count",
  temporaryProfile: "temporary_profile",
  lastSeenAt: "last_seen_at",
} as const;

export function useInferredNumberState() {
  const [onboardingStep, setOnboardingStep, clearOnboardingStep] =
    useStoragePersistedState(storageKeys.onboardingStep, 1);

  const a: number = onboardingStep; // Type should be correctly inferred
  console.log(a + 1); // To avoid unused variable lint error

  function advanceStep() {
    setOnboardingStep((prev) => prev + 1);
    setOnboardingStep(3);
  }
  console.log(advanceStep); // To avoid unused variable lint error

  return { onboardingStep, setOnboardingStep, clearOnboardingStep } as const;
}

export function useInferredBooleanState() {
  const [isBannerDismissed, setIsBannerDismissed] = useStoragePersistedState(
    storageKeys.isBannerDismissed,
    false,
  );

  const a: boolean = isBannerDismissed; // Type should be correctly inferred
  console.log(a ? "yes" : "no"); // To avoid unused variable lint error

  function toggleBanner() {
    setIsBannerDismissed((prev) => !prev);
    setIsBannerDismissed(true);
    setIsBannerDismissed(false);
  }
  console.log(toggleBanner); // To avoid unused variable lint error

  return { isBannerDismissed, setIsBannerDismissed } as const;
}

export function useInferredStringState() {
  const [lastSeenAt, setLastSeenAt] = useStoragePersistedState(
    storageKeys.lastSeenAt,
    "",
  );

  const a: string = lastSeenAt; // Type should be correctly inferred
  console.log(a.length); // To avoid unused variable lint error

  function updateLastSeen(time: string) {
    setLastSeenAt((prev) => {
      if (prev === time) {
        return prev;
      }
      return time;
    });
    setLastSeenAt(time);
  }
  console.log(updateLastSeen); // To avoid unused variable lint error

  return { lastSeenAt, setLastSeenAt } as const;
}

export function useInferredJsonState() {
  const [profile, setProfile] = useStoragePersistedState<UserProfile>(
    storageKeys.temporaryProfile,
    { id: "", email: "", displayName: "" },
  );

  const a: UserProfile = profile; // Type should be correctly inferred
  console.log(a.id, a.email, a.displayName);

  function updateEmail(newEmail: string) {
    setProfile((prev) => {
      if (prev.displayName === "a") {
        return prev;
      }
      return { ...prev, email: newEmail };
    });
    setProfile({ id: "1", email: "user@example.com", displayName: "User" });
  }
  console.log(updateEmail); // To avoid unused variable lint error

  return { profile, setProfile } as const;
}

export function useInferredJsonState2() {
  const [profile, setProfile] = useStoragePersistedState(
    storageKeys.temporaryProfile,
    { id: "", email: "", displayName: "" },
  );

  const a: UserProfile = profile; // Type should be correctly inferred
  console.log(a.id, a.email, a.displayName);

  function updateEmail(newEmail: string) {
    setProfile((prev) => {
      if (prev.displayName === "a") {
        return prev;
      }
      return { ...prev, email: newEmail };
    });
    setProfile({ id: "1", email: "user@example.com", displayName: "User" });
  }
  console.log(updateEmail); // To avoid unused variable lint error

  return { profile, setProfile } as const;
}

export function useInferredJsonState3() {
  const [profile, setProfile] = useStoragePersistedState(
    storageKeys.temporaryProfile,
    { id: "", email: "", displayName: "" } as UserProfile,
  );

  const a: UserProfile = profile; // Type should be correctly inferred
  console.log(a.id, a.email, a.displayName);

  function updateEmail(newEmail: string) {
    setProfile((prev) => {
      if (prev.displayName === "a") {
        return prev;
      }
      return { ...prev, email: newEmail };
    });
    setProfile({ id: "1", email: "user@example.com", displayName: "User" });
  }
  console.log(updateEmail); // To avoid unused variable lint error

  return { profile, setProfile } as const;
}

const ThemePreferenceCodec: Codec<ThemePreference | null> = {
  encode: (value) => StringCodec.encode(value),
  decode: (value) => {
    const decoded = StringCodec.decode(value);
    if (decoded === "system" || decoded === "light" || decoded === "dark") {
      return decoded;
    }
    return null;
  },
};

export function useExplicitStringCodecState() {
  const [themePreference, setThemePreference] =
    useStoragePersistedState<ThemePreference | null>(
      storageKeys.themePreference,
      null,
      { codec: ThemePreferenceCodec },
    );

  const a: ThemePreference | null = themePreference; // Type should be correctly inferred
  console.log(a);

  function updatePreference(newPref: ThemePreference | null) {
    setThemePreference((prev) => {
      if (prev === newPref) {
        return prev;
      }
      return newPref;
    });
    setThemePreference(newPref);
    setThemePreference("light");
    setThemePreference("dark");
    setThemePreference("system");
    setThemePreference(null);
  }
  console.log(updatePreference); // To avoid unused variable lint error

  return { themePreference, setThemePreference } as const;
}

export function useExplicitStringCodecNullableState() {
  const [lastSeenAt, setLastSeenAt] = useStoragePersistedState<string | null>(
    storageKeys.lastSeenAt,
    null,
    { codec: StringCodec },
  );

  const a: string | null = lastSeenAt; // Type should be correctly inferred
  console.log(a?.length); // To avoid unused variable lint error

  function updateLastSeen(time: string | null) {
    setLastSeenAt((prev) => {
      if (prev === time) {
        return prev;
      }
      return time;
    });
    setLastSeenAt(time);
  }
  console.log(updateLastSeen); // To avoid unused variable lint error

  return { lastSeenAt, setLastSeenAt } as const;
}

type MyStringEnum = "a" | "b" | "c";

export function useImplicitStringCodecEnum() {
  const [lastSeenAt, setLastSeenAt] = useStoragePersistedState(
    storageKeys.lastSeenAt,
    "a" as MyStringEnum,
  );

  const a: MyStringEnum = lastSeenAt; // Type should be correctly inferred
  console.log(a.length); // To avoid unused variable lint error

  function updateLastSeen(time: MyStringEnum) {
    setLastSeenAt((prev) => {
      if (prev === time) {
        return prev;
      }
      return time;
    });
    setLastSeenAt(time);
  }
  console.log(updateLastSeen); // To avoid unused variable lint error

  return { lastSeenAt, setLastSeenAt } as const;
}

export function useExplicitStringCodecNullableStateEnum() {
  const [lastSeenAt, setLastSeenAt] =
    useStoragePersistedState<MyStringEnum | null>(
      storageKeys.lastSeenAt,
      null,
      { codec: StringCodec },
    );

  const a: MyStringEnum | null = lastSeenAt; // Type should be correctly inferred
  console.log(a?.length); // To avoid unused variable lint error

  function updateLastSeen(time: MyStringEnum | null) {
    setLastSeenAt((prev) => {
      if (prev === time) {
        return prev;
      }
      return time;
    });
    setLastSeenAt(time);
  }
  console.log(updateLastSeen); // To avoid unused variable lint error

  return { lastSeenAt, setLastSeenAt } as const;
}

export function useExplicitBooleanCodecState() {
  const [isBannerDismissed, setIsBannerDismissed] = useStoragePersistedState(
    storageKeys.isBannerDismissed,
    false,
    {
      codec: BooleanCodec,
      storageType: "sessionStorage",
    },
  );

  const a: boolean = isBannerDismissed; // Type should be correctly inferred
  console.log(a ? "yes" : "no"); // To avoid unused variable lint error

  function toggleBanner() {
    setIsBannerDismissed((prev) => !prev);
    setIsBannerDismissed(true);
    setIsBannerDismissed(false);
  }
  console.log(toggleBanner); // To avoid unused variable lint error

  return { isBannerDismissed, setIsBannerDismissed } as const;
}

export function useExplicitNumberCodecState() {
  const [cartCount, setCartCount] = useStoragePersistedState<number | null>(
    storageKeys.cartCount,
    null,
    { codec: NumberCodec, storageType: "memory" },
  );

  const a: number | null = cartCount; // Type should be correctly inferred
  console.log(a !== null ? a + 1 : "no count"); // To avoid unused variable lint error

  function updateCartCount(newCount: number | null) {
    setCartCount((prev) => {
      if (prev === newCount) {
        return prev;
      }
      return newCount;
    });
    setCartCount(newCount);
  }
  console.log(updateCartCount); // To avoid unused variable lint error

  return { cartCount, setCartCount } as const;
}

export function useExplicitJsonCodecState() {
  const [profile, setProfile] = useStoragePersistedState<UserProfile | null>(
    storageKeys.temporaryProfile,
    null,
    { codec: JsonCodec },
  );

  const a: UserProfile | null = profile; // Type should be correctly inferred
  console.log(a?.id, a?.email, a?.displayName);

  function updateEmail(newEmail: string) {
    setProfile((prev) => {
      if (prev === null) {
        return null;
      }
      if (prev && prev.displayName === "a") {
        return prev;
      }
      return { ...prev, email: newEmail };
    });
  }
  console.log(updateEmail); // To avoid unused variable lint error

  return { profile, setProfile } as const;
}

const DateCodec: Codec<Date> = {
  encode: (value) => value.toISOString(),
  decode: (value) => {
    if (value === null) return new Date(0);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  },
};

export function useCustomCodecState() {
  const [lastSeenAt, setLastSeenAt] = useStoragePersistedState(
    storageKeys.lastSeenAt,
    new Date(0),
    { codec: DateCodec },
  );

  const a: Date = lastSeenAt; // Type should be correctly inferred
  console.log(a.toISOString()); // To avoid unused variable lint error

  function updateLastSeen(time: Date) {
    setLastSeenAt((prev) => {
      if (prev.getTime() === time.getTime()) {
        return prev;
      }
      return time;
    });
    setLastSeenAt(time);
  }
  console.log(updateLastSeen); // To avoid unused variable lint error

  return { lastSeenAt, setLastSeenAt } as const;
}
