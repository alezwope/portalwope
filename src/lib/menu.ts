import type { ClaveTexto } from "@/lib/i18n/diccionarios";

/**
 * Menú de persianas de UniBars (plantilla definitiva).
 * Lo que aún no existe apunta a /panel/pronto/<clave>: nunca hay pantallas rotas.
 * Para sumar una pantalla nueva: cambiar su `href` y quitar `pronto`.
 */
export type ItemMenu = { clave: string; texto: ClaveTexto; href: string; pronto?: string; soloEntrenador?: boolean; sinEntrenador?: boolean };
export type SeccionMenu = { clave: string; icono: string; texto: ClaveTexto; items: ItemMenu[] };

const pronto = (clave: string, fase: string) => ({ href: `/panel/pronto/${clave}`, pronto: fase });

export const MENU: SeccionMenu[] = [
  {
    clave: "universo", icono: "🔥", texto: "menu.universo",
    items: [
      { clave: "inicio", texto: "menu.universo.inicio", href: "/panel" },
      { clave: "comunidad", texto: "menu.universo.comunidad", href: "/panel/comunidad" },
      { clave: "crews", texto: "menu.universo.crews", href: "/panel/crews" },
      { clave: "eventos", texto: "menu.universo.eventos", href: "/panel/eventos" },
      { clave: "calisbro", texto: "menu.universo.calisbro", href: "/panel/calisbro" },
      { clave: "mensajes", texto: "menu.universo.mensajes", href: "/panel/mensajes" },
    ],
  },
  {
    clave: "mapa", icono: "🗺️", texto: "menu.mapa",
    items: [
      { clave: "mapa-vivo", texto: "menu.mapa.vivo", href: "/panel/mapa" },
      { clave: "mapa-publico", texto: "menu.mapa.publico", href: "/mapa" },
    ],
  },
  {
    clave: "entrenar", icono: "🎯", texto: "menu.entrenar",
    items: [
      { clave: "entrenar", texto: "menu.entrenar.mio", href: "/panel/entrenar" },
      { clave: "nivelador", texto: "menu.entrenar.nivelador", href: "/nivelador" },
      { clave: "diario", texto: "menu.entrenar.diario", href: "/panel/progreso" },
      { clave: "verificar", texto: "menu.entrenar.verificar", href: "/panel/progreso/verificar" },
      { clave: "snack", texto: "menu.entrenar.snack", ...pronto("snack", "1.3") },
      { clave: "programas", texto: "menu.entrenar.programas", ...pronto("programas", "1.5") },
    ],
  },
  {
    clave: "retos", icono: "⚔️", texto: "menu.retos",
    items: [
      { clave: "retos-barrio", texto: "menu.retos.barrio", ...pronto("retos-barrio", "Etapa 2") },
      { clave: "batalla", texto: "menu.retos.batalla", ...pronto("batalla", "Etapa 2") },
      { clave: "arcade", texto: "menu.retos.arcade", ...pronto("arcade", "Etapa 2") },
    ],
  },
  {
    clave: "escuela", icono: "🏛️", texto: "menu.escuela",
    items: [
      { clave: "mis-entrenadores", texto: "menu.escuela.mis", href: "/panel/comunidad#mis-entrenadores" },
      { clave: "buscar-entrenador", texto: "menu.escuela.buscar", href: "/panel/comunidad#buscar-entrenador" },
      { clave: "panel-entrenador", texto: "menu.escuela.panel", href: "/panel/entrenador", soloEntrenador: true },
      { clave: "crear-pagina", texto: "menu.escuela.crear", href: "/panel/perfil#paginas", sinEntrenador: true },
    ],
  },
  {
    clave: "yo", icono: "👤", texto: "menu.yo",
    items: [
      { clave: "perfil", texto: "menu.yo.perfil", href: "/panel/u/@" },
      { clave: "editar", texto: "menu.yo.editar", href: "/panel/perfil" },
      { clave: "avisos", texto: "menu.yo.avisos", href: "/panel/notificaciones" },
      { clave: "sugerencias", texto: "menu.yo.sugerencias", href: "/panel/sugerencias" },
    ],
  },
];

/** Busca un ítem «próximamente» por su clave (para la pantalla /panel/pronto/[clave]). */
export function itemPronto(clave: string) {
  for (const s of MENU) for (const i of s.items) if (i.clave === clave && i.pronto) return { seccion: s, item: i };
  return null;
}
