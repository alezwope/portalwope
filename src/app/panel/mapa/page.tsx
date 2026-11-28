import type { Metadata } from "next";
import { requerirPerfil } from "@/lib/sesion";
import MapaParques from "@/components/MapaParques";
import { textos } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["barra.mapa"] };
}

export default async function Mapa() {
  await requerirPerfil();
  const { t } = await textos();
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">{t["mapa.tituloCorto"]}</h1>
      <MapaParques />
    </div>
  );
}
