import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Cabecera from "@/components/Cabecera";
import SolicitarEntrenamiento from "@/components/SolicitarEntrenamiento";
import { crearClienteServidor } from "@/lib/supabase/server";
import { MODALIDADES, NIVELES, OBJETIVOS, TIPOS_PAGINA, ESTADOS_PAGINA, type TipoPagina } from "@/lib/catalogos";
import type { Pagina } from "@/lib/sesion";

async function cargar(slug: string) {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("paginas")
    .select("id, tipo, nombre, slug, bio, ciudad, pais, estado, modalidades, atiende_niveles, atiende_objetivos, especialidad, plan")
    .eq("slug", slug)
    .maybeSingle();
  return { supabase, pagina: data as Pagina | null };
}

export async function generateMetadata(props: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const { pagina } = await cargar(slug);
  if (!pagina) return { title: "Página no encontrada" };
  return { title: pagina.nombre, description: pagina.bio ?? `${TIPOS_PAGINA[pagina.tipo].nombre} en UniBars` };
}

export default async function PaginaPublica(props: PageProps<"/e/[slug]">) {
  const { slug } = await props.params;
  const { supabase, pagina } = await cargar(slug);
  if (!pagina) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let perfil: { alias: string | null; nivel: string | null; onboarding_completo: boolean } | null = null;
  let vinculo: { estado: string } | null = null;
  let esMia = false;
  if (user) {
    const [{ data: p }, { data: v }, { data: mias }] = await Promise.all([
      supabase.from("profiles").select("alias, nivel, onboarding_completo").eq("id", user.id).single(),
      supabase.from("vinculos").select("estado").eq("pagina_id", pagina.id).eq("persona_id", user.id).in("estado", ["solicitud", "aceptado"]).maybeSingle(),
      supabase.rpc("mis_paginas"),
    ]);
    perfil = p;
    vinculo = v;
    esMia = ((mias ?? []) as { id: string }[]).some((m) => m.id === pagina.id);
  }

  const recibe = pagina.tipo !== "tienda" && pagina.estado === "activa";
  const volver = `/e/${pagina.slug}`;

  return (
    <>
      <Cabecera>
        {user ? <Link href="/panel" className="btn btn-borde">Mi panel</Link> : <Link href={`/entrar?siguiente=${volver}`} className="btn btn-lava">Entrar</Link>}
      </Cabecera>
      <main className="mx-auto grid w-full max-w-3xl flex-1 gap-6 px-4 py-8">
        <header className="grid gap-2">
          <p className="text-sm uppercase tracking-widest text-dorado">
            {TIPOS_PAGINA[pagina.tipo as TipoPagina].icono} {TIPOS_PAGINA[pagina.tipo as TipoPagina].nombre}
            {pagina.especialidad && ` · ${pagina.especialidad}`}
          </p>
          <h1 className="text-4xl">{pagina.nombre}</h1>
          <p className="text-suave">{[pagina.ciudad, pagina.pais].filter(Boolean).join(", ")}</p>
          {pagina.estado !== "activa" && <p className="aviso-error">Esta página está {ESTADOS_PAGINA[pagina.estado].toLowerCase()}: solo tú puedes verla.</p>}
        </header>

        {pagina.bio && <p className="tarjeta whitespace-pre-line">{pagina.bio}</p>}

        {(pagina.modalidades.length > 0 || pagina.atiende_niveles.length > 0 || pagina.atiende_objetivos.length > 0) && (
          <section className="tarjeta grid gap-3">
            {pagina.modalidades.length > 0 && (
              <p><strong>Modalidades:</strong> {pagina.modalidades.map((m) => MODALIDADES[m as keyof typeof MODALIDADES]).join(", ")}</p>
            )}
            {pagina.atiende_niveles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <strong>Niveles:</strong>
                {NIVELES.filter((n) => pagina.atiende_niveles.includes(n.clave)).map((n) => (
                  <span key={n.clave} className="rounded-full border px-2 text-sm" style={{ borderColor: n.color, color: n.color }}>{n.nombre}</span>
                ))}
              </div>
            )}
            {pagina.atiende_objetivos.length > 0 && (
              <p><strong>Ayuda con:</strong> {pagina.atiende_objetivos.map((o) => OBJETIVOS[o as keyof typeof OBJETIVOS]).join(", ")}</p>
            )}
          </section>
        )}

        {recibe && !esMia && (
          <section className="tarjeta grid gap-3">
            {!user ? (
              <>
                <h2 className="text-xl">¿Quieres entrenar con {pagina.nombre}?</h2>
                <p className="text-suave">Crea tu cuenta gratis o entra para enviar tu solicitud.</p>
                <Link href={`/entrar?siguiente=${volver}`} className="btn btn-lava justify-self-start">Crear cuenta o entrar</Link>
              </>
            ) : !perfil?.onboarding_completo ? (
              <Link href={`/onboarding?siguiente=${volver}`} className="btn btn-lava justify-self-start">Completa tu perfil para continuar</Link>
            ) : vinculo ? (
              <p className="aviso-ok">
                {vinculo.estado === "aceptado" ? `${pagina.nombre} es tu entrenador.` : "Ya enviaste tu solicitud. Te avisaremos cuando responda."}{" "}
                <Link href="/panel/comunidad" className="underline">Ver en Comunidad</Link>
              </p>
            ) : (
              <SolicitarEntrenamiento paginaId={pagina.id} nombre={pagina.nombre} miNivel={perfil.nivel} atiende={pagina.atiende_niveles} />
            )}
          </section>
        )}
        {esMia && <Link href={pagina.tipo === "entrenador" ? "/panel/entrenador/ficha" : "/panel/perfil#paginas"} className="btn btn-borde justify-self-start">Editar mi página</Link>}
      </main>
    </>
  );
}
