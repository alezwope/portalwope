import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { textos } from "@/lib/i18n/servidor";
import { requerirPerfil } from "@/lib/sesion";
import CrewDetalle from "@/components/CrewDetalle";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["crw.titulo"] };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PaginaCrew({ params }: PageProps<"/panel/crews/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await requerirPerfil();
  return <CrewDetalle id={id} />;
}
