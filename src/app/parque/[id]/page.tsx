import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Cabecera from "@/components/Cabecera";
import CheckIn from "@/components/CheckIn";
import { textos } from "@/lib/i18n/servidor";
import { nomCat } from "@/lib/i18n/diccionarios";
import { CATEGORIAS, nombreParque, urlComoLlegar, urlGoogleMaps, type CategoriaParque } from "@/lib/parques";

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
  const { t } = await textos();
  if (!f) return { title: t["parque.noEncontrado"] };
  const cat = nomCat(t, "cat", f.categoria, CATEGORIAS[f.categoria].nombre);
  const n = nombreParque(f.nombre, f.categoria, cat, t["parque.sinNombre"]);
  return { title: n, description: `${n} · ${cat}${f.pais ? ` · ${f.pais}` : ""} · UniBars` };
}

export default async function FichaParque({ params }: PageProps<"/parque/[id]">) {
  const { id } = await params;
  const f = await cargar(id);
  if (!f) notFound();
  const cat = CATEGORIAS[f.categoria];
  const { t } = await textos();
  const catNombre = nomCat(t, "cat", f.categoria, cat.nombre);

  return (
    <>
      <Cabecera>
        <Link href="/mapa" className="btn btn-borde !py-1.5">{t["barra.mapa"]}</Link>
      </Cabecera>
      <main className="mx-auto grid max-w-2xl gap-4 px-4 py-6">
        <p className="flex items-center gap-2 text-sm text-suave">
          <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ background: cat.color }} />
          {catNombre}
        </p>
        <h1 className="text-3xl">{nombreParque(f.nombre, f.categoria, catNombre, t["parque.sinNombre"])}</h1>
        <section className="tarjeta grid gap-2">
          <p className="text-suave">{nomCat(t, "catD", f.categoria, cat.detalle)}</p>
          {f.pais && <p><strong>{t["parque.pais"]}</strong> {f.pais}</p>}
          {f.aparatos ? <p><strong>{t["parque.aparatos"]}</strong> {f.aparatos}{f.aparatos_barra ? ` (${f.aparatos_barra} ${t["parque.deBarra"]})` : ""}</p> : null}
          <p className="text-sm text-suave">{t["parque.coordenadas"]} {f.lat.toFixed(5)}, {f.lng.toFixed(5)}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a className="btn btn-lava" href={urlComoLlegar(f.lat, f.lng)} target="_blank" rel="noopener noreferrer">{t["parque.comoLlegar"]}</a>
            <a className="btn btn-borde" href={urlGoogleMaps(f.lat, f.lng)} target="_blank" rel="noopener noreferrer">{t["parque.google"]}</a>
            <Link className="btn btn-borde" href="/mapa">{t["parque.volverMapa"]}</Link>
          </div>
        </section>
        <section className="tarjeta grid gap-1 text-sm text-suave">
          <p><strong className="text-texto">{t["parque.fuente"]}</strong> {f.fuente ?? "OpenStreetMap"}{f.fecha_fuente ? ` (${f.fecha_fuente})` : ""}</p>
          <p>{f.atribucion || "© colaboradores de OpenStreetMap, licencia ODbL."}</p>
        </section>
        <CheckIn parqueId={f.id} />
      </main>
    </>
  );
}
