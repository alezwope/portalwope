import Image from "next/image";
import Link from "next/link";
import Cabecera from "@/components/Cabecera";
import { obtenerMarca } from "@/lib/marca";
import { NIVELES, ROLES, ROLES_ELEGIBLES } from "@/lib/roles";

export const revalidate = 300;

export default async function Inicio() {
  const marca = await obtenerMarca();

  return (
    <>
      <Cabecera>
        <Link href="/entrar" className="btn btn-lava">Entrar</Link>
      </Cabecera>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2">
          <div className="grid gap-5">
            <p className="text-dorado font-bold tracking-widest text-sm uppercase">{marca.lema}</p>
            <h1 className="text-4xl md:text-5xl leading-tight">
              La red social de la calistenia, en un solo lugar.
            </h1>
            <p className="text-suave text-lg">
              Escuelas, coaches, alumnos y atletas conectados. Entrena a tu ritmo, sube de nivel y encuentra
              parques de calistenia en todo el mundo. Aquí te acompañamos, no te exigimos.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/entrar" className="btn btn-lava">Crear mi cuenta</Link>
              <a href="#roles" className="btn btn-borde">Cómo funciona</a>
            </div>
          </div>
          <div className="flex justify-center">
            <Image src="/brand/isologo.webp" alt="UniBars, el universo de las barras" width={520} height={520} priority className="h-auto w-full max-w-md" />
          </div>
        </section>

        <section id="roles" className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-3xl mb-6">Un universo, cinco formas de pertenecer</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES_ELEGIBLES.map((r) => (
              <article key={r} className="tarjeta">
                <h3 className="text-xl text-lava mb-2">{ROLES[r].nombre}</h3>
                <p className="text-suave">{ROLES[r].resumen}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-3xl mb-2">Cinco niveles, un camino</h2>
          <p className="text-suave mb-6">Tu progreso se mide a tu manera: sin presión y sin castigos.</p>
          <ol className="grid gap-3 sm:grid-cols-5">
            {NIVELES.map((n) => (
              <li key={n.n} className="tarjeta text-center" style={{ borderColor: n.color }}>
                <p className="text-sm text-suave">Nivel {n.n}</p>
                <p className="titulo text-xl" style={{ color: n.color }}>{n.nombre}</p>
                <p className="text-sm text-suave">{n.etapa}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="tarjeta grid gap-3 md:grid-cols-3">
            {[
              ["Libertad", "Registrar tu progreso es siempre opcional. Lo parcial también vale."],
              ["Sin presión", "Los avisos son amables. Nunca se bloquea tu cuenta por una cuota."],
              ["Comunidad primero", "Familia y diversión por encima del músculo."],
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
