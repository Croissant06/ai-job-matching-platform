"use client";

import { useState } from "react";
import { useApp } from "@/components/AppShell";
import ProfileForm, { ProfileFormValues } from "@/components/ProfileForm";
import UploadCard from "@/components/UploadCard";
import { Card, SkillChips } from "@/components/ui";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const { t, profile, setProfile } = useApp();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (values: ProfileFormValues) => {
    setBusy(true);
    try {
      setProfile(await api.updateProfile(values));
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const sectionLabel = "text-xs font-semibold uppercase tracking-wide text-slate-400";

  const locations = [
    ...(profile.preferred_cities.length ? profile.preferred_cities : [profile.city].filter(Boolean)),
    ...(profile.relocation_ready ? [t("profile.relocation")] : []),
  ] as string[];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("profile.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {profile.full_name}
            {profile.city && ` · ${profile.city}`}
            {profile.years_experience != null &&
              ` · ${profile.years_experience} ${t("profile.experience")}`}
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="brand-gradient rounded-xl px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {t("profile.edit")}
          </button>
        )}
      </div>

      {/* Profile strength */}
      <Card className="mt-5 p-5">
        <div className="flex items-center justify-between">
          <p className={sectionLabel}>{t("profile.strength")}</p>
          <p className="text-xl font-bold brand-gradient-text">{profile.strength}%</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full brand-gradient" style={{ width: `${profile.strength}%` }} />
        </div>
        {profile.suggestions.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            {profile.suggestions.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                {t(`suggestions.${key}`)}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing ? (
        <Card className="mt-4 p-6">
          <ProfileForm
            t={t}
            profile={profile}
            busy={busy}
            submitLabel={t("profile.save")}
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card className="p-5 sm:col-span-2">
            <p className={sectionLabel}>{t("profile.summary")}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {profile.summary ?? t("profile.notSet")}
            </p>
          </Card>

          <Card className="p-5">
            <p className={sectionLabel}>{t("profile.detectedRoles")}</p>
            <div className="mt-2">
              {profile.roles.length ? (
                <SkillChips skills={profile.roles} tone="brand" />
              ) : (
                <p className="text-sm text-slate-400">{t("profile.notSet")}</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <p className={sectionLabel}>{t("profile.experienceLevel")}</p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              {profile.seniority ? t(`seniority.${profile.seniority}`) : t("profile.notSet")}
              {profile.target_seniorities.length > 0 && (
                <span className="text-slate-400">
                  {" "}
                  → {profile.target_seniorities.map((s) => t(`seniority.${s}`)).join(", ")}
                </span>
              )}
            </p>
          </Card>

          <Card className="p-5 sm:col-span-2">
            <p className={sectionLabel}>{t("profile.topSkills")}</p>
            <div className="mt-2">
              {profile.skills.length ? (
                <SkillChips skills={profile.skills} />
              ) : (
                <p className="text-sm text-slate-400">{t("profile.notSet")}</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <p className={sectionLabel}>{t("profile.languages")}</p>
            <p className="mt-2 text-sm text-slate-700">
              {profile.languages.join(" · ") || t("profile.notSet")}
            </p>
          </Card>

          <Card className="p-5">
            <p className={sectionLabel}>{t("profile.preferredLocations")}</p>
            <p className="mt-2 text-sm text-slate-700">
              {locations.join(" · ") || t("profile.notSet")}
            </p>
          </Card>

          <Card className="p-5">
            <p className={sectionLabel}>{t("profile.workPreferences")}</p>
            <p className="mt-2 text-sm text-slate-700">
              {[
                ...profile.preferred_workplaces.map((w) => t(`workplace.${w}`)),
                ...profile.preferred_employment_types.map((e) => t(`employment.${e}`)),
              ].join(" · ") || t("profile.notSet")}
            </p>
          </Card>

          <Card className="p-5">
            <p className={sectionLabel}>{t("profile.salaryExpectation")}</p>
            <p className="mt-2 text-sm text-slate-700">
              {profile.salary_expectation
                ? `${profile.salary_expectation} BGN${t("profile.perMonth")}`
                : t("profile.notSet")}
            </p>
          </Card>

          <Card className="p-5 sm:col-span-2">
            <UploadCard t={t} onProfile={setProfile} compact />
          </Card>
        </div>
      )}
    </div>
  );
}
