"use client";

import type { T } from "@/i18n";
import { JobMatch, ScoreBreakdown, SimilarJob } from "@/lib/api";

export function fitKey(score: number): "excellent" | "good" | "possible" | "weak" {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "possible";
  return "weak";
}

const FIT_STYLES: Record<string, string> = {
  excellent: "brand-gradient text-white",
  good: "bg-emerald-100 text-emerald-800",
  possible: "bg-amber-100 text-amber-800",
  weak: "bg-slate-100 text-slate-600",
};

export function MatchBadge({
  t,
  score,
  size = "md",
}: {
  t: T;
  score: number;
  size?: "md" | "lg";
}) {
  const key = fitKey(score);
  return (
    <div className="flex shrink-0 flex-col items-end gap-0.5">
      <span
        className={`rounded-full font-bold ${FIT_STYLES[key]} ${
          size === "lg" ? "px-4 py-1.5 text-2xl" : "px-3 py-1 text-sm"
        }`}
      >
        {score}% {size === "lg" ? "" : t("fit.match")}
      </span>
      <span className="text-xs font-medium text-slate-500">{t(`fit.${key}`)}</span>
    </div>
  );
}

export function SkillChips({
  skills,
  tone = "neutral",
  limit,
}: {
  skills: string[];
  tone?: "neutral" | "brand" | "gap";
  limit?: number;
}) {
  const styles = {
    neutral: "bg-slate-100 text-slate-600",
    brand: "bg-indigo-50 text-indigo-700",
    gap: "bg-amber-100 text-amber-800",
  }[tone];
  const shown = limit ? skills.slice(0, limit) : skills;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((s) => (
        <span key={s} className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
          {s}
        </span>
      ))}
      {limit && skills.length > limit && (
        <span className="px-1 text-xs text-slate-500">+{skills.length - limit}</span>
      )}
    </div>
  );
}

const FACTOR_ORDER: (keyof ScoreBreakdown)[] = [
  "skills",
  "experience",
  "location",
  "salary",
  "language",
  "semantic",
];

export function FactorBars({ t, breakdown }: { t: T; breakdown: ScoreBreakdown }) {
  return (
    <div className="space-y-2">
      {FACTOR_ORDER.map((name) => (
        <div key={name} className="flex items-center gap-2 text-xs">
          <span className="w-28 shrink-0 text-slate-500">{t(`factors.${name}`)}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full brand-gradient"
              style={{ width: `${Math.max(3, breakdown[name])}%` }}
            />
          </div>
          <span className="w-9 shrink-0 text-right font-semibold text-slate-700">
            {breakdown[name]}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function formatSalary(job: Pick<JobMatch, "salary_min" | "salary_max" | "salary_currency">) {
  if (!job.salary_min && !job.salary_max) return null;
  const range = [job.salary_min, job.salary_max].filter(Boolean).join("–");
  return `${range} ${job.salary_currency ?? ""}`.trim();
}

export function jobMeta(t: T, job: JobMatch | SimilarJob): string {
  const parts = ["city" in job && job.city, t(`workplace.${job.workplace}`)];
  if ("seniority" in job && job.seniority) parts.push(t(`seniority.${job.seniority}`));
  return parts.filter(Boolean).join(" · ");
}

/** Deterministic "why this matches" line from skill overlap — no LLM cost on list views. */
export function overlapSkills(profileSkills: string[], jobSkills: string[]): string[] {
  const mine = new Set(profileSkills.map((s) => s.trim().toLowerCase()));
  return jobSkills.filter((s) => mine.has(s.trim().toLowerCase()));
}

export function gapSkills(profileSkills: string[], jobSkills: string[]): string[] {
  const mine = new Set(profileSkills.map((s) => s.trim().toLowerCase()));
  return jobSkills.filter((s) => !mine.has(s.trim().toLowerCase()));
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[22px] border border-slate-200 bg-white shadow-soft-sm ${className}`}>
      {children}
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[22px] border border-slate-200 bg-white p-5 shadow-soft-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/5 rounded bg-slate-200" />
          <div className="h-3 w-3/5 rounded bg-slate-100" />
          <div className="h-3 w-1/3 rounded bg-slate-100" />
        </div>
        <div className="h-7 w-24 rounded-full bg-slate-200" />
      </div>
      <div className="mt-4 h-3 w-4/5 rounded bg-slate-100" />
      <div className="mt-2 flex gap-1.5">
        <div className="h-5 w-16 rounded-full bg-slate-100" />
        <div className="h-5 w-20 rounded-full bg-slate-100" />
        <div className="h-5 w-14 rounded-full bg-slate-100" />
      </div>
      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
        <div className="h-8 w-24 rounded-lg bg-slate-200" />
        <div className="h-8 w-16 rounded-lg bg-slate-100" />
        <div className="h-8 w-16 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      {label}
    </div>
  );
}

export const NAV_ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  ),
  matches: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  ),
  searches: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  ),
};
