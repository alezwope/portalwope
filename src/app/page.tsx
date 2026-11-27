import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import Cabecera from "@/components/Cabecera";
import FormularioAcceso from "@/components/FormularioAcceso";
import { NIVELES } from "@/lib/catalogos";
import { textos } from "@/lib/i18n/servidor";

/** La vitrina «Conoce UniBars» queda oculta hasta el lanzamiento (decisión de Alez). */
const MOSTRAR_VITRINA = false;

const contar = unstable_cache(
  async () => {
    try {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const [{ count: parques }, { count: entrenadores }] = await Promise.all([
        sb.from("parques").select("id", { count: "exact", head: true }),
        sb.from("paginas").select("id", { count: "exact", head: true }).eq("tipo", "entrenador").eq("estado", "activa"),
      ]);
      return { parques: parques ?? 0, entrenadores: entrenadores ?? 0 };
    } catch {
      return { parques: 0, entrenadores: 0 };
    }
  },
  ["contadores-puerta"],
  { revalidate: 600 },
);

export default async function Puerta(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const [{ t, idioma }, n] = await Promise.all([textos(), contar()]);
  const BENEFICIOS = [
    ["🗺️", "puerta.b1t", "puerta.b1"],
    ["🔥", "puerta.b2t", "puerta.b2"],
    ["🏛️", "puerta.b3t", "puerta.b3"],
    ["🤝", "puerta.b4t", "puerta.b4"],
  ] as const;
  const PRINCIPIOS = [
    ["puerta.p1t", "puerta.p1"],
    ["puerta.p2t", "puerta.p2"],
    ["puerta.p3t", "puerta.p3"],
  ] as const;

  return (
    <>
      <Cabecera />

      <main className="flex-1">
        {/* Entrada: como Facebook, la marca a la izquierda y el acceso a la derecha */}
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 md:grid-cols-[1.1fr_1fr] md:py-14">
          <div className="grid justify-items-center gap-4 text-center md:justify-items-start md:text-left">
            <Image
              src="/brand/isologo-640.webp"
              alt="UniBars, el universo de las barras"
              width={640}
              height={640}
              priority
              className="logo-fundido h-auto w-36 drop-shadow-[0_0_40px_rgba(255,85,0,0.25)] md:w-80"
            />
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-dorado">{t["marca.lema"]}</p>
            <h1 className="text-3xl leading-tight md:text-5xl">
              <span className="texto-fuego">{t["puerta.titulo"]}</span>
            </h1>
            <p className="max-w-md text-suave md:text-lg">{t["puerta.texto"]}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
              {MOSTRAR_VITRINA && (
                <Link href="/conoce" className="rounded-full border border-lava/50 bg-lava/10 px-4 py-1.5 text-sm font-bold text-lava">
                  ✨ {t["puerta.conoce"]}
                </Link>
              )}
              <Link href="/mapa" className="text-sm text-suave underline hover:text-texto">
                🗺️ {t["puerta.verMapa"]}
              </Link>
            </div>
            {n.parques > 0 && (
              <p className="text-sm text-suave">
                <strong className="num text-texto">{n.parques.toLocaleString(idioma)}</strong> {t["puerta.parques"]}
                {n.entrenadores > 0 && (
                  <> · <strong className="num text-texto">{n.entrenadores.toLocaleString(idioma)}</strong> {t["puerta.entrenadores"]}</>
                )}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
            <FormularioAcceso siguiente="/panel" modoInicial={sp.crear ? "crear" : "entrar"} />
            <p className="text-sm text-suave">{t["marca.by"]}</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFICIOS.map(([icono, titulo, texto]) => (
              <article key={titulo} className="tarjeta">
                <p className="text-3xl" aria-hidden>{icono}</p>
                <h2 className="my-2 text-lg text-lava">{t[titulo]}</h2>
                <p className="text-sm text-suave">{t[texto]}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6">
          <ol className="grid grid-cols-5 gap-2">
            {NIVELES.map((nv) => (
              <li key={nv.clave} className="tarjeta !px-1 !py-3 text-center" style={{ borderColor: nv.color }}>
                <p className="num text-xs text-suave">{nv.n}</p>
                <p className="titulo truncate text-[9px] tracking-normal sm:text-lg" style={{ color: nv.color }}>{nv.nombre}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="tarjeta grid gap-5 md:grid-cols-3">
            {PRINCIPIOS.map(([titulo, texto]) => (
              <div key={titulo}>
                <h2 className="mb-1 text-lg text-dorado">{t[titulo]}</h2>
                <p className="text-sm text-suave">{t[texto]}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-borde py-6 text-center text-xs text-suave">
        © {new Date().getFullYear()} UniBars · {t["marca.by"]} · {t["comun.mayores18"]}
        <br />
        {t["comun.osm"]}
      </footer>
    </>
  );
}
