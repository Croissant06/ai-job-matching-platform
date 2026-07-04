"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError, API_URL, FilterOptions, JobMatch, Profile, SearchParams } from "@/lib/api";
import { Locale, LOCALES, makeT } from "@/i18n";
import UploadCard from "./UploadCard";
import ProfilePanel from "./ProfilePanel";
import Filters from "./Filters";
import JobCard from "./JobCard";
import JobDrawer from "./JobDrawer";

export default function App({ locale }: { locale: Locale }) {
  const t = useMemo(() => makeT(locale), [locale]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<SearchParams>({});
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<JobMatch | null>(null);

  useEffect(() => {
    api
      .getProfile()
      .then(setProfile)
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 404)) {
          setBackendError(t("errors.noBackend", { url: API_URL }));
        }
      })
      .finally(() => setProfileLoaded(true));
    api.getFilterOptions().then(setOptions).catch(() => null);
  }, [t]);

  const search = useCallback(
    (params: SearchParams) => {
      setSearching(true);
      api
        .searchJobs(params)
        .then((res) => setJobs(res.jobs))
        .catch(() => setJobs([]))
        .finally(() => setSearching(false));
    },
    [],
  );

  useEffect(() => {
    if (profile) search(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.version]);

  const openJob = (job: JobMatch) => {
    setSelected(job);
    api.logFeedback(job.id, "click");
  };

  const hideJob = (job: JobMatch) => {
    api.logFeedback(job.id, "hide");
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    setSelected((cur) => (cur?.id === job.id ? null : cur));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-indigo-700">{t("appName")}</h1>
          <p className="text-sm text-slate-500">{t("tagline")}</p>
        </div>
        <nav className="flex gap-1 rounded-lg bg-white p-1 shadow-sm">
          {LOCALES.map((loc) => (
            <Link
              key={loc}
              href={`/${loc}`}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                loc === locale ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {loc.toUpperCase()}
            </Link>
          ))}
        </nav>
      </header>

      {backendError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {backendError}
        </div>
      )}

      {profileLoaded && !profile && !backendError && (
        <UploadCard t={t} onProfile={setProfile} />
      )}

      {profile && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-6">
            <ProfilePanel t={t} profile={profile} onProfile={setProfile} />
          </aside>

          <main>
            <Filters
              t={t}
              options={options}
              filters={filters}
              onChange={setFilters}
              onSearch={() => search(filters)}
            />

            <div className="mt-4 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{t("results.title")}</h2>
              <span className="text-sm text-slate-500">
                {searching ? t("results.loading") : t("results.count", { n: jobs.length })}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {!searching && jobs.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  {t("results.empty")}
                </p>
              )}
              {jobs.map((job) => (
                <JobCard key={job.id} t={t} job={job} onOpen={() => openJob(job)} />
              ))}
            </div>
          </main>
        </div>
      )}

      {selected && (
        <JobDrawer
          t={t}
          locale={locale}
          job={selected}
          onClose={() => setSelected(null)}
          onHide={() => hideJob(selected)}
        />
      )}
    </div>
  );
}
