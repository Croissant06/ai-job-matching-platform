"use client";

import { FilterOptions, SearchParams } from "@/lib/api";
import type { T } from "@/i18n";

export default function Filters({
  t,
  options,
  filters,
  onChange,
  onSearch,
}: {
  t: T;
  options: FilterOptions | null;
  filters: SearchParams;
  onChange: (f: SearchParams) => void;
  onSearch: () => void;
}) {
  const select = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";

  const set = (patch: Partial<SearchParams>) => onChange({ ...filters, ...patch });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder={t("filters.search")}
          value={filters.q ?? ""}
          onChange={(e) => set({ q: e.target.value })}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            className={select}
            value={filters.country ?? ""}
            onChange={(e) => set({ country: e.target.value || undefined })}
          >
            <option value="">{t("filters.country")}: {t("filters.any")}</option>
            {options?.countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className={select}
            value={filters.city ?? ""}
            onChange={(e) => set({ city: e.target.value || undefined })}
          >
            <option value="">{t("filters.city")}: {t("filters.any")}</option>
            {options?.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className={select}
            value={filters.seniority ?? ""}
            onChange={(e) => set({ seniority: e.target.value || undefined })}
          >
            <option value="">{t("filters.seniority")}: {t("filters.any")}</option>
            {(options?.seniorities ?? []).map((s) => (
              <option key={s} value={s}>
                {t(`seniority.${s}`)}
              </option>
            ))}
          </select>
          <select
            className={select}
            value={filters.workplace ?? ""}
            onChange={(e) => set({ workplace: e.target.value || undefined })}
          >
            <option value="">{t("filters.workplace")}: {t("filters.any")}</option>
            {(options?.workplaces ?? []).map((w) => (
              <option key={w} value={w}>
                {t(`workplace.${w}`)}
              </option>
            ))}
          </select>
          <select
            className={select}
            value={filters.employment_type ?? ""}
            onChange={(e) => set({ employment_type: e.target.value || undefined })}
          >
            <option value="">{t("filters.employmentType")}: {t("filters.any")}</option>
            {(options?.employment_types ?? []).map((e2) => (
              <option key={e2} value={e2}>
                {t(`employment.${e2}`)}
              </option>
            ))}
          </select>
          <input
            type="number"
            className={`${select} w-36`}
            placeholder={t("filters.salaryMin")}
            value={filters.salary_min ?? ""}
            onChange={(e) => set({ salary_min: e.target.value ? Number(e.target.value) : undefined })}
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t("filters.apply")}
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
      </form>
    </div>
  );
}
