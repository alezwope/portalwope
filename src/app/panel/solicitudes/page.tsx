import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requerirPerfil } from "@/lib/sesion";
import BotonesResolver from "@/components/BotonesResolver";

export const metadata: Metadata = { title: "Solicitudes" };

export default async function Solicitudes() {
  const { supabase, perfil } = await requerirPerfil();
  if (perfil.rol_principal !== "coach") redirect("/panel");

  const { data: filas } = await supabase
    .from("solicitudes")
    .select("id, tipo, solicitante_id, creado_en, escuelas(nombre)")
    .eq("estado", "pendiente")
    .neq("solicitante_id", perfil.id)
    .order("creado_en");

  const ids = (filas ?? []).map((f) => f.solicitante_id);
  const { data: perfiles } = ids.length ? await supabase.rpc("perfiles_publicos", { p_ids: ids }) : { data: [] };
  const alias = new Map<string, string | null>((perfiles ?? []).map((p: { id: string; alias: string | null }) => [p.id, p.alias]));

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Solicitudes</h1>
      {(filas ?? []).length === 0 ? (
        <p className="tarjeta text-suave">No tienes solicitudes pendientes.</p>
      ) : (
        <ul className="grid gap-3">
          {(filas ?? []).map((f) => (
            <li key={f.id} className="tarjeta flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">@{alias.get(f.solicitante_id) ?? "anónimo"}</p>
                <p className="text-sm text-suave">
                  {f.tipo === "coach_a_escuela" ? "Quiere sumarse como coach" : "Quiere unirse como alumno"} a{" "}
                  {(f.escuelas as unknown as { nombre: string })?.nombre}
                </p>
              </div>
              <BotonesResolver id={f.id} soloDueno={f.tipo === "coach_a_escuela"} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
