import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirEntrenador } from "@/lib/entrenador";
import ConstructorPlan, { type PlanInicial } from "@/components/ConstructorPlan";
import type { EjercicioCat } from "@/lib/planes";

export const metadata: Metadata = { title: "Plan" };

type ItemDB = { orden: number; ejercicio_id: string | null; nombre_libre: string | null; series: number | null; reps: number | null; segundos: number | null; descanso_seg: number | null; notas: string | null };

export default async function PlanPagina(props: PageProps<"/panel/entrenador/planes/[id]">) {
  const { id } = await props.params;
  const { supabase, pagina } = await requerirEntrenador();
  const { data: cat } = await supabase.from("ejercicios").select("id, nombre, nivel, patron, equipo").eq("activo", true).order("id");
  const catalogo = (cat ?? []) as EjercicioCat[];

  let inicial: PlanInicial = { pagina_id: pagina.id, nombre: "", descripcion: "", orden_fijo: true, entrenos: [{ nombre: "", notas: "", items: [] }] };
  if (id !== "nuevo") {
    const { data: p } = await supabase
      .from("planes")
      .select("id, nombre, descripcion, orden_fijo, plan_entrenos(id, orden, nombre, notas, entreno_items(orden, ejercicio_id, nombre_libre, series, reps, segundos, descanso_seg, notas))")
      .eq("id", id).eq("pagina_id", pagina.id).maybeSingle();
    if (!p) notFound();
    const n = (v: number | null) => (v == null ? "" : String(v));
    inicial = {
      id: p.id, pagina_id: pagina.id, nombre: p.nombre, descripcion: p.descripcion ?? "", orden_fijo: p.orden_fijo,
      entrenos: [...(p.plan_entrenos as unknown as { id: string; orden: number; nombre: string; notas: string | null; entreno_items: ItemDB[] }[])]
        .sort((a, b) => a.orden - b.orden)
        .map((e) => ({
          id: e.id, nombre: e.nombre, notas: e.notas ?? "",
          items: [...e.entreno_items].sort((a, b) => a.orden - b.orden).map((i) => ({
            ejercicio_id: i.ejercicio_id, nombre_libre: i.nombre_libre ?? "", series: n(i.series), reps: n(i.reps),
            segundos: n(i.segundos), descanso_seg: n(i.descanso_seg), notas: i.notas ?? "",
          })),
        })),
    };
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <Link href="/panel/entrenador/planes" className="text-sm text-suave hover:text-lava">← Mis planes</Link>
      <h1 className="text-3xl">{id === "nuevo" ? "Nuevo plan" : "Editar plan"}</h1>
      <ConstructorPlan inicial={inicial} catalogo={catalogo} />
    </div>
  );
}
