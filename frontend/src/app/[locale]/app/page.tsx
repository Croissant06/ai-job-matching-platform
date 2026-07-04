"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppShell";
import { Card, MatchBadge, SkillChips, Spinner, formatSalary, jobMeta } from "@/components/ui";
import { api, Dashboard } from "@/lib/api";

function daypart(t: ReturnType<typeof useApp>["t"]): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("dashboard.daypartMorning");
  if (hour < 18) return t("dashboard.daypartAfternoon");
  return t("dashboard.daypartEvening");
}

export default function DashboardPage() {
  const { t, locale, profile } = useApp();
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    api.getDashboard().then(setData).catch(() => null);
  }, [profile.version]);

  if (!data) return <Spinner label={t("results.loading")} />;

  const base = `/${locale}/app`;
  const firstName = data.full_name?.split(" ")[0];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        {firstName
          ? t("dashboard.greeting", { daypart: daypart(t), name: firstName })
          : t("dashboard.greetingAnon")}
      </h1>
      <p className="mt-1 text-slate-500">{t("dashboard.subGreeting", { n: data.new_matches })}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Best match — spans 2 columns */}
        {data.best_match && (
          <Link href={`${base}/jobs/${data.best_match.id}`} className="sm:col-span-2">
            <Card className="h-full p-5 transition hover:border-indigo-300 hover:shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {t("dashboard.bestMatch")}
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold">{data.best_match.title}</h2>
                  <p className="text-sm text-slate-500">
                    {data.best_match.company} · {jobMeta(t, data.best_match)}
                  </p>
                  {formatSalary(data.best_match) && (
                    <p className="mt-1 text-sm font-medium text-emerald-700">
                      {formatSalary(data.best_match)}
                    </p>
                  )}
                </div>
                <MatchBadge t={t} score={data.best_match.score} />
              </div>
            </Card>
          </Link>
        )}

        {/* Profile strength */}
        <Link href={`${base}/profile`}>
          <Card className="h-full p-5 transition hover:border-indigo-300 hover:shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("dashboard.profileStrength")}
            </p>
            <p className="mt-1.5 text-3xl font-bold brand-gradient-text">{data.profile_strength}%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full brand-gradient" style={{ width: `${data.profile_strength}%` }} />
            </div>
          </Card>
        </Link>

        {/* New matches */}
        <Link href={`${base}/matches`}>
          <Card className="h-full p-5 transition hover:border-indigo-300 hover:shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("dashboard.newMatches")}
            </p>
            <p className="mt-1.5 text-3xl font-bold">{data.new_matches}</p>
            <p className="text-xs text-slate-400">{t("dashboard.thisWeek")}</p>
          </Card>
        </Link>

        {/* Saved searches */}
        <Link href={`${base}/searches`}>
          <Card className="h-full p-5 transition hover:border-indigo-300 hover:shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("dashboard.savedSearches")}
            </p>
            <p className="mt-1.5 text-3xl font-bold">{data.saved_searches}</p>
          </Card>
        </Link>

        {/* Saved jobs */}
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("dashboard.savedJobs")}
          </p>
          <p className="mt-1.5 text-3xl font-bold">{data.saved_jobs}</p>
        </Card>

        {/* Missing skills — spans 2 */}
        <Card className="p-5 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("dashboard.missingSkills")}
          </p>
          {data.missing_skills.length > 0 ? (
            <>
              <div className="mt-2.5">
                <SkillChips skills={data.missing_skills} tone="gap" />
              </div>
              <p className="mt-2 text-xs text-slate-400">{t("dashboard.missingSkillsHint")}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">{t("job.noGaps")}</p>
          )}
        </Card>
      </div>

      {/* Improvement tips */}
      {data.suggestions.length > 0 && (
        <Card className="mt-4 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("dashboard.improveTips")}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
            {data.suggestions.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                {t(`suggestions.${key}`)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-6">
        <Link
          href={`${base}/matches`}
          className="brand-gradient inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {t("dashboard.viewAll")}
        </Link>
      </div>
    </div>
  );
}
