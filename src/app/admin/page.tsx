import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Cabecera from "@/components/Cabecera";
import SelectorRol from "@/components/SelectorRol";
import { requerirPerfil } from "@/lib/sesion";
import { ROLES } from "@/lib/roles";

export const metadata: Metadata = { title: "Administración" };

export default async function Admin() {
  const { supabase, perfil } = await requerirPerfil();
  if (perfil.rol_principal !== "super_admin") redirect("/panel");

  const { data: usuarios } = await supabase
    .from("profiles")
    .select("id, alias, nombre, rol_principal, onboarding_completo, creado_en")
    .order("creado_en", { ascending: false })
    .limit(200);

  const { count: parques } = await supabase.from("parques").select("id", { count: "exact", head: true });
  const { count: escuelas } = await supabase.from("escuelas").select("id", { count: "exact", head: true });

  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 grid gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl">Administración</h1>
          <a href="/panel" className="btn btn-borde">Volver al panel</a>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="tarjeta"><p className="text-suave text-sm">Usuarios</p><p className="titulo text-3xl">{usuarios?.length ?? 0}</p></div>
          <div className="tarjeta"><p className="text-suave text-sm">Escuelas</p><p className="titulo text-3xl">{escuelas ?? 0}</p></div>
          <div className="tarjeta"><p className="text-suave text-sm">Parques en el mapa</p><p className="titulo text-3xl">{parques ?? 0}</p></div>
        </div>
        <section className="tarjeta overflow-x-auto">
          <h2 className="text-xl mb-3">Usuarios y roles</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-suave">
              <tr><th className="py-2">Alias</th><th>Nombre</th><th>Rol</th></tr>
            </thead>
            <tbody>
              {(usuarios ?? []).map((u) => (
                <tr key={u.id} className="border-t border-borde">
                  <td className="py-2">{u.alias ? `@${u.alias}` : <span className="text-suave">sin completar</span>}</td>
                  <td>{u.nombre ?? "—"}</td>
                  <td>
                    {u.onboarding_completo ? (
                      <SelectorRol usuarioId={u.id} actual={u.rol_principal!} soyYo={u.id === perfil.id} />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-suave">Roles disponibles: {Object.values(ROLES).map((r) => r.nombre).join(", ")}.</p>
        </section>
      </main>
    </>
  );
}
