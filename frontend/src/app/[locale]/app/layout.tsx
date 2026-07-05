import { notFound } from "next/navigation";
import { isLocale } from "@/i18n";
import AppShell from "@/components/AppShell";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AppShell locale={locale}>{children}</AppShell>;
}
