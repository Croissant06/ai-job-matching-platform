"use client";

import { useState } from "react";
import type { T } from "@/i18n";
import { Profile } from "@/lib/api";

const SENIORITIES = ["intern", "junior", "mid", "senior", "management"];
const WORKPLACES = ["onsite", "hybrid", "remote"];
const EMPLOYMENT = ["full_time", "part_time"];

const toList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function ChipSelect({
  options,
  values,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
  label?: string;
}) {
  const toggle = (value: string) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  return (
    <div>
      {label && <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              values.includes(opt.value)
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-indigo-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export type ProfileFormValues = Partial<
  Omit<Profile, "id" | "version" | "strength" | "suggestions">
>;

export default function ProfileForm({
  t,
  profile,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  t: T;
  profile: Profile;
  busy?: boolean;
  submitLabel: string;
  onSubmit: (values: ProfileFormValues) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    city: profile.city ?? "",
    seniority: profile.seniority ?? "",
    years_experience: profile.years_experience?.toString() ?? "",
    roles: profile.roles.join(", "),
    skills: profile.skills.join(", "),
    languages: profile.languages.join(", "),
    summary: profile.summary ?? "",
    preferred_cities: profile.preferred_cities.join(", "),
    preferred_workplaces: profile.preferred_workplaces,
    preferred_employment_types: profile.preferred_employment_types,
    target_seniorities: profile.target_seniorities,
    relocation_ready: profile.relocation_ready,
    salary_expectation: profile.salary_expectation?.toString() ?? "",
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () =>
    onSubmit({
      full_name: form.full_name || null,
      city: form.city || null,
      seniority: form.seniority || null,
      years_experience: form.years_experience ? Number(form.years_experience) : null,
      roles: toList(form.roles),
      skills: toList(form.skills),
      languages: toList(form.languages),
      summary: form.summary || null,
      preferred_cities: toList(form.preferred_cities),
      preferred_workplaces: form.preferred_workplaces,
      preferred_employment_types: form.preferred_employment_types,
      target_seniorities: form.target_seniorities,
      relocation_ready: form.relocation_ready,
      salary_expectation: form.salary_expectation ? Number(form.salary_expectation) : null,
    });

  const field = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{t("profile.fullName")}</label>
          <input className={field} value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} />
        </div>
        <div>
          <label className={label}>{t("profile.city")}</label>
          <input className={field} value={form.city} onChange={(e) => set({ city: e.target.value })} />
        </div>
        <div>
          <label className={label}>{t("profile.experienceLevel")}</label>
          <select
            className={field}
            value={form.seniority}
            onChange={(e) => set({ seniority: e.target.value })}
          >
            <option value="">{t("filters.any")}</option>
            {SENIORITIES.map((s) => (
              <option key={s} value={s}>
                {t(`seniority.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{t("profile.experience")}</label>
          <input
            type="number"
            className={field}
            value={form.years_experience}
            onChange={(e) => set({ years_experience: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className={label}>{t("profile.detectedRoles")}</label>
        <input className={field} value={form.roles} onChange={(e) => set({ roles: e.target.value })} />
      </div>
      <div>
        <label className={label}>{t("profile.topSkills")}</label>
        <textarea className={field} rows={2} value={form.skills} onChange={(e) => set({ skills: e.target.value })} />
      </div>
      <div>
        <label className={label}>{t("profile.languages")}</label>
        <input className={field} value={form.languages} onChange={(e) => set({ languages: e.target.value })} />
      </div>
      <div>
        <label className={label}>{t("profile.summary")}</label>
        <textarea className={field} rows={3} value={form.summary} onChange={(e) => set({ summary: e.target.value })} />
      </div>

      <ChipSelect
        label={t("profile.workPreferences")}
        options={WORKPLACES.map((w) => ({ value: w, label: t(`workplace.${w}`) }))}
        values={form.preferred_workplaces}
        onChange={(v) => set({ preferred_workplaces: v })}
      />
      <ChipSelect
        options={EMPLOYMENT.map((e2) => ({ value: e2, label: t(`employment.${e2}`) }))}
        values={form.preferred_employment_types}
        onChange={(v) => set({ preferred_employment_types: v })}
      />
      <ChipSelect
        label={t("onboarding.levelLabel")}
        options={SENIORITIES.map((s) => ({ value: s, label: t(`seniority.${s}`) }))}
        values={form.target_seniorities}
        onChange={(v) => set({ target_seniorities: v })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{t("profile.preferredCities")}</label>
          <input
            className={field}
            value={form.preferred_cities}
            onChange={(e) => set({ preferred_cities: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>{t("profile.salaryExpectation")}</label>
          <input
            type="number"
            className={field}
            placeholder={t("onboarding.salaryPlaceholder")}
            value={form.salary_expectation}
            onChange={(e) => set({ salary_expectation: e.target.value })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.relocation_ready}
          onChange={(e) => set({ relocation_ready: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
        />
        {t("profile.relocation")}
      </label>

      <p className="text-xs text-slate-500">{t("profile.editHint")}</p>

      <div className="flex gap-2 pt-1">
        <button
          onClick={submit}
          disabled={busy}
          className="brand-gradient rounded-xl px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {t("profile.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}
