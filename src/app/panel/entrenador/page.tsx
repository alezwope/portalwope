import type { Metadata } from "next";
import { requerirEntrenador, type Tarjeta } from "@/lib/entrenador";
import TarjetaPersona from "@/components/TarjetaPersona";
import ResolverVinculo from "@/components/ResolverVinculo";
import BotonesResolver from "@/components/BotonesResolver";

export const metadata: Metadata = { title: "Solicitudes" };

export default async function Solicitudes() {
  const { supabase, pagina, perfil } = await requerirEntrenador();

  const [{ data: pendientes }, { data: escuelas }] = await Promise.all([
    supabase.from("vinculos").select("id").eq("pagina_id", pagina.id).eq("estado", "solicitud").order("creado_en"),
    supabase.from("escuelas").select("id, nombre").eq("pagina_id", pagina.id).order("nombre"),
  ]);
  const tarjetas = await Promise.all(
    (pendientes ?? []).map(async (v) => ({ id: v.id, t: (await supabase.rpc("tarjeta_vinculo", { p_id: v.id })).data as Tarjeta | null })),
  );

  // Entrenadores que quieren sumarse al equipo de mis escuelas.
  const { data: equipo } = await supabase
    .from("solicitudes")
    .select("id, solicitante_id, escuelas!inner(nombre, dueno_id)")
    .eq("estado", "pendiente")
    .eq("escuelas.dueno_id", perfil.id);
  const ids = (equipo ?? []).map((s) => s.solicitante_id);
  const { data: alias } = ids.length ? await supabase.rpc("perfiles_publicos", { p_ids: ids }) : { data: [] };
  const aliasDe = new Map<string, string | null>((alias ?? []).map((p: { id: string; alias: string | null }) => [p.id, p.alias]));

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <h1 className="text-3xl">Solicitudes de entrenamiento</h1>
        {tarjetas.length === 0 ? (
          <p className="tarjeta text-suave">
            No tienes solicitudes nuevas. Las personas te encuentran en «Encuentra entrenador» o se suman directo con tu link o QR de
            invitación.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {tarjetas.map(({ id, t }) =>
              t ? (
                <li key={id} className="tarjeta grid gap-4">
                  <TarjetaPersona t={t} atiende={pagina.atiende_niveles} />
                  <ResolverVinculo id={id} escuelas={escuelas ?? []} />
                </li>
              ) : null,
            )}
          </ul>
        )}
      </section>

      {(equipo ?? []).length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-2xl">Entrenadores que quieren sumarse a tu equipo</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {(equipo ?? []).map((s) => (
              <li key={s.id} className="tarjeta grid gap-3">
                <p>
                  <strong>@{aliasDe.get(s.solicitante_id) ?? "entrenador"}</strong> quiere sumarse a{" "}
                  {(s.escuelas as unknown as { nombre: string }).nombre}
                </p>
                <BotonesResolver id={s.id} soloDueno />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
