import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, LOCALES, makeT } from "@/i18n";

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);

  const how = [1, 2, 3, 4].map((i) => ({
    title: t(`landing.how${i}Title`),
    text: t(`landing.how${i}Text`),
  }));
  const features = [1, 2, 3, 4, 5, 6].map((i) => ({
    title: t(`landing.feat${i}Title`),
    text: t(`landing.feat${i}Text`),
  }));

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="glass sticky top-0 z-40 border-b border-slate-200/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
          <span className="text-lg font-bold brand-gradient-text">JobMatch AI</span>
          <div className="flex items-center gap-3">
            <nav className="flex gap-1">
              {LOCALES.map((loc) => (
                <Link
                  key={loc}
                  href={`/${loc}`}
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    loc === locale ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {loc.toUpperCase()}
                </Link>
              ))}
            </nav>
            <Link
              href={`/${locale}/app`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("nav.openApp")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">{t("landing.heroSubtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/${locale}/onboarding`}
              className="brand-gradient rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-soft-sm transition hover:opacity-90"
            >
              {t("landing.ctaUpload")}
            </Link>
            <Link
              href={`/${locale}/app`}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("landing.ctaDemo")}
            </Link>
          </div>
        </div>

        {/* Hero mockup */}
        <div className="relative">
          <div className="absolute -inset-6 rounded-[36px] brand-gradient opacity-10 blur-2xl" />
          <div className="glass relative rounded-[28px] border border-slate-200 p-6 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("dashboard.bestMatch")}
                </p>
                <h3 className="mt-1 text-lg font-bold">Junior Data Analyst</h3>
                <p className="text-sm text-slate-500">Sofia · {t("workplace.hybrid")} · €900–€1300</p>
              </div>
              <span className="brand-gradient rounded-full px-3 py-1.5 text-lg font-bold text-white">
                94%
              </span>
            </div>
            <div className="mt-4 rounded-2xl bg-indigo-50/70 p-4 text-sm">
              <p className="font-semibold text-indigo-900">{t("landing.mockWhy")}</p>
              <p className="mt-0.5 text-indigo-800">{t("landing.mockWhyText")}</p>
              <p className="mt-2 font-semibold text-indigo-900">{t("landing.mockMissing")}</p>
              <p className="mt-0.5 text-indigo-800">{t("landing.mockMissingText")}</p>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4">
              <div>
                <p className="text-2xl font-bold brand-gradient-text">24</p>
                <p className="text-xs text-slate-500">{t("landing.mockNewMatches")}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-800">82%</p>
                <p className="text-xs text-slate-500">{t("dashboard.profileStrength")}</p>
              </div>
            </div>
            <span className="brand-gradient absolute -right-3 -top-3 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-soft-sm">
              {t("landing.mockBadge")}
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight">{t("landing.howTitle")}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {how.map((step, i) => (
              <div key={i} className="rounded-[22px] border border-slate-200 bg-slate-50/50 p-6">
                <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          {t("landing.featuresTitle")}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft-sm">
              <h3 className="font-semibold brand-gradient-text">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Markets */}
      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
          <h2 className="text-center text-xl font-bold">{t("landing.marketsTitle")}</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {["marketBg", "marketRo", "marketIntl"].map((key) => (
              <span
                key={key}
                className="rounded-full border border-slate-200 bg-slate-50 px-5 py-2 text-sm font-medium text-slate-700"
              >
                {t(`landing.${key}`)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight">{t("landing.ctaTitle")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">{t("landing.ctaText")}</p>
        <Link
          href={`/${locale}/onboarding`}
          className="brand-gradient mt-8 inline-block rounded-xl px-8 py-3.5 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
        >
          {t("landing.ctaUpload")}
        </Link>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        {t("landing.footer")}
      </footer>
    </div>
  );
}

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "bg" }];
}
