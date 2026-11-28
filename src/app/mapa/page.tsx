import type { Metadata } from "next";
import Link from "next/link";
import Cabecera from "@/components/Cabecera";
import MapaParques from "@/components/MapaParques";
import { textos } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t["mapa.titulo"], description: t["mapa.descripcion"] };
}

export default async function MapaPublico() {
  const { t } = await textos();
  return (
    <>
      <Cabecera>
        <Link href="/entrar" className="btn btn-lava !py-1.5">{t["comun.entrar"]}</Link>
      </Cabecera>
      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6">
        <h1 className="text-3xl">{t["mapa.titulo"]}</h1>
        <MapaParques />
      </main>
    </>
  );
}
