"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/AppShell";
import FilterPanel from "@/components/FilterPanel";
import JobCard from "@/components/JobCard";
import { Card, Spinner } from "@/components/ui";
import { api, FilterOptions, JobMatch, SearchParams, paramsToSavedFilters } from "@/lib/api";

function paramsFromUrl(sp: URLSearchParams): SearchParams {
  const num = (v: string | null) => (v ? Number(v) : undefined);
  return {
    q: sp.get("q") ?? undefined,
    country: sp.get("country") ?? undefined,
    city: sp.get("city") ?? undefined,
    seniority: sp.get("seniority") ?? undefined,
    workplace: sp.get("workplace") ?? undefined,
    employment_type: sp.get("employment_type") ?? undefined,
    language: sp.get("language") ?? undefined,
    salary_min: num(sp.get("salary_min")),
    min_score: num(sp.get("min_score")),
  };
}

function MatchesContent() {
  const { t, locale, profile } = useApp();
  const urlParams = useSearchParams();

  const [filters, setFilters] = useState<SearchParams>(() => paramsFromUrl(urlParams));
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [jobs, setJobs] = useState<JobMatch[] | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const search = useCallback((params: SearchParams) => {
    setJobs(null);
    api
      .searchJobs(params)
      .then((res) => setJobs(res.jobs))
      .catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    api.getFilterOptions().then(setOptions).catch(() => null);
  }, []);

  useEffect(() => {
    search(filters);
    // Initial + profile-change loads; manual searches go through onSearch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.version, search]);

  const hideJob = (job: JobMatch) => {
    api.logFeedback(job.id, "hide");
    setJobs((prev) => (prev ? prev.filter((j) => j.id !== job.id) : prev));
  };

  const saveSearch = async (name: string) => {
    await api.createSearch(name, paramsToSavedFilters(filters));
  };

  const panel = (
    <FilterPanel
      t={t}
      options={options}
      filters={filters}
      onChange={setFilters}
      onSearch={() => {
        search(filters);
        setMobileFiltersOpen(false);
      }}
      onSaveSearch={saveSearch}
    />
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("results.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("results.subtitle")}</p>
        </div>
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 lg:hidden"
        >
          {t("filters.title")}
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Desktop filter sidebar */}
        <Card className="hidden h-fit p-4 lg:block">{panel}</Card>

        {/* Mobile filter drawer */}
        {mobileFiltersOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/30 lg:hidden"
            onClick={() => setMobileFiltersOpen(false)}
          >
            <div
              className="max-h-[85vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
              {panel}
            </div>
          </div>
        )}

        <div>
          <p className="mb-3 text-sm text-slate-500">
            {jobs === null ? t("results.loading") : t("results.count", { n: jobs.length })}
          </p>
          <div className="space-y-3">
            {jobs === null && <Spinner />}
            {jobs?.length === 0 && (
              <Card className="p-10 text-center">
                <p className="font-semibold text-slate-700">{t("results.empty")}</p>
                <p className="mt-1 text-sm text-slate-500">{t("results.emptyHint")}</p>
              </Card>
            )}
            {jobs?.map((job) => (
              <JobCard
                key={job.id}
                t={t}
                locale={locale}
                job={job}
                profileSkills={profile.skills}
                onHide={hideJob}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense>
      <MatchesContent />
    </Suspense>
  );
}
