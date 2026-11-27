import type { Metadata } from "next";
import Link from "next/link";
import EstadoPagina from "@/components/EstadoPagina";
import ReportesAdmin from "@/components/ReportesAdmin";
import { requerirEquipo, puede } from "@/lib/permisos";
import { TIPOS_PAGINA, type TipoPagina } from "@/lib/catalogos";

export const metadata: Metadata = { title: "Consola · Resumen" };

type Resumen = {
  personas: number; personas_semana: number; paginas: number; parques: number;
  checkins_hoy: number; reportes_pendientes: number; comentarios_nuevos: number; modulos_activos: number;
};

export default async function Admin() {
  const { supabase, equipo } = await requerirEquipo();

  if (!(puede(equipo, "moderar") || puede(equipo, "personas"))) {
    return <p className="tarjeta text-suave">Tu rol no incluye el resumen. Usa las secciones de arriba.</p>;
  }

  const [{ data: resumen }, { data: usuarios }, { data: paginas }, { data: reportes }] = await Promise.all([
    supabase.rpc("admin_resumen"),
    supabase.from("profiles").select("id, alias, nombre, nivel, es_admin, onboarding_completo, creado_en").order("creado_en", { ascending: false }).limit(200),
    supabase.from("paginas").select("id, tipo, nombre, slug, estado, especialidad, creado_en").order("creado_en", { ascending: false }).limit(200),
    supabase.rpc("admin_reportes"),
  ]);
  const r = (resumen ?? {}) as Partial<Resumen>;
  const enRevision = (paginas ?? []).filter((p) => p.estado === "revision");

  const tarjetas: [string, number | undefined][] = [
    ["Personas", r.personas],
    ["Nuevas esta semana", r.personas_semana],
    ["Páginas", r.paginas],
    ["Parques", r.parques],
    ["Check-ins hoy", r.checkins_hoy],
    ["Reportes abiertos", r.reportes_pendientes],
    ["Comentarios nuevos", r.comentarios_nuevos],
    ["Módulos activos", r.modulos_activos],
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tarjetas.map(([t, v]) => (
          <div key={t} className="tarjeta"><p className="text-sm text-suave">{t}</p><p className="titulo text-3xl">{(v ?? 0).toLocaleString("es")}</p></div>
        ))}
      </div>

      <ReportesAdmin inicial={(reportes ?? []) as React.ComponentProps<typeof ReportesAdmin>["inicial"]} />

      {enRevision.length > 0 && (
        <section className="tarjeta !border-dorado">
          <h2 className="text-xl mb-2">Por verificar ({enRevision.length})</h2>
          <p className="text-sm text-suave mb-2">Páginas de wellness: revisa sus credenciales antes de activarlas.</p>
        </section>
      )}

      <section className="tarjeta overflow-x-auto">
        <h2 className="text-xl mb-3">Páginas</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-suave"><tr><th className="py-2">Nombre</th><th>Tipo</th><th>Estado</th></tr></thead>
          <tbody>
            {(paginas ?? []).map((p) => (
              <tr key={p.id} className="border-t border-borde">
                <td className="py-2"><Link href={`/e/${p.slug}`} className="hover:text-lava">{p.nombre}</Link>{p.especialidad && <span className="text-suave"> · {p.especialidad}</span>}</td>
                <td>{TIPOS_PAGINA[p.tipo as TipoPagina].nombre}</td>
                <td><EstadoPagina id={p.id} actual={p.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="tarjeta overflow-x-auto">
        <h2 className="text-xl mb-3">Personas</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-suave"><tr><th className="py-2">Alias</th><th>Nombre</th><th>Nivel</th><th>Alta</th></tr></thead>
          <tbody>
            {(usuarios ?? []).map((u) => (
              <tr key={u.id} className="border-t border-borde">
                <td className="py-2">{u.alias ? `@${u.alias}` : <span className="text-suave">sin completar</span>}{u.es_admin && " 🛡️"}</td>
                <td>{u.nombre ?? "—"}</td>
                <td>{u.nivel ?? "—"}</td>
                <td>{new Date(u.creado_en).toLocaleDateString("es")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
