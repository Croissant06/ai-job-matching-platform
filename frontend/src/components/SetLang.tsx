"use client";

import { useEffect } from "react";

/** Keeps <html lang> in sync with the active locale — the root layout sits
 * above the [locale] segment and can't know it, but screen readers need the
 * correct language to pronounce Bulgarian pages properly. */
export default function SetLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
