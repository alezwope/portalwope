import type { Metadata } from "next";
import { requerirEquipo } from "@/lib/permisos";

export const metadata: Metadata = { title: "Consola · Historial" };

export default async function PaginaAuditoria() {
  const { supabase } = await requerirEquipo("auditoria");
  const { data } = await supabase
    .from("auditoria")
    .select("id, actor_id, accion, objeto_tipo, objeto_id, antes, despues, creado_en")
    .order("creado_en", { ascending: false })
    .limit(200);

  const ids = [...new Set((data ?? []).map((a) => a.actor_id).filter(Boolean))] as string[];
  const { data: perfiles } = ids.length ? await supabase.from("profiles").select("id, alias").in("id", ids) : { data: [] as { id: string; alias: string | null }[] };
  const alias = new Map((perfiles ?? []).map((p) => [p.id, p.alias ? `@${p.alias}` : "sin alias"]));

  return (
    <section className="tarjeta overflow-x-auto">
      <h2 className="text-xl mb-1">Historial de cambios</h2>
      <p className="mb-3 text-sm text-suave">Todo cambio hecho desde la consola queda aquí: quién, cuándo, qué y cómo estaba antes. Últimos 200.</p>
      {(data ?? []).length === 0 ? <p className="text-sm text-suave">Todavía no hay cambios registrados.</p> : (
        <table className="w-full text-left text-sm">
          <thead className="text-suave"><tr><th className="py-2">Cuándo</th><th>Quién</th><th>Acción</th><th>Objeto</th><th>Detalle</th></tr></thead>
          <tbody>
            {(data ?? []).map((a) => (
              <tr key={a.id} className="border-t border-borde align-top">
                <td className="py-2 pr-2 whitespace-nowrap">{new Date(a.creado_en).toLocaleString("es")}</td>
                <td className="pr-2">{a.actor_id ? alias.get(a.actor_id) ?? "—" : "sistema"}</td>
                <td className="pr-2 font-mono text-xs">{a.accion}</td>
                <td className="pr-2 text-xs">{a.objeto_tipo} · {a.objeto_id}</td>
                <td>
                  <details>
                    <summary className="cursor-pointer text-xs text-suave">ver</summary>
                    <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify({ antes: a.antes, despues: a.despues }, null, 1)}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
