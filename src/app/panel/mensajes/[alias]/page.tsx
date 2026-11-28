import type { Metadata } from "next";
import { textos } from "@/lib/i18n/servidor";
import { requerirPerfil } from "@/lib/sesion";
import Chat from "@/components/Chat";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["msg.titulo"] };
}

export default async function PaginaChat({ params }: PageProps<"/panel/mensajes/[alias]">) {
  const { alias } = await params;
  await requerirPerfil();
  return <Chat alias={decodeURIComponent(alias).replace(/^@/, "")} />;
}
