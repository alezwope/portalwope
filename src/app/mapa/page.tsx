import type { Metadata } from "next";
import Link from "next/link";
import Cabecera from "@/components/Cabecera";
import MapaParques from "@/components/MapaParques";

export const metadata: Metadata = {
  title: "Mapa de parques de calistenia",
  description: "Encuentra parques de calistenia y barras cerca de ti en todo el mundo. Mapa abierto y gratuito de UniBars.",
};

export default function MapaPublico() {
  return (
    <>
      <Cabecera>
        <Link href="/entrar" className="btn btn-lava !py-1.5">Entrar</Link>
      </Cabecera>
      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6">
        <h1 className="text-3xl">Mapa de parques de calistenia</h1>
        <MapaParques />
      </main>
    </>
  );
}
