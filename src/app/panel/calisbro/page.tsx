import type { Metadata } from "next";
import { textos } from "@/lib/i18n/servidor";
import { requerirPerfil } from "@/lib/sesion";
import CalisBro from "@/components/CalisBro";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["cb.titulo"] };
}

export default async function Pagina() {
  await requerirPerfil();
  const { t } = await textos();
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl"><span className="texto-fuego">{t["cb.titulo"]}</span></h1>
      <p className="text-suave">{t["cb.intro"]}</p>
      <CalisBro />
    </div>
  );
}
