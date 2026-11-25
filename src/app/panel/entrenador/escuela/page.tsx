import type { Metadata } from "next";
import { requerirEntrenador } from "@/lib/entrenador";
import FormularioEscuela from "@/components/FormularioEscuela";

export const metadata: Metadata = { title: "Escuela" };

export default async function Escuela() {
  const { supabase, pagina } = await requerirEntrenador();
  const { data: escuelas } = await supabase
    .from("escuelas")
    .select("id, nombre, ciudad, pais")
    .eq("pagina_id", pagina.id)
    .order("creado_en");

  const detalle = await Promise.all(
    (escuelas ?? []).map(async (e) => {
      const [{ data: staff }, { count: alumnos }] = await Promise.all([
        supabase.from("escuela_miembros").select("usuario_id, rol_en_escuela").eq("escuela_id", e.id),
        supabase.from("vinculos").select("id", { count: "exact", head: true }).eq("escuela_id", e.id).eq("estado", "aceptado"),
      ]);
      const ids = (staff ?? []).map((s) => s.usuario_id);
      const { data: perf } = ids.length ? await supabase.rpc("perfiles_publicos", { p_ids: ids }) : { data: [] };
      const alias = new Map<string, string | null>((perf ?? []).map((p: { id: string; alias: string | null }) => [p.id, p.alias]));
      return { ...e, alumnos: alumnos ?? 0, staff: (staff ?? []).map((s) => ({ alias: alias.get(s.usuario_id), rol: s.rol_en_escuela })) };
    }),
  );

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl">Escuela</h1>
      <p className="text-suave">
        Tu escuela agrupa a tus alumnos y a otros entrenadores que trabajen contigo. Puedes entrenar a personas sin escuela también.
      </p>
      {detalle.map((e) => (
        <section key={e.id} className="tarjeta grid gap-2">
          <h2 className="text-2xl text-lava">{e.nombre}</h2>
          <p className="text-sm text-suave">{[e.ciudad, e.pais].filter(Boolean).join(", ") || "Sin ubicación"} · {e.alumnos} alumno(s)</p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {e.staff.map((s, i) => (
              <li key={i} className="rounded-full border border-borde px-3 py-0.5">@{s.alias ?? "entrenador"} · {s.rol === "dueno" ? "dueño" : "entrenador"}</li>
            ))}
          </ul>
        </section>
      ))}
      <section className="tarjeta grid gap-3">
        <h2 className="text-xl">{detalle.length ? "Crear otra escuela" : "Crea tu escuela"}</h2>
        <FormularioEscuela />
      </section>
    </div>
  );
}
