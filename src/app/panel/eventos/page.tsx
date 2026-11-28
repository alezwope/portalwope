import type { Metadata } from "next";
import { textos } from "@/lib/i18n/servidor";
import { requerirPerfil } from "@/lib/sesion";
import Juntadas from "@/components/Juntadas";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["jun.titulo"] };
}

export default async function PaginaJuntadas() {
  await requerirPerfil();
  const { t } = await textos();
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl"><span className="texto-fuego">{t["jun.titulo"]}</span></h1>
      <Juntadas />
    </div>
  );
}
