import type { Metadata } from "next";
import Link from "next/link";
import { misPaginas, requerirPerfil } from "@/lib/sesion";
import IntencionPagina from "@/components/IntencionPagina";
import { OBJETIVOS, nivelDe, type Objetivo } from "@/lib/catalogos";
import Feed from "@/components/Feed";
import type { ItemFeed } from "@/lib/social";

export const metadata: Metadata = { title: "Inicio" };

export default async function PanelInicio() {
  const { supabase, perfil } = await requerirPerfil();
  const paginas = await misPaginas();
  const nivel = nivelDe(perfil.nivel);

  const [{ count: marcas }, { count: vinculos }, { data: avisos }, { data: feed }] = await Promise.all([
    supabase.from("marcas").select("id", { count: "exact", head: true }).eq("usuario_id", perfil.id),
    supabase.from("vinculos").select("id", { count: "exact", head: true }).eq("persona_id", perfil.id).in("estado", ["solicitud", "aceptado"]),
    supabase.from("notificaciones").select("id, titulo, enlace, creado_en").eq("leida", false).order("creado_en", { ascending: false }).limit(5),
    supabase.rpc("feed", { p_pestana: "amigos" }),
  ]);

  const pasos = [
    { hecho: !!nivel, texto: "Elige tu nivel", detalle: "Así te mostramos lo que te sirve.", href: "/panel/perfil" },
    { hecho: !!marcas, texto: "Registra tus primeras marcas", detalle: "Tus máximos de repeticiones: tu punto de partida.", href: "/panel/perfil#entrenamiento" },
    { hecho: !!vinculos, texto: "Encuentra un entrenador", detalle: "Opcional: alguien que te guíe nivel por nivel.", href: "/panel/comunidad" },
  ];
  const pendientes = pasos.filter((p) => !p.hecho);

  return (
    <div className="grid gap-6">
      <IntencionPagina tiposQueTiene={paginas.map((p) => p.tipo)} />
      <header>
        <h1 className="text-3xl">¡Hola, @{perfil.alias}!</h1>
        <p className="text-suave">
          {nivel ? (
            <>Nivel <strong style={{ color: nivel.color }}>{nivel.nombre}</strong></>
          ) : (
            "Aún sin nivel"
          )}
          {perfil.objetivo && <> · Objetivo: {OBJETIVOS[perfil.objetivo as Objetivo]}</>}
        </p>
      </header>

      {pendientes.length > 0 && (
        <section className="tarjeta">
          <h2 className="text-xl mb-3">Tus primeros pasos</h2>
          <ol className="grid gap-2">
            {pasos.map((p) => (
              <li key={p.texto}>
                <Link href={p.href} className={`flex items-start gap-3 rounded-lg p-2 hover:bg-bg ${p.hecho ? "opacity-60" : ""}`}>
                  <span aria-hidden className="text-lg">{p.hecho ? "✅" : "⬜"}</span>
                  <span>
                    <span className="block font-bold">{p.texto}</span>
                    <span className="text-sm text-suave">{p.detalle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {(avisos ?? []).length > 0 && (
        <section className="tarjeta">
          <h2 className="text-xl mb-3">Avisos</h2>
          <ul className="grid gap-2">
            {(avisos ?? []).map((a) => (
              <li key={a.id}>
                <Link href={a.enlace ?? "/panel/notificaciones"} className="block rounded-lg border border-borde p-3 hover:border-lava">
                  {a.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Feed inicial={(feed ?? []) as ItemFeed[]} />

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/panel/entrenar" className="tarjeta hover:!border-lava">
          <h2 className="text-xl text-lava">CalisteniaGO</h2>
          <p className="text-suave">Tu programa guiado, nivel por nivel. Próximamente.</p>
        </Link>
        {paginas.some((p) => p.tipo === "entrenador") ? (
          <Link href="/panel/entrenador" className="tarjeta hover:!border-lava">
            <h2 className="text-xl text-lava">Tu panel de entrenador</h2>
            <p className="text-suave">Solicitudes, alumnos, escuela e invitaciones.</p>
          </Link>
        ) : (
          <Link href="/panel/perfil#paginas" className="tarjeta hover:!border-lava">
            <h2 className="text-xl text-lava">¿Eres entrenador?</h2>
            <p className="text-suave">Crea tu página de entrenador: hasta 100 alumnos gratis.</p>
          </Link>
        )}
      </div>

      {perfil.es_admin && (
        <Link href="/admin" className="btn btn-borde justify-self-start">Administración</Link>
      )}
    </div>
  );
}
