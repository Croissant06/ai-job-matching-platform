import { notFound } from "next/navigation";
import { isLocale } from "@/i18n";
import App from "@/components/App";

export default async function LocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <App locale={locale} />;
}

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "bg" }];
}
