import type { Metadata } from "next";
import Link from "next/link";
import { requerirEntrenador } from "@/lib/entrenador";
import { nivelDe } from "@/lib/catalogos";

export const metadata: Metadata = { title: "Alumnos" };

export default async function Alumnos() {
  const { supabase, pagina } = await requerirEntrenador();
  const { data: vinculos } = await supabase
    .from("vinculos")
    .select("id, persona_id, origen, resuelto_en, escuelas(nombre)")
    .eq("pagina_id", pagina.id)
    .eq("estado", "aceptado")
    .order("resuelto_en", { ascending: false });
  const ids = (vinculos ?? []).map((v) => v.persona_id);
  const { data: perfiles } = ids.length ? await supabase.rpc("perfiles_publicos", { p_ids: ids }) : { data: [] };
  // perfiles_publicos oculta a quien está en modo invisible; el alias del alumno igual se ve en su tarjeta.
  const info = new Map<string, { alias: string | null; nivel: string | null }>(
    (perfiles ?? []).map((p: { id: string; alias: string | null; nivel: string | null }) => [p.id, p]),
  );

  return (
    <div className="grid gap-3">
      <h1 className="text-3xl">Mis alumnos</h1>
      {(vinculos ?? []).length === 0 ? (
        <p className="tarjeta text-suave">Todavía no tienes alumnos. Comparte tu invitación desde «Invitar».</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {(vinculos ?? []).map((v) => {
            const p = info.get(v.persona_id);
            const nivel = nivelDe(p?.nivel);
            const escuela = (v.escuelas as unknown as { nombre: string } | null)?.nombre;
            return (
              <li key={v.id}>
                <Link href={`/panel/entrenador/alumno/${v.id}`} className="tarjeta flex items-center justify-between gap-2 hover:!border-lava">
                  <span>
                    <span className="font-bold">@{p?.alias ?? "alumno"}</span>
                    <span className="block text-sm text-suave">{escuela ?? "Individual"}{v.origen === "invitacion" ? " · por invitación" : ""}</span>
                  </span>
                  {nivel && <span className="text-sm" style={{ color: nivel.color }}>{nivel.nombre}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
