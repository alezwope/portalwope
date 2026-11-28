import type { Metadata } from "next";
import { textos } from "@/lib/i18n/servidor";
import { requerirPerfil } from "@/lib/sesion";
import Crews from "@/components/Crews";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["crw.titulo"] };
}

export default async function PaginaCrews() {
  await requerirPerfil();
  const { t } = await textos();
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl"><span className="texto-fuego">{t["crw.titulo"]}</span></h1>
      <p className="text-suave">{t["crw.intro"]}</p>
      <Crews />
    </div>
  );
}
