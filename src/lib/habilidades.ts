// Árbol de habilidades y diario de progreso (fase 1.3). Los hitos salen de las tablas del nivelador (src/lib/nivelador.ts).
// Regla de oro: el diario NUNCA cambia el nivel; solo puede sugerir repetir el nivelador.
import type { Nivel } from "@/lib/catalogos";
import { CLAVES } from "@/lib/nivelador";

export type PatronClave = "piernas" | "empuje" | "core" | "traccion" | "resistencia";
export const PATRONES: PatronClave[] = ["piernas", "empuje", "core", "traccion", "resistencia"];

export type Hito = { nivel: Nivel; meta: number };
export type Habilidad = {
  clave: string;
  patron: PatronClave;
  unidad: "reps" | "seg";
  ventana: number | null;
  orden: number;
  campo_camara: string | null;
  hitos: Hito[];
};

export type EstadoVerif = "ninguna" | "en_proceso" | "comunidad" | "entrenador" | "en_duda";
export type ResumenVerif = { estado: EstadoVerif; validas: number; no_validas: number; sin_amistad: number; entrenador: boolean };
export type Visibilidad = "privado" | "amigos" | "comunidad";

export type MarcaDiario = {
  id: string;
  ejercicio: string;
  habilidad: string | null;
  valor: number;
  unidad: string;
  fecha: string;
  creado_en: string;
  nota: string | null;
  video_url: string | null;
  metodo: "declarado" | "camara";
  visibilidad: Visibilidad;
  verif: ResumenVerif;
  verificadores: { alias: string; rol: "entrenador" | "comunidad"; valida: boolean }[];
};

export const idxNivel = (n: string | null | undefined) => (n ? CLAVES.indexOf(n as Nivel) : -1);

/** Mayor nivel cuyo hito cumple el valor (−1 si no llega a ninguno). */
export function nivelAlcanzado(h: Habilidad, valor: number): number {
  let mejor = -1;
  for (const hito of h.hitos) if (valor >= hito.meta) mejor = Math.max(mejor, idxNivel(hito.nivel));
  return mejor;
}

export type NodoArbol = {
  h: Habilidad;
  mejor: MarcaDiario | null;
  /** índice del mayor hito alcanzado (−1 = ninguno) */
  alcanzado: number;
  /** cuántas marcas tiene */
  total: number;
};

export function armarArbol(habs: Habilidad[], marcas: MarcaDiario[]): Record<PatronClave, NodoArbol[]> {
  const por: Record<PatronClave, NodoArbol[]> = { piernas: [], empuje: [], core: [], traccion: [], resistencia: [] };
  for (const h of [...habs].sort((a, b) => a.orden - b.orden)) {
    const mias = marcas.filter((m) => m.habilidad === h.clave);
    const mejor = mias.reduce<MarcaDiario | null>((a, m) => (!a || m.valor > a.valor ? m : a), null);
    por[h.patron]?.push({ h, mejor, alcanzado: mejor ? nivelAlcanzado(h, mejor.valor) : -1, total: mias.length });
  }
  return por;
}

/**
 * ¿Alguna marca supera lo esperado para el nivel siguiente al actual? Entonces conviene repetir el nivelador.
 * Devuelve la habilidad y el nivel que mostró (o null). No cambia el nivel de nadie.
 */
export function sugerenciaNivelador(
  habs: Habilidad[],
  marcas: MarcaDiario[],
  nivelActual: string | null | undefined,
): { habilidad: string; nivel: Nivel } | null {
  const actual = idxNivel(nivelActual);
  if (actual < 0) return null;
  let mejor: { habilidad: string; nivel: Nivel; idx: number } | null = null;
  for (const h of habs) {
    for (const m of marcas) {
      if (m.habilidad !== h.clave) continue;
      const idx = nivelAlcanzado(h, m.valor);
      if (idx > actual && (!mejor || idx > mejor.idx)) mejor = { habilidad: h.clave, nivel: CLAVES[idx], idx };
    }
  }
  return mejor ? { habilidad: mejor.habilidad, nivel: mejor.nivel } : null;
}

/** Valor legible: 90 seg → «1:30», 45 reps → «45». */
export function formatoValor(valor: number, unidad: string): string {
  const v = Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace(/\.0$/, "");
  if (unidad === "seg" && valor >= 60) {
    const m = Math.floor(valor / 60);
    const s = Math.round(valor % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return v;
}

/** Id de video de YouTube (o null si el enlace no es válido). */
export function idYoutube(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/^(www\.|m\.)?(youtube\.com|youtu\.be)$/.test(u.hostname)) return null;
    if (u.hostname.endsWith("youtu.be")) return u.pathname.slice(1, 12) || null;
    if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/") || u.pathname.startsWith("/live/")) return u.pathname.split("/")[2]?.slice(0, 11) || null;
    return u.searchParams.get("v")?.slice(0, 11) ?? null;
  } catch {
    return null;
  }
}

export const REGEX_YOUTUBE = /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\/\S*$/i;
