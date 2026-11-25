import type { Metadata } from "next";
import Link from "next/link";
import { requerirPerfil } from "@/lib/sesion";
import { NIVELES } from "@/lib/catalogos";

export const metadata: Metadata = { title: "Entrenar" };

const HERRAMIENTAS = [
  { nombre: "CalisteniaGO", texto: "Tu programa guiado, nivel por nivel, de Génesis a Titán.", estado: "Próximamente", href: undefined as string | undefined },
  { nombre: "Nivelador", texto: "Descubre tu nivel con unas pocas pruebas.", estado: "Disponible", href: "/nivelador" as string | undefined },
  { nombre: "City of Bars", texto: "Construye tu ciudad entrenando de verdad.", estado: "Próximamente", href: undefined as string | undefined },
  { nombre: "Calculadoras", texto: "IMC y más, con los datos de tu perfil.", estado: "Próximamente", href: undefined as string | undefined },
];

export default async function Entrenar() {
  const { perfil } = await requerirPerfil();
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl">Entrenar</h1>

      <ol className="grid grid-cols-5 gap-2" aria-label="Niveles">
        {NIVELES.map((n) => (
          <li
            key={n.clave}
            className={`tarjeta !p-2 text-center ${perfil.nivel === n.clave ? "!border-2" : "opacity-70"}`}
            style={{ borderColor: n.color }}
          >
            <p className="titulo text-sm sm:text-base" style={{ color: n.color }}>{n.nombre}</p>
            <p className="hidden text-xs text-suave sm:block">{n.etapa}</p>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 sm:grid-cols-2">
        {HERRAMIENTAS.map((h) => (
          <section key={h.nombre} className="tarjeta">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl text-lava">{h.nombre}</h2>
              <span className="rounded-full border border-borde px-2 py-0.5 text-xs text-suave">{h.estado}</span>
            </div>
            <p className="text-suave">{h.texto}</p>
            {h.href && <Link href={h.href} className="btn btn-lava mt-3 !py-1.5">Abrir</Link>}
          </section>
        ))}
      </div>

      <Link href="/panel/perfil#entrenamiento" className="btn btn-lava justify-self-start">Registrar mis marcas</Link>
    </div>
  );
}
