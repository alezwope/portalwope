import type { Metadata } from "next";
import Link from "next/link";
import { requerirEntrenador } from "@/lib/entrenador";

export const metadata: Metadata = { title: "Planes" };

export default async function Planes() {
  const { supabase, pagina } = await requerirEntrenador();
  const { data: planes } = await supabase
    .from("planes")
    .select("id, nombre, descripcion, orden_fijo, actualizado_en, plan_entrenos(id)")
    .eq("pagina_id", pagina.id)
    .order("actualizado_en", { ascending: false });
  const { data: asig } = await supabase.from("asignaciones").select("plan_id").eq("pagina_id", pagina.id).eq("activa", true);
  const usos = new Map<string, number>();
  (asig ?? []).forEach((a) => usos.set(a.plan_id, (usos.get(a.plan_id) ?? 0) + 1));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl">Mis planes</h1>
        <Link href="/panel/entrenador/planes/nuevo" className="btn btn-lava">+ Nuevo plan</Link>
      </div>
      <p className="text-sm text-suave">Arma un plan con entrenamientos y ejercicios del catálogo, y asígnalo a un alumno (desde su ficha) o a un grupo.</p>
      {(planes ?? []).length === 0 ? (
        <p className="tarjeta text-suave">Aún no creaste ningún plan.</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {(planes ?? []).map((p) => (
            <li key={p.id}>
              <Link href={`/panel/entrenador/planes/${p.id}`} className="tarjeta block hover:!border-lava">
                <p className="font-bold">{p.nombre}</p>
                {p.descripcion && <p className="text-sm text-suave">{p.descripcion}</p>}
                <p className="mt-1 text-xs text-suave">
                  {(p.plan_entrenos as unknown[]).length} entrenamientos · {p.orden_fijo ? "orden fijo" : "orden libre"} · {usos.get(p.id) ?? 0} asignaciones activas
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
