"use client";

import { useState } from "react";
import { api, Profile } from "@/lib/api";
import type { T } from "@/i18n";
import UploadCard from "./UploadCard";

const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export default function ProfilePanel({
  t,
  profile,
  onProfile,
}: {
  t: T;
  profile: Profile;
  onProfile: (p: Profile) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    city: profile.city ?? "",
    seniority: profile.seniority ?? "",
    skills: profile.skills.join(", "),
    roles: profile.roles.join(", "),
    languages: profile.languages.join(", "),
    summary: profile.summary ?? "",
  });

  const startEdit = () => {
    setForm({
      full_name: profile.full_name ?? "",
      city: profile.city ?? "",
      seniority: profile.seniority ?? "",
      skills: profile.skills.join(", "),
      roles: profile.roles.join(", "),
      languages: profile.languages.join(", "),
      summary: profile.summary ?? "",
    });
    setEditing(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      onProfile(
        await api.updateProfile({
          full_name: form.full_name || null,
          city: form.city || null,
          seniority: form.seniority || null,
          skills: list(form.skills),
          roles: list(form.roles),
          languages: list(form.languages),
          summary: form.summary || null,
        }),
      );
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t("profile.title")}</h2>
        {!editing && (
          <button onClick={startEdit} className="text-sm font-medium text-indigo-600 hover:underline">
            {t("profile.edit")}
          </button>
        )}
      </div>

      {!editing ? (
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="font-medium">{profile.full_name ?? "—"}</p>
            <p className="text-slate-500">
              {[profile.city, profile.country].filter(Boolean).join(", ")}
              {profile.seniority && ` · ${t(`seniority.${profile.seniority}`)}`}
              {profile.years_experience != null &&
                ` · ${profile.years_experience} ${t("profile.experience")}`}
            </p>
          </div>
          {profile.summary && <p className="text-slate-600">{profile.summary}</p>}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("profile.skills")}
            </p>
            <div className="flex flex-wrap gap-1">
              {profile.skills.map((s) => (
                <span key={s} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("profile.languages")}
            </p>
            <p className="text-slate-600">{profile.languages.join(", ") || "—"}</p>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <UploadCard t={t} onProfile={onProfile} compact />
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          <input
            className={field}
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder={t("profile.title")}
          />
          <input
            className={field}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder={t("filters.city")}
          />
          <select
            className={field}
            value={form.seniority}
            onChange={(e) => setForm({ ...form, seniority: e.target.value })}
          >
            <option value="">{t("filters.any")}</option>
            {["intern", "junior", "mid", "senior", "management"].map((s) => (
              <option key={s} value={s}>
                {t(`seniority.${s}`)}
              </option>
            ))}
          </select>
          <textarea
            className={field}
            rows={2}
            value={form.skills}
            onChange={(e) => setForm({ ...form, skills: e.target.value })}
            placeholder={t("profile.skills")}
          />
          <input
            className={field}
            value={form.roles}
            onChange={(e) => setForm({ ...form, roles: e.target.value })}
            placeholder={t("profile.roles")}
          />
          <input
            className={field}
            value={form.languages}
            onChange={(e) => setForm({ ...form, languages: e.target.value })}
            placeholder={t("profile.languages")}
          />
          <textarea
            className={field}
            rows={3}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder={t("profile.summary")}
          />
          <p className="text-xs text-slate-400">{t("profile.editHint")}</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {t("profile.save")}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-slate-300 px-4 py-1.5 text-slate-600 hover:bg-slate-50"
            >
              {t("profile.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
