"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, isLocale, makeT } from "@/i18n";
import { api, FilterOptions, Profile } from "@/lib/api";
import ProfileForm, { ChipSelect } from "@/components/ProfileForm";
import UploadCard from "@/components/UploadCard";
import { Card } from "@/components/ui";

const SENIORITIES = ["intern", "junior", "mid", "senior", "management"];
const WORKPLACES = ["remote", "hybrid", "onsite"];

export default function OnboardingPage() {
  const params = useParams<{ locale: string }>();
  const locale = isLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const t = useMemo(() => makeT(locale), [locale]);
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);

  // Goal chips (step 1)
  const [targetSeniorities, setTargetSeniorities] = useState<string[]>([]);
  const [workplaces, setWorkplaces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [relocation, setRelocation] = useState(false);
  const [salary, setSalary] = useState("");

  useEffect(() => {
    api.getFilterOptions().then(setOptions).catch(() => null);
  }, []);

  const applyPreferences = async (created: Profile) => {
    const hasPrefs = targetSeniorities.length || workplaces.length || cities.length || relocation || salary;
    if (!hasPrefs) return created;
    return api.updateProfile({
      target_seniorities: targetSeniorities,
      preferred_workplaces: workplaces,
      preferred_cities: cities,
      relocation_ready: relocation,
      salary_expectation: salary ? Number(salary) : null,
    });
  };

  const onUploaded = async (created: Profile) => {
    setBusy(true);
    try {
      setProfile(await applyPreferences(created));
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (values: Parameters<typeof api.updateProfile>[0]) => {
    setBusy(true);
    try {
      await api.updateProfile(values);
      router.push(`/${locale}/app`);
    } finally {
      setBusy(false);
    }
  };

  const steps = [0, 1, 2];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/${locale}`} className="text-lg font-bold brand-gradient-text">
        JobMatch AI
      </Link>

      {/* Stepper */}
      <div className="mt-8 flex items-center gap-2">
        {steps.map((i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i <= step ? "brand-gradient text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-xs font-medium ${i <= step ? "text-slate-800" : "text-slate-400"}`}>
              {t(`onboarding.steps.${i}`)}
            </span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
          </div>
        ))}
      </div>

      <Card className="mt-8 p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">{t("onboarding.step1Title")}</h1>
              <p className="mt-1 text-sm text-slate-500">{t("onboarding.step1Subtitle")}</p>
            </div>
            <ChipSelect
              label={t("onboarding.levelLabel")}
              options={SENIORITIES.map((s) => ({ value: s, label: t(`seniority.${s}`) }))}
              values={targetSeniorities}
              onChange={setTargetSeniorities}
            />
            <ChipSelect
              label={t("onboarding.workLabel")}
              options={WORKPLACES.map((w) => ({ value: w, label: t(`workplace.${w}`) }))}
              values={workplaces}
              onChange={setWorkplaces}
            />
            {options && options.cities.length > 0 && (
              <ChipSelect
                label={t("onboarding.cityLabel")}
                options={options.cities.map((c) => ({ value: c, label: c }))}
                values={cities}
                onChange={setCities}
              />
            )}
            <ChipSelect
              options={[{ value: "yes", label: t("onboarding.relocation") }]}
              values={relocation ? ["yes"] : []}
              onChange={(v) => setRelocation(v.includes("yes"))}
            />
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t("onboarding.salaryLabel")}
              </p>
              <input
                type="number"
                className="w-48 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder={t("onboarding.salaryPlaceholder")}
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="brand-gradient rounded-xl px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                {t("onboarding.continue")}
              </button>
              <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:underline">
                {t("onboarding.skip")}
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">{t("onboarding.step2Title")}</h1>
              <p className="mt-1 text-sm text-slate-500">{t("onboarding.step2Subtitle")}</p>
            </div>
            <UploadCard t={t} onProfile={onUploaded} />
            <button onClick={() => setStep(0)} className="text-sm text-slate-500 hover:underline">
              ← {t("onboarding.back")}
            </button>
          </div>
        )}

        {step === 2 && profile && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">{t("onboarding.step3Title")}</h1>
              <p className="mt-1 text-sm text-slate-500">{t("onboarding.step3Subtitle")}</p>
            </div>
            <ProfileForm
              t={t}
              profile={profile}
              busy={busy}
              submitLabel={t("onboarding.confirm")}
              onSubmit={confirm}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
