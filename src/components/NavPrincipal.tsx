"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Enlace = { href: string; texto: string; icono: string; exacto?: boolean };

const PERSONAL: Enlace[] = [
  { href: "/panel", texto: "Inicio", icono: "🏠", exacto: true },
  { href: "/panel/mapa", texto: "Mapa", icono: "🗺️" },
  { href: "/panel/entrenar", texto: "Entrenar", icono: "💪" },
  { href: "/panel/comunidad", texto: "Comunidad", icono: "🤝" },
  { href: "/panel/perfil", texto: "Perfil", icono: "👤" },
];

const ENTRENADOR: Enlace[] = [
  { href: "/panel/entrenador", texto: "Solicitudes", icono: "📥", exacto: true },
  { href: "/panel/entrenador/alumnos", texto: "Alumnos", icono: "🧑‍🤝‍🧑" },
  { href: "/panel/entrenador/escuela", texto: "Escuela", icono: "🏫" },
  { href: "/panel/entrenador/invitar", texto: "Invitar", icono: "🔗" },
  { href: "/panel/entrenador/ficha", texto: "Ficha", icono: "📝" },
];

export default function NavPrincipal() {
  const ruta = usePathname();
  const modoEntrenador = ruta.startsWith("/panel/entrenador");
  const enlaces = modoEntrenador ? ENTRENADOR : PERSONAL;
  const activo = (e: Enlace) => (e.exacto ? ruta === e.href : ruta === e.href || ruta.startsWith(e.href + "/"));

  return (
    <nav
      aria-label={modoEntrenador ? "Menú de entrenador" : "Menú principal"}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-bg/95 backdrop-blur md:static md:border-b md:border-t-0"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-5 md:flex md:max-w-6xl md:gap-1 md:px-4 md:py-2">
        {enlaces.map((e) => (
          <li key={e.href}>
            <Link
              href={e.href}
              aria-current={activo(e) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 px-1 py-2 text-xs md:flex-row md:gap-2 md:rounded-lg md:px-3 md:text-sm ${
                activo(e) ? "text-lava font-bold md:bg-card" : "text-suave hover:text-texto"
              }`}
            >
              <span aria-hidden className="text-lg md:text-base">{e.icono}</span>
              {e.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
