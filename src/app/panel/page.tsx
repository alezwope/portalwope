import type { Metadata } from "next";
import Link from "next/link";
import { requerirPerfil } from "@/lib/sesion";
import { NIVELES, ROLES } from "@/lib/roles";

export const metadata: Metadata = { title: "Inicio" };

export default async function PanelInicio() {
  const { supabase, perfil } = await requerirPerfil();
  const rol = perfil.rol_principal!;

  const { data: membresias } = await supabase
    .from("escuela_miembros")
    .select("rol_en_escuela, escuelas(nombre, slug)")
    .eq("usuario_id", perfil.id);
  const escuela = (membresias?.[0]?.escuelas ?? null) as unknown as { nombre: string; slug: string } | null;

  const { count: sinLeer } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("leida", false);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl">¡Hola, @{perfil.alias}!</h1>
        <p className="text-suave">Estás en UniBars como {ROLES[rol].nombre}. {ROLES[rol].resumen}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(rol === "coach" || rol === "alumno") && (
          <section className="tarjeta">
            <h2 className="text-xl mb-2">Mi escuela</h2>
            {escuela ? (
              <p>Perteneces a <strong>{escuela.nombre}</strong>.</p>
            ) : (
              <p className="text-suave">Aún no perteneces a ninguna escuela.</p>
            )}
            <Link href="/panel/escuela" className="btn btn-lava mt-3">
              {escuela ? "Ver mi escuela" : rol === "coach" ? "Crear o unirme a una escuela" : "Buscar una escuela"}
            </Link>
          </section>
        )}

        <section className="tarjeta">
          <h2 className="text-xl mb-2">Avisos</h2>
          <p className="text-suave">{sinLeer ? `Tienes ${sinLeer} aviso(s) sin leer.` : "Estás al día."}</p>
          <Link href="/panel/notificaciones" className="btn btn-borde mt-3">Ver avisos</Link>
        </section>

        <section className="tarjeta">
          <h2 className="text-xl mb-2">Tu perfil</h2>
          <p className="text-suave">Ajusta tu alias, tu ciudad y tu privacidad.</p>
          <Link href="/panel/perfil" className="btn btn-borde mt-3">Editar perfil</Link>
        </section>
      </div>

      <section className="tarjeta">
        <h2 className="text-xl mb-3">Lo que viene en UniBars</h2>
        <ul className="grid gap-2 text-suave sm:grid-cols-2">
          <li>🗺️ Mapa mundial de parques de calistenia y check-ins</li>
          <li>💬 Comunidad: feed, amistades, retos</li>
          <li>🏋️ Entrenamientos y planes de tu coach</li>
          <li>🔥 Niveles: {NIVELES.map((n) => n.nombre).join(" → ")}</li>
        </ul>
      </section>
    </div>
  );
}
