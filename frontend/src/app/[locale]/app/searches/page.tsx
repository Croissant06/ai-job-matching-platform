"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppShell";
import { Card, Spinner } from "@/components/ui";
import { api, SavedSearch, savedFiltersToParams } from "@/lib/api";
import type { T } from "@/i18n";

function filterSummary(t: T, search: SavedSearch): string {
  const f = search.filters;
  const parts: string[] = [];
  if (f.query) parts.push(`“${f.query}”`);
  if (f.cities?.length) parts.push(f.cities.join(", "));
  else if (f.countries?.length) parts.push(f.countries.join(", "));
  if (f.seniorities?.length) parts.push(f.seniorities.map((s) => t(`seniority.${s}`)).join("/"));
  if (f.workplaces?.length) parts.push(f.workplaces.map((w) => t(`workplace.${w}`)).join("/"));
  if (f.employment_types?.length)
    parts.push(f.employment_types.map((e) => t(`employment.${e}`)).join("/"));
  if (f.salary_min) parts.push(t("searches.salaryFrom", { n: f.salary_min }));
  if (f.min_score) parts.push(t("searches.scoreMin", { n: f.min_score }));
  return parts.length ? parts.join(" · ") : t("searches.anyFilters");
}

export default function SavedSearchesPage() {
  const { t, locale } = useApp();
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[] | null>(null);

  useEffect(() => {
    api.listSearches().then(setSearches).catch(() => setSearches([]));
  }, []);

  const viewMatches = async (search: SavedSearch) => {
    api.markSearchViewed(search.id).catch(() => null);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(savedFiltersToParams(search.filters))) {
      if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    }
    router.push(`/${locale}/app/matches?${params}`);
  };

  const remove = async (search: SavedSearch) => {
    await api.deleteSearch(search.id);
    setSearches((prev) => (prev ? prev.filter((s) => s.id !== search.id) : prev));
  };

  const toggleAlerts = async (search: SavedSearch) => {
    const updated = await api.updateSearch({ ...search, alerts_enabled: !search.alerts_enabled });
    setSearches((prev) => (prev ? prev.map((s) => (s.id === updated.id ? updated : s)) : prev));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">{t("searches.title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("searches.subtitle")}</p>

      <div className="mt-6 space-y-3">
        {searches === null && <Spinner />}

        {searches?.length === 0 && (
          <Card className="p-10 text-center">
            <p className="font-semibold text-slate-700">{t("searches.empty")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("searches.emptyHint")}</p>
            <Link
              href={`/${locale}/app/matches`}
              className="brand-gradient mt-5 inline-block rounded-xl px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {t("searches.goToMatches")}
            </Link>
          </Card>
        )}

        {searches?.map((search) => (
          <Card key={search.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold">{search.name}</h2>
                  {search.new_matches > 0 && (
                    <span className="brand-gradient rounded-full px-2 py-0.5 text-xs font-bold text-white">
                      {t("searches.newMatches", { n: search.new_matches })}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">{filterSummary(t, search)}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {t("searches.lastChecked")}:{" "}
                  {new Date(search.last_checked_at).toLocaleDateString(locale)}
                </p>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-slate-500">
                <span>
                  {t("searches.alerts")}{" "}
                  <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-400">
                    {t("searches.alertsSoon")}
                  </span>
                </span>
                <button
                  onClick={() => toggleAlerts(search)}
                  className={`relative h-5 w-9 rounded-full transition ${
                    search.alerts_enabled ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                      search.alerts_enabled ? "left-4.5" : "left-0.5"
                    }`}
                  />
                </button>
              </label>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => viewMatches(search)}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {t("searches.viewMatches")}
              </button>
              <button
                onClick={() => remove(search)}
                className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600"
              >
                {t("searches.delete")}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
