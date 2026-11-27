import type { Metadata } from "next";
import Link from "next/link";
import { misPaginas, requerirPerfil } from "@/lib/sesion";
import FormularioPerfil from "@/components/FormularioPerfil";
import FormularioEntrenamiento from "@/components/FormularioEntrenamiento";
import CrearPagina from "@/components/CrearPagina";
import BotonSalir from "@/components/BotonSalir";
import PrivacidadSocial from "@/components/PrivacidadSocial";
import { ESTADOS_PAGINA, TIPOS_PAGINA, type TipoPagina } from "@/lib/catalogos";

export const metadata: Metadata = { title: "Perfil" };

export default async function PaginaPerfil(props: PageProps<"/panel/perfil">) {
  const sp = await props.searchParams;
  const crear = typeof sp.crear === "string" ? sp.crear : null;
  const { supabase, perfil } = await requerirPerfil();
  const paginas = await misPaginas();
  const [{ data: medidas }, { data: salud }, { data: marcas }, { data: bloqueados }] = await Promise.all([
    supabase.from("perfil_medidas").select("peso_kg, estatura_cm").eq("usuario_id", perfil.id).maybeSingle(),
    supabase.from("perfil_salud").select("lesiones, notas").eq("usuario_id", perfil.id).maybeSingle(),
    supabase.from("marcas").select("id, ejercicio, valor, unidad, fecha").eq("usuario_id", perfil.id).order("fecha", { ascending: false }).limit(50),
    supabase.rpc("mis_bloqueos"),
  ]);
  const faltan = (Object.keys(TIPOS_PAGINA) as TipoPagina[]).filter((t) => !paginas.some((p) => p.tipo === t));

  return (
    <div className="grid max-w-3xl gap-10">
      <section className="grid gap-3">
        <h1 className="text-3xl">Tu perfil</h1>
        <FormularioPerfil perfil={perfil} />
      </section>

      <section id="entrenamiento" className="grid gap-3 scroll-mt-20">
        <h2 className="text-2xl">Perfil de entrenamiento</h2>
        <FormularioEntrenamiento usuarioId={perfil.id} medidas={medidas} salud={salud} marcas={marcas ?? []} />
      </section>

      <section id="privacidad" className="grid gap-3 scroll-mt-20">
        <h2 className="text-2xl">Privacidad y comunidad</h2>
        <PrivacidadSocial usuarioId={perfil.id} actual={perfil.compartir_logros === "nadie" ? "nadie" : "amigos"} bloqueados={(bloqueados ?? []) as { id: string; alias: string }[]} />
      </section>

      <section id="paginas" className="grid gap-3 scroll-mt-20">
        <h2 className="text-2xl">Tus páginas</h2>
        <p className="text-suave">Además de tu cuenta personal, puedes crear páginas para entrenar a otros, vender o ofrecer servicios.</p>
        {paginas.map((p) => (
          <div key={p.id} className="tarjeta flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold">{TIPOS_PAGINA[p.tipo].icono} {p.nombre}</p>
              <p className="text-sm text-suave">{TIPOS_PAGINA[p.tipo].nombre} · {ESTADOS_PAGINA[p.estado]}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/e/${p.slug}`} className="btn btn-borde !py-1.5">Ver pública</Link>
              {p.tipo === "entrenador" && <Link href="/panel/entrenador" className="btn btn-lava !py-1.5">Abrir panel</Link>}
            </div>
          </div>
        ))}
        <div className="grid gap-3 sm:grid-cols-2">
          {faltan.map((t) => <CrearPagina key={t} tipo={t} abiertoInicial={crear === t} />)}
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/panel/notificaciones" className="btn btn-borde">Avisos</Link>
        <BotonSalir />
      </section>
    </div>
  );
}
