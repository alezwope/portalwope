import type { Metadata } from "next";
import { requerirEntrenador } from "@/lib/entrenador";
import FormularioFicha from "@/components/FormularioFicha";
import Sedes, { type Sede } from "@/components/Sedes";

export const metadata: Metadata = { title: "Mi escuela" };

export default async function MiEscuela() {
  const { supabase, pagina } = await requerirEntrenador();
  const [{ data: sedes }, { data: escuelas }] = await Promise.all([
    supabase.rpc("sedes_pagina", { p_pagina: pagina.id }),
    supabase.from("escuelas").select("id, nombre").eq("pagina_id", pagina.id).order("creado_en"),
  ]);
  const detalle = await Promise.all(
    (escuelas ?? []).map(async (e) => {
      const { data: staff } = await supabase.from("escuela_miembros").select("usuario_id, rol_en_escuela").eq("escuela_id", e.id);
      const ids = (staff ?? []).map((s) => s.usuario_id);
      const { data: perf } = ids.length ? await supabase.rpc("perfiles_publicos", { p_ids: ids }) : { data: [] };
      const alias = new Map<string, string | null>((perf ?? []).map((p: { id: string; alias: string | null }) => [p.id, p.alias]));
      return (staff ?? []).map((s) => ({ alias: alias.get(s.usuario_id), rol: s.rol_en_escuela }));
    }),
  );
  const equipo = detalle.flat();

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-3xl">Mi escuela</h1>
        <p className="text-suave">
          Tu página de entrenador es tu escuela. Ponle tu nombre o el que quieras: es lo que la gente busca. Indica a quién entrenas: si alguien de otro nivel te escribe, se le avisa antes de enviar.
        </p>
      </div>
      <FormularioFicha pagina={pagina} />
      <Sedes
        paginaId={pagina.id}
        sedes={(sedes ?? []) as Sede[]}
        ubicacion={{ pais: pagina.pais ?? "", ciudad: pagina.ciudad ?? "" }}
      />
      <section className="tarjeta grid gap-2">
        <h2 className="text-xl text-lava">Equipo</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {equipo.map((s, i) => (
            <li key={i} className="rounded-full border border-borde px-3 py-0.5">@{s.alias ?? "entrenador"} · {s.rol === "dueno" ? "dueño" : "entrenador"}</li>
          ))}
        </ul>
        <p className="text-sm text-suave">Otros entrenadores pueden pedir sumarse a tu equipo; las solicitudes llegan a «Solicitudes».</p>
      </section>
    </div>
  );
}
