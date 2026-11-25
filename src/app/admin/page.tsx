import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Cabecera from "@/components/Cabecera";
import EstadoPagina from "@/components/EstadoPagina";
import { requerirPerfil } from "@/lib/sesion";
import { TIPOS_PAGINA, type TipoPagina } from "@/lib/catalogos";

export const metadata: Metadata = { title: "Administración" };

export default async function Admin() {
  const { supabase, perfil } = await requerirPerfil();
  if (!perfil.es_admin) redirect("/panel");

  const [{ data: usuarios }, { data: paginas }, { count: parques }, { count: vinculos }] = await Promise.all([
    supabase.from("profiles").select("id, alias, nombre, nivel, es_admin, onboarding_completo, creado_en").order("creado_en", { ascending: false }).limit(200),
    supabase.from("paginas").select("id, tipo, nombre, slug, estado, especialidad, creado_en").order("creado_en", { ascending: false }).limit(200),
    supabase.from("parques").select("id", { count: "exact", head: true }),
    supabase.from("vinculos").select("id", { count: "exact", head: true }).eq("estado", "aceptado"),
  ]);
  const enRevision = (paginas ?? []).filter((p) => p.estado === "revision");

  return (
    <>
      <Cabecera />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl">Administración</h1>
          <Link href="/panel" className="btn btn-borde">Volver al panel</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ["Usuarios", usuarios?.length ?? 0],
            ["Páginas", paginas?.length ?? 0],
            ["Vínculos activos", vinculos ?? 0],
            ["Parques", parques ?? 0],
          ].map(([t, v]) => (
            <div key={t} className="tarjeta"><p className="text-sm text-suave">{t}</p><p className="titulo text-3xl">{Number(v).toLocaleString("es")}</p></div>
          ))}
        </div>

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
          <h2 className="text-xl mb-3">Usuarios</h2>
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
      </main>
    </>
  );
}
