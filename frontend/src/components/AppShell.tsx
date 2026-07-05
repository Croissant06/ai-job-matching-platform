"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Locale, LOCALES, makeT, T } from "@/i18n";
import { api, ApiError, API_URL, Profile } from "@/lib/api";
import { NAV_ICONS, Spinner } from "./ui";

interface AppContextValue {
  t: T;
  locale: Locale;
  profile: Profile;
  setProfile: (p: Profile) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppShell");
  return ctx;
}

const NAV_ITEMS = [
  { key: "dashboard", path: "" },
  { key: "matches", path: "/matches" },
  { key: "searches", path: "/searches" },
  { key: "profile", path: "/profile" },
] as const;

const MOBILE_LABELS: Record<string, string> = {
  dashboard: "nav.home",
  matches: "nav.matches",
  searches: "nav.saved",
  profile: "nav.profile",
};

export default function AppShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = useMemo(() => makeT(locale), [locale]);
  const router = useRouter();
  const pathname = usePathname();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProfile()
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          router.replace(`/${locale}/onboarding`);
        } else {
          setError(t("errors.noBackend", { url: API_URL }));
        }
      });
  }, [locale, router, t]);

  const base = `/${locale}/app`;
  const isActive = (path: string) =>
    path === "" ? pathname === base : pathname.startsWith(base + path);

  const switchLocalePath = (target: string) => pathname.replace(`/${locale}`, `/${target}`);

  if (error) {
    return (
      <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!profile) {
    return <Spinner label={t("results.loading")} />;
  }

  return (
    <AppContext.Provider value={{ t, locale, profile, setProfile }}>
      <div className="min-h-screen lg:pl-60">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
          <Link href={`/${locale}`} className="px-6 py-5 text-xl font-bold tracking-tight">
            <span className="brand-gradient-text">JobMatch AI</span>
          </Link>
          <nav className="flex-1 space-y-1 px-3">
            {NAV_ITEMS.map(({ key, path }) => (
              <Link
                key={key}
                href={base + path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive(path)
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {NAV_ICONS[key]}
                {t(`nav.${key}`)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <span className="truncate text-xs text-slate-500">{profile.full_name}</span>
            <div className="flex gap-1">
              {LOCALES.map((loc) => (
                <Link
                  key={loc}
                  href={switchLocalePath(loc)}
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                    loc === locale ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {loc.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="glass sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 px-4 py-3 lg:hidden">
          <Link href={`/${locale}`} className="text-lg font-bold brand-gradient-text">
            JobMatch AI
          </Link>
          <div className="flex gap-1">
            {LOCALES.map((loc) => (
              <Link
                key={loc}
                href={switchLocalePath(loc)}
                className={`rounded-md px-3 py-2 text-xs font-semibold ${
                  loc === locale ? "bg-indigo-600 text-white" : "text-slate-500"
                }`}
              >
                {loc.toUpperCase()}
              </Link>
            ))}
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:px-8 lg:pb-10">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="glass fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 lg:hidden">
          {NAV_ITEMS.map(({ key, path }) => (
            <Link
              key={key}
              href={base + path}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive(path) ? "text-indigo-600" : "text-slate-500"
              }`}
            >
              {NAV_ICONS[key]}
              {t(MOBILE_LABELS[key])}
            </Link>
          ))}
        </nav>
      </div>
    </AppContext.Provider>
  );
}
