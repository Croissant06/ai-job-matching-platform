"use client";

import { useEffect, useState } from "react";
import { api, Explanation, JobMatch } from "@/lib/api";
import type { Locale, T } from "@/i18n";
import { formatSalary, scoreColor } from "./JobCard";

export default function JobDrawer({
  t,
  locale,
  job,
  onClose,
  onHide,
}: {
  t: T;
  locale: Locale;
  job: JobMatch;
  onClose: () => void;
  onHide: () => void;
}) {
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setExplanation(null);
    setExplainError(null);
    setSaved(false);
    api
      .explain(job.id, locale)
      .then(setExplanation)
      .catch((err) => setExplainError(err instanceof Error ? err.message : t("errors.generic")));
  }, [job.id, locale, t]);

  const salary = formatSalary(job);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{job.title}</h2>
            <p className="text-slate-500">
              {job.company}
              {job.city && ` · ${job.city}`} · {t(`workplace.${job.workplace}`)} ·{" "}
              {t(`employment.${job.employment_type}`)}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-lg font-bold ${scoreColor(job.score)}`}>
            {job.score}%
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-400">
          {t("results.breakdown", job.score_breakdown)}
        </p>

        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <h3 className="text-sm font-semibold text-indigo-900">{t("job.explain")}</h3>
          {!explanation && !explainError && (
            <p className="mt-1 animate-pulse text-sm text-indigo-700">{t("job.explaining")}</p>
          )}
          {explainError && <p className="mt-1 text-sm text-red-600">{explainError}</p>}
          {explanation && (
            <>
              <p className="mt-1 text-sm text-indigo-900">{explanation.explanation}</p>
              <h4 className="mt-3 text-sm font-semibold text-indigo-900">
                {t("job.missingSkills")}
              </h4>
              {explanation.missing_skills.length === 0 ? (
                <p className="mt-1 text-sm text-indigo-700">{t("job.noGaps")}</p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-1">
                  {explanation.missing_skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          {salary && (
            <p>
              <span className="font-medium">{t("job.salary")}:</span> {salary}
            </p>
          )}
          <p>
            <span className="font-medium">{t("job.posted")}:</span>{" "}
            {new Date(job.posted_at).toLocaleDateString(locale)}
          </p>
          <p className="whitespace-pre-line">{job.description}</p>
          <div className="flex flex-wrap gap-1 pt-1">
            {job.skills.map((s) => (
              <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4">
          {job.external_url && (
            <a
              href={job.external_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => api.logFeedback(job.id, "apply")}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
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
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {saved ? t("job.saved") : t("job.save")}
          </button>
          <button
            onClick={onHide}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {t("job.hide")}
          </button>
          <button onClick={onClose} className="ml-auto text-sm text-slate-500 hover:underline">
            {t("job.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
