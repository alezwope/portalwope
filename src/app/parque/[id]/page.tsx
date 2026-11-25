import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Cabecera from "@/components/Cabecera";
import { CATEGORIAS, nombreParque, urlComoLlegar, urlGoogleMaps, type CategoriaParque } from "@/lib/parques";

export const revalidate = 3600;

type Ficha = {
  id: string; nombre: string | null; pais: string | null; categoria: CategoriaParque; aparatos: number | null;
  aparatos_barra: number | null; fuente: string | null; fecha_fuente: string | null; atribucion: string | null;
  confirmaciones: number | null; estado: string | null; lat: number; lng: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function cargar(id: string): Promise<Ficha | null> {
  if (!UUID.test(id)) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const { data } = await supabase.rpc("parque_ficha", { p_id: id });
  return (data as Ficha | null) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/parque/[id]">): Promise<Metadata> {
  const { id } = await params;
  const f = await cargar(id);
  if (!f) return { title: "Parque no encontrado" };
  const n = nombreParque(f.nombre, f.categoria);
  return { title: n, description: `${n}: ${CATEGORIAS[f.categoria].nombre.toLowerCase()}${f.pais ? ` en ${f.pais}` : ""}. Ubicación y datos en UniBars.` };
}

export default async function FichaParque({ params }: PageProps<"/parque/[id]">) {
  const { id } = await params;
  const f = await cargar(id);
  if (!f) notFound();
  const cat = CATEGORIAS[f.categoria];

  return (
    <>
      <Cabecera>
        <Link href="/mapa" className="btn btn-borde !py-1.5">Mapa</Link>
      </Cabecera>
      <main className="mx-auto grid max-w-2xl gap-4 px-4 py-6">
        <p className="flex items-center gap-2 text-sm text-suave">
          <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ background: cat.color }} />
          {cat.nombre}
        </p>
        <h1 className="text-3xl">{nombreParque(f.nombre, f.categoria)}</h1>
        <section className="tarjeta grid gap-2">
          <p className="text-suave">{cat.detalle}</p>
          {f.pais && <p><strong>País:</strong> {f.pais}</p>}
          {f.aparatos ? <p><strong>Aparatos registrados:</strong> {f.aparatos}{f.aparatos_barra ? ` (${f.aparatos_barra} de barra)` : ""}</p> : null}
          <p className="text-sm text-suave">Coordenadas: {f.lat.toFixed(5)}, {f.lng.toFixed(5)}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a className="btn btn-lava" href={urlComoLlegar(f.lat, f.lng)} target="_blank" rel="noopener noreferrer">Cómo llegar</a>
            <a className="btn btn-borde" href={urlGoogleMaps(f.lat, f.lng)} target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a>
            <Link className="btn btn-borde" href="/mapa">Volver al mapa</Link>
          </div>
        </section>
        <section className="tarjeta grid gap-1 text-sm text-suave">
          <p><strong className="text-texto">Fuente:</strong> {f.fuente ?? "OpenStreetMap"}{f.fecha_fuente ? ` (${f.fecha_fuente})` : ""}</p>
          <p>{f.atribucion || "© colaboradores de OpenStreetMap, licencia ODbL."}</p>
        </section>
        <section className="tarjeta grid gap-1">
          <p className="font-bold">Próximamente en esta ficha</p>
          <p className="text-suave">Check-in, cuánta gente está entrenando, fotos y reseñas de la comunidad.</p>
        </section>
      </main>
    </>
  );
}
