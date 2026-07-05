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
  const [dragging, setDragging] = useState(false);
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

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".pdf,.docx,.txt"
      className="hidden"
      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
    />
  );

  if (compact) {
    return (
      <>
        {input}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? t("upload.parsing") : t("upload.replaceCv")}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </>
    );
  }

  return (
    <div>
      {input}
      <button
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        disabled={busy}
        className={`block w-full rounded-[24px] border-2 border-dashed p-12 text-center transition ${
          dragging
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40"
        } disabled:opacity-60`}
      >
        {busy ? (
          <div className="flex flex-col items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <p className="font-medium text-indigo-700">{t("onboarding.parsing")}</p>
          </div>
        ) : (
          <>
            <div className="brand-gradient mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mt-4 font-semibold">{t("onboarding.dropTitle")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("onboarding.dropHint")}</p>
            <span className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
              {t("onboarding.browse")}
            </span>
          </>
        )}
      </button>
      <p className="mt-3 text-center text-xs text-slate-500">{t("onboarding.extractNote")}</p>
      {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
