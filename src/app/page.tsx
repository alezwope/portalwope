import Image from "next/image";
import Link from "next/link";
import Cabecera from "@/components/Cabecera";
import { obtenerMarca } from "@/lib/marca";
import { NIVELES } from "@/lib/catalogos";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 300;

const QUE_CONSIGUES = [
  { icono: "🗺️", titulo: "Parques cerca de ti", texto: "El mapa de parques de calistenia más completo, con check-in y cuánta gente está entrenando." },
  { icono: "💪", titulo: "CalisteniaGO", texto: "Un programa guiado nivel por nivel, de Génesis a Titán, a tu ritmo." },
  { icono: "🏋️", titulo: "Tu entrenador", texto: "Encuentra entrenador o únete al tuyo con un link. Tú decides qué datos compartes." },
  { icono: "🤝", titulo: "Tu comunidad", texto: "Logros reales, amigos y compañeros de barra. Sin ruido." },
];

async function contar() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    const [{ count: parques }, { count: entrenadores }] = await Promise.all([
      supabase.from("parques").select("id", { count: "exact", head: true }),
      supabase.from("paginas").select("id", { count: "exact", head: true }).eq("tipo", "entrenador").eq("estado", "activa"),
    ]);
    return { parques: parques ?? 0, entrenadores: entrenadores ?? 0 };
  } catch {
    return { parques: 0, entrenadores: 0 };
  }
}

export default async function Inicio() {
  const [marca, n] = await Promise.all([obtenerMarca(), contar()]);

  return (
    <>
      <Cabecera>
        <Link href="/entrar" className="btn btn-lava">Entrar</Link>
      </Cabecera>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2">
          <div className="grid gap-5">
            <p className="text-dorado font-bold tracking-widest text-sm uppercase">{marca.lema}</p>
            <h1 className="text-4xl md:text-5xl leading-tight">La red social de la calistenia.</h1>
            <p className="text-suave text-lg">
              Encuentra parques, entrena nivel por nivel y conecta con entrenadores y compañeros de barra. Gratis.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/entrar" className="btn btn-lava">Crear mi cuenta gratis</Link>
              <a href="#que-consigues" className="btn btn-borde">Qué consigues</a>
            </div>
            {n.parques > 0 && (
              <p className="text-sm text-suave">
                <Link href="/mapa" className="underline"><strong className="text-texto">{n.parques.toLocaleString("es")}</strong> parques ya en el mapa</Link>
                {n.entrenadores > 0 && <> · <strong className="text-texto">{n.entrenadores}</strong> entrenadores</>}
              </p>
            )}
          </div>
          <div className="flex justify-center">
            <Image src="/brand/isologo.webp" alt="UniBars, el universo de las barras" width={520} height={520} priority className="h-auto w-full max-w-md" />
          </div>
        </section>

        <section id="que-consigues" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
          <h2 className="text-3xl mb-6">Qué consigues aquí</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUE_CONSIGUES.map((c) => (
              <article key={c.titulo} className="tarjeta">
                <p className="text-3xl" aria-hidden>{c.icono}</p>
                <h3 className="text-xl text-lava my-2">{c.titulo}</h3>
                <p className="text-suave">{c.texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-3xl mb-2">Cinco niveles, un camino</h2>
          <p className="text-suave mb-6">Tu progreso se mide a tu manera: sin presión y sin castigos.</p>
          <ol className="grid gap-3 sm:grid-cols-5">
            {NIVELES.map((nv) => (
              <li key={nv.clave} className="tarjeta text-center" style={{ borderColor: nv.color }}>
                <p className="text-sm text-suave">Nivel {nv.n}</p>
                <p className="titulo text-xl" style={{ color: nv.color }}>{nv.nombre}</p>
                <p className="text-sm text-suave">{nv.etapa}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="tarjeta grid items-center gap-4 md:grid-cols-[2fr_1fr]">
            <div>
              <h2 className="text-2xl mb-2">¿Eres entrenador?</h2>
              <p className="text-suave">
                Crea tu cuenta y activa tu página de entrenador: ficha pública, solicitudes con el perfil de cada persona, escuela e
                invitaciones por link o QR. Hasta 100 alumnos gratis.
              </p>
            </div>
            <Link href="/entrar" className="btn btn-lava md:justify-self-end">Empezar gratis</Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="tarjeta grid gap-3 md:grid-cols-3">
            {[
              ["Hecha para entrenar", "No buscamos que pases horas aquí: entras, tienes lo que necesitas y vas a la barra."],
              ["Tus datos son tuyos", "Tú decides qué ve tu entrenador y puedes cortar el acceso cuando quieras."],
              ["Mérito, no dinero", "Nadie compra su lugar en las búsquedas: se gana con buenas reseñas y alumnos ayudados."],
            ].map(([t, d]) => (
              <div key={t}>
                <h3 className="text-xl text-dorado mb-1">{t}</h3>
                <p className="text-suave">{d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-borde py-6 text-center text-sm text-suave">
        © {new Date().getFullYear()} {marca.nombre} · WOPE Escuela de Calistenia · Solo para mayores de 18 años.
        <br />
        Datos de parques © colaboradores de OpenStreetMap (ODbL) y fuentes oficiales.
      </footer>
    </>
  );
}
