import type { Metadata } from "next";
import { requerirPerfil } from "@/lib/sesion";
import MapaParques from "@/components/MapaParques";

export const metadata: Metadata = { title: "Mapa" };

export default async function Mapa() {
  await requerirPerfil();
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Mapa de parques</h1>
      <MapaParques />
    </div>
  );
}
