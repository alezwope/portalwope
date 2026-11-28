import type { Metadata } from "next";
import { textos } from "@/lib/i18n/servidor";
import { rellenar } from "@/lib/i18n/diccionarios";
import Link from "next/link";
import { requerirPerfil } from "@/lib/sesion";
import { MODALIDADES, NIVELES, nivelDe, type Nivel } from "@/lib/catalogos";
import ControlVinculo from "@/components/ControlVinculo";
import Amigos from "@/components/Amigos";
import type { MisAmigos } from "@/lib/social";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["comunidad.titulo"] };
}

type FichaEntrenador = {
  id: string; nombre: string; slug: string; ciudad: string | null; pais: string | null;
  bio: string | null; modalidades: string[]; atiende_niveles: string[];
};

export default async function Comunidad(props: PageProps<"/panel/comunidad">) {
  const { supabase, perfil } = await requerirPerfil();
  const { t } = await textos();
  const ESTADO_VINCULO: Record<string, string> = { solicitud: t["comunidad.solicitud"], aceptado: t["comunidad.aceptado"] };
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60).replace(/[%_,()]/g, "") : "";
  const soloMiNivel = sp.nivel === "mio" && !!perfil.nivel;

  const { data: mios } = await supabase
    .from("vinculos")
    .select("id, estado, comparte_medidas, comparte_salud, paginas(nombre, slug, tipo)")
    .eq("persona_id", perfil.id)
    .in("estado", ["solicitud", "aceptado"])
    .order("creado_en", { ascending: false });

  const { data: amigos } = await supabase.rpc("mis_amigos");

  let consulta = supabase
    .from("paginas")
    .select("id, nombre, slug, ciudad, pais, bio, modalidades, atiende_niveles")
    .eq("tipo", "entrenador")
    .eq("estado", "activa")
    .order("creado_en", { ascending: false })
    .limit(30);
  if (q) consulta = consulta.or(`nombre.ilike.%${q}%,ciudad.ilike.%${q}%`);
  if (soloMiNivel) consulta = consulta.contains("atiende_niveles", [perfil.nivel!]);
  const { data: entrenadores } = await consulta;

  return (
    <div className="grid gap-8">
      <h1 className="text-3xl">{t["comunidad.titulo"]}</h1>

      {(mios ?? []).length > 0 && (
        <section id="mis-entrenadores" className="grid scroll-mt-24 gap-3">
          <h2 className="text-2xl">{t["comunidad.mis"]}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {(mios ?? []).map((v) => {
              const p = v.paginas as unknown as { nombre: string; slug: string };
              return (
                <li key={v.id} className="tarjeta grid gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/e/${p.slug}`} className="font-bold hover:text-lava">{p.nombre}</Link>
                    <span className="rounded-full border border-borde px-2 py-0.5 text-xs">{ESTADO_VINCULO[v.estado]}</span>
                  </div>
                  <ControlVinculo id={v.id} estado={v.estado} medidas={v.comparte_medidas} salud={v.comparte_salud} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Amigos inicial={(amigos ?? { amigos: [], recibidas: [], enviadas: [] }) as MisAmigos} />

      <section id="buscar-entrenador" className="grid scroll-mt-24 gap-3">
        <h2 className="text-2xl">{t["comunidad.encuentra"]}</h2>
        <form className="flex flex-wrap gap-2" action="/panel/comunidad">
          <input className="campo max-w-sm" name="q" defaultValue={q} placeholder={t["comunidad.placeholder"]} aria-label={t["comunidad.buscarAria"]} />
          {perfil.nivel && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="nivel" value="mio" defaultChecked={soloMiNivel} className="accent-[var(--lava)]" />
              {t["comunidad.soloNivel"]}
            </label>
          )}
          <button className="btn btn-borde">{t["comunidad.buscar"]}</button>
        </form>
        {(entrenadores ?? []).length === 0 ? (
          <p className="tarjeta text-suave">{t["comunidad.vacio"]}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {((entrenadores ?? []) as FichaEntrenador[]).map((e) => (
              <li key={e.id}>
                <Link href={`/e/${e.slug}`} className="tarjeta grid gap-1 hover:!border-lava">
                  <span className="font-bold text-lg">{e.nombre}</span>
                  <span className="text-sm text-suave">
                    {[e.ciudad, e.pais].filter(Boolean).join(", ") || t["comunidad.sinUbicacion"]}
                    {e.modalidades.length > 0 && " · " + e.modalidades.map((m) => MODALIDADES[m as keyof typeof MODALIDADES]).join(", ")}
                  </span>
                  {e.atiende_niveles.length > 0 && (
                    <span className="flex flex-wrap gap-1 text-xs">
                      {NIVELES.filter((n) => e.atiende_niveles.includes(n.clave)).map((n) => (
                        <span key={n.clave} className="rounded-full border px-2" style={{ borderColor: n.color, color: n.color }}>{n.nombre}</span>
                      ))}
                    </span>
                  )}
                  {e.bio && <span className="line-clamp-2 text-sm text-suave">{e.bio}</span>}
                  {perfil.nivel && e.atiende_niveles.length > 0 && !e.atiende_niveles.includes(perfil.nivel) && (
                    <span className="text-xs text-dorado">{rellenar(t["comunidad.noNivel"], { nivel: nivelDe(perfil.nivel as Nivel)?.nombre ?? "" })}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tarjeta">
        <h2 className="text-xl mb-1">{t["comunidad.pronto"]}</h2>
        <p className="text-suave">{t["comunidad.prontoTexto"]}</p>
      </section>
    </div>
  );
}
