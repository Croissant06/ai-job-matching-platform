import { notFound } from "next/navigation";
import { isLocale } from "@/i18n";
import SetLang from "@/components/SetLang";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <>
      <SetLang locale={locale} />
      {children}
    </>
  );
}
