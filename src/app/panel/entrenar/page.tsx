import type { Metadata } from "next";
import { textos } from "@/lib/i18n/servidor";
import Link from "next/link";
import { requerirPerfil } from "@/lib/sesion";
import { NIVELES } from "@/lib/catalogos";
import type { ClaveTexto } from "@/lib/i18n/diccionarios";
import Constancia from "@/components/Constancia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await textos()).t["entrenar.titulo"] };
}

export default async function Entrenar() {
  const { perfil } = await requerirPerfil();
  const { t } = await textos();
  const HERRAMIENTAS: { nombre: string; texto: string; estado: string; href?: string }[] = [
    { nombre: "CalisteniaGO", texto: t["entrenar.go"], estado: t["comun.pronto"] },
    { nombre: t["menu.entrenar.nivelador"], texto: t["entrenar.nivelador"], estado: t["entrenar.disponible"], href: "/nivelador" },
    { nombre: "City of Bars", texto: t["entrenar.city"], estado: t["comun.pronto"] },
    { nombre: "Calculadoras", texto: t["entrenar.calc"], estado: t["comun.pronto"] },
  ];
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl">{t["entrenar.titulo"]}</h1>

      <ol className="grid grid-cols-5 gap-2" aria-label={t["entrenar.niveles"]}>
        {NIVELES.map((n) => (
          <li
            key={n.clave}
            className={`tarjeta !p-2 text-center ${perfil.nivel === n.clave ? "!border-2" : "opacity-70"}`}
            style={{ borderColor: n.color }}
          >
            <p className="titulo text-sm sm:text-base" style={{ color: n.color }}>{n.nombre}</p>
            <p className="hidden text-xs text-suave sm:block">{t[`entrenar.etapa.${n.clave}` as ClaveTexto]}</p>
          </li>
        ))}
      </ol>

      <Constancia />

      <div className="grid gap-4 sm:grid-cols-2">
        {HERRAMIENTAS.map((h) => (
          <section key={h.nombre} className="tarjeta">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl text-lava">{h.nombre}</h2>
              <span className="rounded-full border border-borde px-2 py-0.5 text-xs text-suave">{h.estado}</span>
            </div>
            <p className="text-suave">{h.texto}</p>
            {h.href && <Link href={h.href} className="btn btn-lava mt-3 !py-1.5">{t["entrenar.abrir"]}</Link>}
          </section>
        ))}
      </div>

      <Link href="/panel/perfil#entrenamiento" className="btn btn-lava justify-self-start">{t["entrenar.marcas"]}</Link>
    </div>
  );
}
