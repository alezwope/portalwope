import type { Metadata } from "next";
import AdminPlanesInsignia, { type PlanInsignia, type BeneficioInsignia } from "@/components/AdminPlanesInsignia";
import AdminRegalarInsignia from "@/components/AdminRegalarInsignia";
import AdminQuitarInsignia from "@/components/AdminQuitarInsignia";
import { requerirEquipo } from "@/lib/permisos";

export const metadata: Metadata = { title: "Consola · Insignias" };

type FilaInsignia = {
  id: string; pagina_id: string | null; perfil_id: string | null; rol: string; estado: string;
  origen: string; desde: string; hasta: string | null; nota: string | null;
};

export default async function AdminInsignias() {
  const { supabase } = await requerirEquipo("insignias");

  const [{ data: planes }, { data: beneficios }, { data: pb }, { data: lista }, { data: ajustes }] = await Promise.all([
    supabase.from("planes_insignia").select("*").order("orden"),
    supabase.from("beneficios").select("clave, nombre, activo").order("orden"),
    supabase.from("plan_beneficios").select("rol, beneficio"),
    supabase.rpc("admin_insignias_listar"),
    supabase.from("ajustes").select("clave, valor, descripcion").in("clave", ["limite_alumnos_gratis", "limite_productos_gratis", "cupo_precio_fundador"]),
  ]);

  const incluidos: Record<string, string[]> = {};
  (pb ?? []).forEach((x) => { (incluidos[x.rol] ??= []).push(x.beneficio); });

  const filas = (lista ?? []) as FilaInsignia[];
  const idsPerfil = filas.map((f) => f.perfil_id).filter(Boolean) as string[];
  const idsPagina = filas.map((f) => f.pagina_id).filter(Boolean) as string[];
  const [{ data: perfiles }, { data: paginas }] = await Promise.all([
    idsPerfil.length ? supabase.from("profiles").select("id, alias").in("id", idsPerfil) : Promise.resolve({ data: [] as { id: string; alias: string | null }[] }),
    idsPagina.length ? supabase.from("paginas").select("id, nombre").in("id", idsPagina) : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ]);
  const nombrePerfil = new Map((perfiles ?? []).map((p) => [p.id, p.alias ? `@${p.alias}` : "sin alias"]));
  const nombrePagina = new Map((paginas ?? []).map((p) => [p.id, p.nombre]));

  return (
    <>
      <section className="tarjeta">
        <h2 className="text-xl mb-1">Insignias</h2>
        <p className="text-sm text-suave">
          Un plan por rol. El nombre, los precios y los beneficios se editan aquí. Los precios actuales son de lanzamiento. El cobro llega en la Etapa 3;
          mientras tanto puedes regalar insignias a los testers.
        </p>
        <ul className="mt-3 text-sm text-suave">
          {(ajustes ?? []).map((a) => (
            <li key={a.clave}>{a.descripcion}: <strong className="text-texto">{String(a.valor)}</strong> <span>(se cambia en Ajustes)</span></li>
          ))}
        </ul>
      </section>

      <AdminPlanesInsignia planes={(planes ?? []) as PlanInsignia[]} beneficios={(beneficios ?? []) as BeneficioInsignia[]} incluidos={incluidos} />

      <AdminRegalarInsignia roles={(planes ?? []).map((p) => p.rol)} />

      <section className="tarjeta overflow-x-auto">
        <h2 className="text-xl mb-3">Insignias entregadas ({filas.length})</h2>
        {filas.length === 0 ? <p className="text-sm text-suave">Todavía no hay insignias.</p> : (
          <table className="w-full text-left text-sm">
            <thead className="text-suave"><tr><th className="py-2">Para</th><th>Tipo</th><th>Estado</th><th>Origen</th><th>Vence</th><th /></tr></thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="border-t border-borde">
                  <td className="py-2">{f.perfil_id ? nombrePerfil.get(f.perfil_id) : nombrePagina.get(f.pagina_id ?? "") ?? "—"}</td>
                  <td>{f.rol}</td>
                  <td>{f.estado}</td>
                  <td>{f.origen}</td>
                  <td>{f.hasta ? new Date(f.hasta).toLocaleDateString("es") : "sin fin"}</td>
                  <td>{(f.estado === "activa" || f.estado === "regalada" || f.estado === "en_verificacion") && <AdminQuitarInsignia id={f.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
