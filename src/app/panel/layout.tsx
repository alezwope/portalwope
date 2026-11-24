import Link from "next/link";
import Cabecera from "@/components/Cabecera";
import BotonSalir from "@/components/BotonSalir";
import { requerirPerfil } from "@/lib/sesion";
import { ROLES } from "@/lib/roles";

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const { supabase, perfil } = await requerirPerfil();
  const rol = perfil.rol_principal!;

  const { count } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("leida", false);

  const enlaces: { href: string; texto: string }[] = [{ href: "/panel", texto: "Inicio" }];
  if (rol === "coach" || rol === "alumno") enlaces.push({ href: "/panel/escuela", texto: "Mi escuela" });
  if (rol === "coach") enlaces.push({ href: "/panel/solicitudes", texto: "Solicitudes" });
  enlaces.push({ href: "/panel/notificaciones", texto: count ? `Avisos (${count})` : "Avisos" });
  enlaces.push({ href: "/panel/perfil", texto: "Perfil" });
  if (rol === "super_admin") enlaces.push({ href: "/admin", texto: "Administración" });

  return (
    <>
      <Cabecera>
        <span className="hidden text-sm text-suave sm:inline">
          @{perfil.alias} · {ROLES[rol].nombre}
        </span>
        <BotonSalir />
      </Cabecera>
      <nav aria-label="Principal" className="border-b border-borde">
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
          {enlaces.map((e) => (
            <li key={e.href}>
              <Link href={e.href} className="btn btn-borde !py-1.5 whitespace-nowrap">{e.texto}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
