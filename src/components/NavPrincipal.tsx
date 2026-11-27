"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTextos } from "@/components/Idioma";
import type { ClaveTexto } from "@/lib/i18n/diccionarios";

type Enlace = { href: string; texto: ClaveTexto; icono: string; exacto?: boolean };

const PERSONAL: Enlace[] = [
  { href: "/panel", texto: "barra.inicio", icono: "🔥", exacto: true },
  { href: "/panel/mapa", texto: "barra.mapa", icono: "🗺️" },
  { href: "/panel/entrenar", texto: "barra.entrenar", icono: "🎯" },
  { href: "/panel/comunidad", texto: "barra.comunidad", icono: "🤝" },
  { href: "/panel/perfil", texto: "barra.yo", icono: "👤" },
];

const ENTRENADOR: Enlace[] = [
  { href: "/panel/entrenador", texto: "ent.solicitudes", icono: "📥", exacto: true },
  { href: "/panel/entrenador/alumnos", texto: "ent.alumnos", icono: "🧑‍🤝‍🧑" },
  { href: "/panel/entrenador/escuela", texto: "ent.escuela", icono: "🏛️" },
  { href: "/panel/entrenador/invitar", texto: "ent.invitar", icono: "🔗" },
];

/** Barra inferior del teléfono. En modo entrenador muestra las herramientas de la escuela. */
export default function NavPrincipal() {
  const { t } = useTextos();
  const ruta = usePathname();
  const modoEntrenador = ruta.startsWith("/panel/entrenador");
  const enlaces = modoEntrenador ? ENTRENADOR : PERSONAL;
  const activo = (e: Enlace) => (e.exacto ? ruta === e.href : ruta === e.href || ruta.startsWith(e.href + "/"));

  return (
    <nav aria-label={t["app.menu"]} className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-bg pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className={`mx-auto grid max-w-lg ${modoEntrenador ? "grid-cols-4" : "grid-cols-5"}`}>
        {enlaces.map((e) => (
          <li key={e.href}>
            <Link
              href={e.href}
              aria-current={activo(e) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] ${activo(e) ? "font-bold text-lava" : "text-suave"}`}
            >
              <span aria-hidden className={`text-lg ${activo(e) ? "" : "grayscale-[60%]"}`}>{e.icono}</span>
              {t[e.texto]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
