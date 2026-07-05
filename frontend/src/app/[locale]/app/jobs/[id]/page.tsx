"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppShell";
import {
  Card,
  FactorBars,
  MatchBadge,
  SkillChips,
  Spinner,
  formatSalary,
  jobMeta,
} from "@/components/ui";
import { api, Explanation, JobMatch, SimilarJob } from "@/lib/api";

export default function JobDetailPage() {
  const { t, locale } = useApp();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<JobMatch | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [similar, setSimilar] = useState<SimilarJob[]>([]);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setJob(null);
    setExplanation(null);
    setExplainError(null);
    setSaved(false);
    api
      .getJob(id)
      .then(setJob)
      .catch(() => setNotFound(true));
    api.getSimilar(id).then(setSimilar).catch(() => null);
    api
      .explain(id, locale)
      .then(setExplanation)
      .catch((err) => setExplainError(err instanceof Error ? err.message : t("errors.generic")));
  }, [id, locale, t]);

  if (notFound) {
    return (
      <Card className="p-10 text-center text-slate-500">
        {t("errors.notFound")} —{" "}
        <Link href={`/${locale}/app/matches`} className="text-indigo-600 hover:underline">
          {t("job.backToMatches")}
        </Link>
      </Card>
    );
  }

  if (!job) return <Spinner label={t("results.loading")} />;

  const salary = formatSalary(job);

  const hide = () => {
    api.logFeedback(job.id, "hide");
    router.push(`/${locale}/app/matches`);
  };

  return (
    <div>
      <Link
        href={`/${locale}/app/matches`}
        className="text-sm font-medium text-slate-500 hover:text-indigo-600"
      >
        ← {t("job.backToMatches")}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main content */}
        <div className="space-y-5">
          <Card className="p-6">
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <p className="mt-1 text-slate-500">
              {job.company} · {jobMeta(t, job)} · {t(`employment.${job.employment_type}`)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {salary && (
                <span className="font-semibold text-emerald-700">
                  {t("job.salary")}: {salary}
                </span>
              )}
              <span className="text-slate-400">
                {t("job.posted")}: {new Date(job.posted_at).toLocaleDateString(locale)}
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                {t("results.source")}: {job.source}
              </span>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              {t("job.description")}
            </h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700">
              {job.description}
            </p>
            {job.skills.length > 0 && (
              <>
                <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  {t("job.requiredSkills")}
                </h2>
                <div className="mt-2">
                  <SkillChips skills={job.skills} tone="brand" />
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Sticky AI panel */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
          <Card className="overflow-hidden">
            <div className="glass border-b border-indigo-100 bg-indigo-50/60 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-indigo-900">{t("job.overallMatch")}</p>
                <MatchBadge t={t} score={job.score} size="lg" />
              </div>
            </div>
            <div className="space-y-5 p-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{t("job.explain")}</h3>
                {!explanation && !explainError && (
                  <p className="mt-1 animate-pulse text-sm text-indigo-700">{t("job.explaining")}</p>
                )}
                {explainError && <p className="mt-1 text-sm text-red-600">{explainError}</p>}
                {explanation && (
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {explanation.explanation}
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800">{t("job.missingSkills")}</h3>
                {explanation ? (
                  explanation.missing_skills.length > 0 ? (
                    <>
                      <div className="mt-1.5">
                        <SkillChips skills={explanation.missing_skills} tone="gap" />
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{t("job.gapPositive")}</p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">{t("job.noGaps")}</p>
                  )
                ) : (
                  <p className="mt-1 text-sm text-slate-400">…</p>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">{t("factors.title")}</h3>
                <FactorBars t={t} breakdown={job.score_breakdown} />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {job.external_url && (
                  <a
                    href={job.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => api.logFeedback(job.id, "apply")}
                    className="brand-gradient rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    {t("job.original")}
                  </a>
                )}
                <button
                  onClick={() => {
                    api.logFeedback(job.id, "save");
                    setSaved(true);
                  }}
                  disabled={saved}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  {saved ? t("job.saved") : t("job.save")}
                </button>
                <button
                  onClick={hide}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  {t("job.hide")}
                </button>
              </div>
            </div>
          </Card>

          {similar.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                {t("job.similar")}
              </h3>
              <div className="mt-2 divide-y divide-slate-100">
                {similar.map((s) => (
                  <Link
                    key={s.id}
                    href={`/${locale}/app/jobs/${s.id}`}
                    className="block py-2.5 hover:text-indigo-700"
                  >
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-slate-500">
                      {s.company}
                      {s.city && ` · ${s.city}`} · {t(`workplace.${s.workplace}`)}
                      {formatSalary(s) && (
                        <span className="text-emerald-700"> · {formatSalary(s)}</span>
                      )}
                    </p>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
