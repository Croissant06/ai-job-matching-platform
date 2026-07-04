"use client";

import { JobMatch } from "@/lib/api";
import type { T } from "@/i18n";

export function scoreColor(score: number) {
  if (score >= 70) return "bg-emerald-100 text-emerald-800";
  if (score >= 45) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export function formatSalary(job: JobMatch) {
  if (!job.salary_min && !job.salary_max) return null;
  const range = [job.salary_min, job.salary_max].filter(Boolean).join("–");
  return `${range} ${job.salary_currency ?? ""}`.trim();
}

export default function JobCard({ t, job, onOpen }: { t: T; job: JobMatch; onOpen: () => void }) {
  const salary = formatSalary(job);
  return (
    <button
      onClick={onOpen}
      className="block w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{job.title}</h3>
          <p className="text-sm text-slate-500">
            {job.company}
            {job.city && ` · ${job.city}`} · {t(`workplace.${job.workplace}`)}
            {job.seniority && ` · ${t(`seniority.${job.seniority}`)}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-bold ${scoreColor(job.score)}`}
          title={t("results.breakdown", job.score_breakdown)}
        >
          {job.score}%
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{job.description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {job.skills.slice(0, 6).map((s) => (
          <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {s}
          </span>
        ))}
        {salary && (
          <span className="ml-auto text-xs font-medium text-emerald-700">{salary}</span>
        )}
      </div>
    </button>
  );
}
