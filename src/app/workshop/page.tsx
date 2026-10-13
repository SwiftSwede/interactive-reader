import type { Metadata } from "next";
import { WorkshopLanding } from "@/components/workshop/WorkshopLanding";

export const metadata: Metadata = {
  alternates: { canonical: "/workshop" },
};

export default async function WorkshopPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.aviso;
  const aviso = Array.isArray(raw) ? raw[0] : raw;
  return <WorkshopLanding aviso={aviso} />;
}
