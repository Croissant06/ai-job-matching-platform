"use client";

import Link from "next/link";
import { useState } from "react";
import type { T } from "@/i18n";
import { api, JobMatch } from "@/lib/api";
import { MatchBadge, SkillChips, formatSalary, gapSkills, jobMeta, overlapSkills } from "./ui";

export default function JobCard({
  t,
  locale,
  job,
  profileSkills,
  onHide,
}: {
  t: T;
  locale: string;
  job: JobMatch;
  profileSkills: string[];
  onHide: (job: JobMatch) => void;
}) {
  const [saved, setSaved] = useState(false);
  const salary = formatSalary(job);
  const why = overlapSkills(profileSkills, job.skills).slice(0, 4);
  const gaps = gapSkills(profileSkills, job.skills).slice(0, 4);
  const detailHref = `/${locale}/app/jobs/${job.id}`;

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-soft-sm transition hover:border-indigo-300 hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={detailHref} onClick={() => api.logFeedback(job.id, "click")}>
            <h3 className="font-bold text-slate-900 hover:text-indigo-700">{job.title}</h3>
          </Link>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {job.company} · {jobMeta(t, job)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {salary && <span className="font-medium text-emerald-700">{salary}</span>}
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium">
              {t("results.source")}: {job.source}
            </span>
            <span>
              {t("results.posted", { date: new Date(job.posted_at).toLocaleDateString(locale) })}
            </span>
          </div>
        </div>
        <MatchBadge t={t} score={job.score} />
      </div>

      {why.length > 0 && (
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-medium text-indigo-700">{t("results.whyPrefix")}</span>{" "}
          {why.join(", ")}.
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {gaps.length > 0 ? (
          <>
            <span className="text-xs font-medium text-amber-700">{t("results.gapsPrefix")}</span>
            <SkillChips skills={gaps} tone="gap" />
          </>
        ) : (
          <span className="text-xs text-slate-500">{t("results.noGapData")}</span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <Link
          href={detailHref}
          onClick={() => api.logFeedback(job.id, "click")}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {t("job.view")}
        </Link>
        <button
          onClick={() => {
            api.logFeedback(job.id, "save");
            setSaved(true);
          }}
          disabled={saved}
          className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          {saved ? t("job.saved") : t("job.save")}
        </button>
        <button
          onClick={() => onHide(job)}
          className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          {t("job.hide")}
        </button>
      </div>
    </div>
  );
}
