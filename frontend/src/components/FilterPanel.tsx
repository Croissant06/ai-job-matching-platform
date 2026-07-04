"use client";

import { useState } from "react";
import type { T } from "@/i18n";
import { FilterOptions, SearchParams } from "@/lib/api";

export default function FilterPanel({
  t,
  options,
  filters,
  onChange,
  onSearch,
  onSaveSearch,
}: {
  t: T;
  options: FilterOptions | null;
  filters: SearchParams;
  onChange: (f: SearchParams) => void;
  onSearch: () => void;
  onSaveSearch: (name: string) => Promise<void>;
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savedNote, setSavedNote] = useState(false);

  const set = (patch: Partial<SearchParams>) => onChange({ ...filters, ...patch });

  const field = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400";

  const selects: {
    key: keyof SearchParams;
    labelKey: string;
    values: string[];
    render: (v: string) => string;
  }[] = [
    {
      key: "country",
      labelKey: "filters.country",
      values: options?.countries ?? [],
      render: (v) => v,
    },
    { key: "city", labelKey: "filters.city", values: options?.cities ?? [], render: (v) => v },
    {
      key: "seniority",
      labelKey: "filters.seniority",
      values: options?.seniorities ?? [],
      render: (v) => t(`seniority.${v}`),
    },
    {
      key: "workplace",
      labelKey: "filters.workplace",
      values: options?.workplaces ?? [],
      render: (v) => t(`workplace.${v}`),
    },
    {
      key: "employment_type",
      labelKey: "filters.employmentType",
      values: options?.employment_types ?? [],
      render: (v) => t(`employment.${v}`),
    },
    {
      key: "language",
      labelKey: "filters.language",
      values: options?.languages ?? [],
      render: (v) => t(`jobLanguage.${v}`),
    },
  ];

  const save = async () => {
    if (!saveName.trim()) return;
    await onSaveSearch(saveName.trim());
    setSaveOpen(false);
    setSaveName("");
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 2500);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      className="space-y-4"
    >
      <input
        className={field}
        placeholder={t("filters.search")}
        value={filters.q ?? ""}
        onChange={(e) => set({ q: e.target.value })}
      />

      {selects.map(({ key, labelKey, values, render }) => (
        <div key={key}>
          <label className={label}>{t(labelKey)}</label>
          <select
            className={field}
            value={(filters[key] as string) ?? ""}
            onChange={(e) => set({ [key]: e.target.value || undefined })}
          >
            <option value="">{t("filters.any")}</option>
            {values.map((v) => (
              <option key={v} value={v}>
                {render(v)}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div>
        <label className={label}>{t("filters.salaryMin")}</label>
        <input
          type="number"
          className={field}
          value={filters.salary_min ?? ""}
          onChange={(e) => set({ salary_min: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <div>
        <label className={label}>
          {t("filters.minScore")}: {filters.min_score ?? 0}%
        </label>
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          className="w-full accent-indigo-600"
          value={filters.min_score ?? 0}
          onChange={(e) => set({ min_score: Number(e.target.value) || undefined })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className="brand-gradient rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {t("filters.apply")}
        </button>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSaveOpen(!saveOpen)}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            {savedNote ? t("filters.saved") : t("filters.saveSearch")}
          </button>
          <button
            type="button"
            onClick={() => {
              onChange({});
              onSearch();
            }}
            className="text-sm text-slate-500 hover:underline"
          >
            {t("filters.reset")}
          </button>
        </div>
        {saveOpen && (
          <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
            <label className={label}>{t("filters.searchName")}</label>
            <input
              className={field}
              placeholder={t("filters.searchNamePlaceholder")}
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
            <button
              type="button"
              onClick={save}
              className="w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t("profile.save")}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
