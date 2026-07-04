import en from "./messages/en.json";
import bg from "./messages/bg.json";

export const LOCALES = ["en", "bg"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const MESSAGES: Record<Locale, Record<string, unknown>> = { en, bg };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Translate a dot-path key with {placeholder} interpolation. Falls back to EN, then to the key. */
export function makeT(locale: Locale) {
  return (key: string, vars?: Record<string, string | number>): string => {
    const lookup = (messages: Record<string, unknown>): string | undefined => {
      let node: unknown = messages;
      for (const part of key.split(".")) {
        if (typeof node !== "object" || node === null) return undefined;
        node = (node as Record<string, unknown>)[part];
      }
      return typeof node === "string" ? node : undefined;
    };
    let text = lookup(MESSAGES[locale]) ?? lookup(MESSAGES.en) ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
}

export type T = ReturnType<typeof makeT>;
