import type { Metadata } from "next";
import Link from "next/link";
import { requerirPerfil, urlDelSitio } from "@/lib/sesion";
import BotonUnirse from "@/components/BotonUnirse";
import FormularioEscuela from "@/components/FormularioEscuela";

export const metadata: Metadata = { title: "Mi escuela" };

type Escuela = { id: string; nombre: string; slug: string; ciudad: string | null; pais: string | null };

export default async function PaginaEscuela(props: PageProps<"/panel/escuela">) {
  const { supabase, perfil } = await requerirPerfil();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const rol = perfil.rol_principal!;

  if (rol !== "coach" && rol !== "alumno") {
    return <p className="tarjeta">Tu rol no pertenece a una escuela. Participas desde la comunidad.</p>;
  }

  const { data: membresias } = await supabase
    .from("escuela_miembros")
    .select("rol_en_escuela, escuelas(id, nombre, slug, ciudad, pais)")
    .eq("usuario_id", perfil.id);
  const mias = (membresias ?? []).map((m) => ({
    rol: m.rol_en_escuela as string,
    escuela: m.escuelas as unknown as Escuela,
  }));

  const { data: pendientes } = await supabase
    .from("solicitudes")
    .select("escuela_id")
    .eq("solicitante_id", perfil.id)
    .eq("estado", "pendiente");
  const idsPendientes = new Set((pendientes ?? []).map((p) => p.escuela_id));

  // Miembros de mis escuelas (alias públicos)
  const miembrosPorEscuela: Record<string, { alias: string | null; rol: string }[]> = {};
  for (const { escuela } of mias) {
    const { data: filas } = await supabase.from("escuela_miembros").select("usuario_id, rol_en_escuela").eq("escuela_id", escuela.id);
    const ids = (filas ?? []).map((f) => f.usuario_id);
    const { data: perfiles } = await supabase.rpc("perfiles_publicos", { p_ids: ids });
    const alias = new Map<string, string | null>((perfiles ?? []).map((p: { id: string; alias: string | null }) => [p.id, p.alias]));
    miembrosPorEscuela[escuela.id] = (filas ?? []).map((f) => ({ alias: alias.get(f.usuario_id) ?? null, rol: f.rol_en_escuela }));
  }

  let buscador = supabase.from("escuelas").select("id, nombre, slug, ciudad, pais").eq("estado", "activa").order("nombre").limit(24);
  if (q) buscador = buscador.ilike("nombre", `%${q.replace(/[%_]/g, "")}%`);
  const { data: disponibles } = await buscador;
  const idsMias = new Set(mias.map((m) => m.escuela.id));
  const lista = ((disponibles ?? []) as Escuela[]).filter((e) => !idsMias.has(e.id));

  const sitio = urlDelSitio();

  return (
    <div className="grid gap-8">
      <h1 className="text-3xl">Mi escuela</h1>

      {mias.map(({ rol: rolEn, escuela }) => (
        <section key={escuela.id} className="tarjeta grid gap-3">
          <div>
            <h2 className="text-2xl text-lava">{escuela.nombre}</h2>
            <p className="text-suave">
              {[escuela.ciudad, escuela.pais].filter(Boolean).join(", ") || "Sin ubicación"} · Tu rol: {rolEn === "dueno" ? "dueño" : rolEn}
            </p>
          </div>
          {(rolEn === "dueno" || rolEn === "coach") && (
            <p className="text-sm">
              Enlace de invitación:{" "}
              <code className="rounded bg-bg px-2 py-1 break-all">{`${sitio}/panel/escuela/${escuela.slug}`}</code>
            </p>
          )}
          <div>
            <h3 className="mb-1 text-lg">Integrantes</h3>
            <ul className="flex flex-wrap gap-2">
              {miembrosPorEscuela[escuela.id]?.map((m, i) => (
                <li key={i} className="rounded-full border border-borde px-3 py-1 text-sm">
                  @{m.alias ?? "anónimo"} · {m.rol === "dueno" ? "dueño" : m.rol}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      {rol === "coach" && mias.length === 0 && (
        <section className="tarjeta">
          <h2 className="text-2xl mb-3">Crea tu escuela</h2>
          <FormularioEscuela />
        </section>
      )}

      {mias.length === 0 && (
        <section className="grid gap-3">
          <h2 className="text-2xl">{rol === "coach" ? "…o súmate a una escuela existente" : "Encuentra tu escuela"}</h2>
          <form className="flex gap-2" action="/panel/escuela">
            <input className="campo" name="q" defaultValue={q} placeholder="Buscar por nombre" aria-label="Buscar escuela" />
            <button className="btn btn-borde">Buscar</button>
          </form>
          {lista.length === 0 ? (
            <p className="tarjeta text-suave">Todavía no hay escuelas que coincidan.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {lista.map((e) => (
                <li key={e.id} className="tarjeta flex items-center justify-between gap-3">
                  <div>
                    <Link href={`/panel/escuela/${e.slug}`} className="font-bold hover:text-lava">{e.nombre}</Link>
                    <p className="text-sm text-suave">{[e.ciudad, e.pais].filter(Boolean).join(", ")}</p>
                  </div>
                  <BotonUnirse escuelaId={e.id} yaPedida={idsPendientes.has(e.id)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
