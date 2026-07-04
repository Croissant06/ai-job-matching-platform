"use client";

import { useRef, useState } from "react";
import { api, Profile } from "@/lib/api";
import type { T } from "@/i18n";

export default function UploadCard({
  t,
  onProfile,
  compact = false,
}: {
  t: T;
  onProfile: (p: Profile) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      onProfile(await api.uploadCv(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("upload.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={
        compact
          ? ""
          : "mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
      }
    >
      {!compact && (
        <>
          <h2 className="text-xl font-semibold">{t("upload.title")}</h2>
          <p className="mt-2 text-sm text-slate-500">{t("upload.hint")}</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={`${compact ? "w-full" : "mt-6"} rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50`}
      >
        {busy ? t("upload.parsing") : compact ? t("profile.replaceCv") : t("upload.button")}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
