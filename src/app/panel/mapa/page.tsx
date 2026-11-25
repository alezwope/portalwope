import type { Metadata } from "next";
import { requerirPerfil } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mapa" };

export default async function Mapa() {
  const { supabase } = await requerirPerfil();
  const { count } = await supabase.from("parques").select("id", { count: "exact", head: true });

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Mapa de parques</h1>
      <section className="tarjeta grid gap-2">
        <p className="titulo text-4xl text-lava">{(count ?? 0).toLocaleString("es")}</p>
        <p className="text-suave">parques de calistenia ya cargados en nuestra base.</p>
        <p>
          El mapa interactivo llega en la próxima fase: buscar parques cerca de ti, ver su ficha, hacer check-in y ver el mapa de
          calor de cuánta gente está entrenando.
        </p>
      </section>
    </div>
  );
}
