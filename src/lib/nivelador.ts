// Cálculo del Nivelador v2 (5 patrones). Código puro: se usa igual en el navegador y en el servidor.
// Tablas: plan-ejecucion-unibars-wope.md §3 (16/11 + silla y burpees del 27/11).
import type { Nivel } from "@/lib/catalogos";

export const VERSION = 2;

/** Pruebas que se pueden medir con la cámara: campo → ejercicio del motor. */
export const CAMARA: Record<string, { ejercicio: string; sostenido?: boolean; duracion?: number }> = {
  "piernas.reps": { ejercicio: "sentadilla", duracion: 60 },
  "piernas.silla": { ejercicio: "silla", sostenido: true },
  "piernas.pistolLibre": { ejercicio: "pistol" },
  "empuje.pared": { ejercicio: "flexpared" },
  "empuje.banco": { ejercicio: "flexbanco" },
  "empuje.piso": { ejercicio: "flexion" },
  "empuje.fondos": { ejercicio: "fondo" },
  "core.plancha": { ejercicio: "plancha", sostenido: true },
  "core.hollow": { ejercicio: "hollow", sostenido: true },
  "traccion.colgado": { ejercicio: "colgado", sostenido: true },
  "traccion.estatica": { ejercicio: "domest", sostenido: true },
  "traccion.dominadas": { ejercicio: "dominada" },
  "resistencia.medios": { ejercicio: "burpee", duracion: 60 },
  "resistencia.conFlexion": { ejercicio: "burpee", duracion: 60 },
};
export const CAMPOS_CAMARA = Object.keys(CAMARA);
export const CLAVES: Nivel[] = ["genesis", "fenix", "guerrero", "maestro", "titan"];
export const NOMBRE_NIVEL: Record<Nivel, string> = { genesis: "Génesis", fenix: "Fénix", guerrero: "Guerrero", maestro: "Maestro", titan: "Titán" };
export const N_PARQ = 7;

export type UltimoEntreno = "semana" | "mes" | "seis_meses" | "mas_seis" | "nunca";
export type ClavePatron = "piernas" | "empuje" | "core" | "traccion" | "resistencia";

export type Entradas = {
  parq: (boolean | null)[]; // true = Sí
  parqZona: string;
  edad: string;
  activo: boolean | null; // ¿cumples 150 min/semana de actividad moderada? (ACSM)
  ultimoEntreno: UltimoEntreno | "";
  percibido: Nivel | "";
  piernas: { omitir: boolean; completa: boolean; reps: number | null; silla: number | null; pistolAsistido: boolean; pistolLibre: number | null };
  empuje: { omitir: boolean; pared: number | null; banco: number | null; rodillas: number | null; piso: number | null; fondos: number | null; pino: boolean; pseudo: boolean };
  core: { omitir: boolean; plancha: number | null; hollow: number | null; lsit: number | null };
  traccion: { omitir: boolean; colgado: number | null; estatica: number | null; dominadas: number | null; muscleUp: boolean; frontLever: boolean };
  resistencia: { omitir: boolean; medios: number | null; conFlexion: number | null; pechoSalto: boolean };
  /** Campos medidos con la cámara (p. ej. "piernas.silla"). */
  camara?: string[];
};

export const ENTRADAS_VACIAS: Entradas = {
  parq: Array(N_PARQ).fill(null),
  parqZona: "",
  edad: "",
  activo: null,
  ultimoEntreno: "",
  percibido: "",
  piernas: { omitir: false, completa: true, reps: null, silla: null, pistolAsistido: false, pistolLibre: null },
  empuje: { omitir: false, pared: null, banco: null, rodillas: null, piso: null, fondos: null, pino: false, pseudo: false },
  core: { omitir: false, plancha: null, hollow: null, lsit: null },
  traccion: { omitir: false, colgado: null, estatica: null, dominadas: null, muscleUp: false, frontLever: false },
  resistencia: { omitir: false, medios: null, conFlexion: null, pechoSalto: false },
  camara: [],
};

/** Une lo guardado con la estructura actual (por si cambia la versión del formulario). */
export function completar(g: Partial<Entradas>): Entradas {
  const v = ENTRADAS_VACIAS;
  return {
    ...v, ...g,
    parq: Array.isArray(g.parq) && g.parq.length === N_PARQ ? g.parq : v.parq,
    piernas: { ...v.piernas, ...g.piernas }, empuje: { ...v.empuje, ...g.empuje }, core: { ...v.core, ...g.core },
    traccion: { ...v.traccion, ...g.traccion }, resistencia: { ...v.resistencia, ...g.resistencia },
    camara: Array.isArray(g.camara) ? g.camara : [],
  };
}

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** Corazón/presión (P1) o huesos/articulaciones (P6): se quitan silla y burpees por seguridad. */
export const sinImpacto = (e: Pick<Entradas, "parq">) => e.parq[0] === true || e.parq[5] === true;

// Cada prueba devuelve un índice 0..4 (Génesis..Titán).
export function nivelSentadilla(p: Entradas["piernas"]): number {
  if (!p.completa || n(p.reps) < 15) return 0;
  const r = n(p.reps);
  if (r < 30) return 1;
  if (r < 45) return 2;
  if (n(p.pistolLibre) >= 3) return 4;
  return p.pistolAsistido ? 3 : 2;
}
/** Silla en pared (segundos). <30 · 30-59 · 1'-1'59 · 2'-4'59 · ≥5'. */
export function nivelSilla(seg: number | null): number {
  const s = n(seg);
  if (s >= 300) return 4;
  if (s >= 120) return 3;
  if (s >= 60) return 2;
  if (s >= 30) return 1;
  return 0;
}
export function nivelEmpuje(e: Entradas["empuje"]): number {
  if (n(e.fondos) >= 12 && (e.pino || e.pseudo) && n(e.piso) >= 20) return 4;
  if (n(e.piso) >= 20 && n(e.fondos) >= 3) return 3;
  if (n(e.piso) >= 3) return 2;
  if (n(e.banco) >= 8 || n(e.rodillas) >= 8) return 1;
  return 0;
}
export function nivelCore(c: Entradas["core"]): number {
  const pl = n(c.plancha);
  if (pl >= 90 && n(c.hollow) >= 30 && n(c.lsit) >= 15) return 4;
  if (pl >= 90 && n(c.hollow) >= 30) return 3;
  if (pl >= 45) return 2;
  if (pl >= 20) return 1;
  return 0;
}
export function nivelTraccion(t: Entradas["traccion"]): number {
  if (n(t.dominadas) >= 8 && (t.muscleUp || t.frontLever)) return 4;
  if (n(t.dominadas) >= 1) return 3;
  if (n(t.colgado) >= 30 || n(t.estatica) >= 5) return 2;
  if (n(t.colgado) >= 10) return 1;
  return 0;
}
/** Burpees en 60". Medio ≥10 · con flexión 8-19 · 20-29 · ≥30 con pecho al piso + salto. */
export function nivelResistencia(r: Entradas["resistencia"]): number {
  const f = n(r.conFlexion);
  if (f >= 30 && r.pechoSalto) return 4;
  if (f >= 20) return 3;
  if (f >= 8) return 2;
  if (n(r.medios) >= 10 || f > 0) return 1;
  return 0;
}

export type Patron = { clave: ClavePatron; idx: number | null };
/** Aviso traducible: clave del diccionario (niv.av.*) y valores para sus marcadores. */
export type Aviso = { k: string; v?: Record<string, string | number> };
/** Destino en CalisteniaGO: claves niv.d.<destino>.e (etiqueta) y .d (detalle). */
export type Destino = "genesis" | "fenix" | "g21" | "g22" | "g23" | "maestro" | "titan";

export type Resultado = {
  version: number;
  nivel: Nivel;
  subnivel: "2.1" | "2.2" | "2.3" | null;
  patrones: Patron[];
  atrasados: ClavePatron[];
  avisos: Aviso[];
  parqAlerta: boolean;
  inicioReducido: boolean;
  destino: Destino;
};

const ORDEN_DESTINOS: Destino[] = ["genesis", "fenix", "g21", "g22", "g23", "maestro", "titan"];

export function calcular(e: Entradas): { ok: true; r: Resultado } | { ok: false; error: string } {
  const impacto = sinImpacto(e);
  const avisos: Aviso[] = [];

  // Piernas: manda el menor entre sentadilla y silla. Sin silla, como máximo Guerrero.
  let piernas: number | null = null;
  if (!e.piernas.omitir) {
    piernas = nivelSentadilla(e.piernas);
    if (!impacto && e.piernas.silla !== null) piernas = Math.min(piernas, nivelSilla(e.piernas.silla));
    else if (piernas > 2) {
      piernas = 2;
      if (!impacto) avisos.push({ k: "niv.av.silla" });
    }
  }
  const resistencia = impacto || e.resistencia.omitir ? null : nivelResistencia(e.resistencia);

  const patrones: Patron[] = [
    { clave: "piernas", idx: piernas },
    { clave: "empuje", idx: e.empuje.omitir ? null : nivelEmpuje(e.empuje) },
    { clave: "core", idx: e.core.omitir ? null : nivelCore(e.core) },
    { clave: "traccion", idx: e.traccion.omitir ? null : nivelTraccion(e.traccion) },
    { clave: "resistencia", idx: resistencia },
  ];
  const medidos = patrones.filter((p) => p.idx !== null).map((p) => p.idx as number);
  if (e.parq.some((x) => x === null)) return { ok: false, error: "niv.err.parq" };
  if (medidos.length < 4) return { ok: false, error: impacto ? "niv.err.patronesImpacto" : "niv.err.patrones" };

  // Nivel más alto alcanzado por al menos 4 patrones.
  let idx = 0;
  for (let L = 4; L >= 0; L--) {
    if (medidos.filter((m) => m >= L).length >= 4) { idx = L; break; }
  }
  const idxBruto = idx;
  // Nunca más de 1 por encima del patrón más bajo.
  idx = Math.min(idx, Math.min(...medidos) + 1);
  // Para Maestro y Titán se miden los 5 (Resistencia es obligatoria).
  if (medidos.length < 5 && idx > 2) {
    avisos.push({ k: impacto ? "niv.av.impacto" : "niv.av.omitido" });
    idx = 2;
  }

  const parqAlerta = e.parq.some((x) => x === true);
  if (parqAlerta) {
    if (idx > 1) idx = 1;
    avisos.push({ k: "niv.av.parq", v: { zona: e.parq[5] && e.parqZona.trim() ? ` (${e.parqZona.trim()})` : "" } });
  }

  const nivel = CLAVES[idx];

  // Subnivel de Guerrero según el empuje.
  let subnivel: Resultado["subnivel"] = null;
  if (nivel === "guerrero") {
    const piso = n(e.empuje.piso);
    subnivel = e.empuje.omitir || piso < 8 ? "2.1" : piso < 14 ? "2.2" : "2.3";
  }
  let destino: Destino = nivel === "guerrero" ? (subnivel === "2.1" ? "g21" : subnivel === "2.2" ? "g22" : "g23") : nivel;

  // Arranque suave: sin entrenar hace tiempo o sin la actividad mínima recomendada.
  const largoDescanso = e.ultimoEntreno === "mas_seis" || e.ultimoEntreno === "nunca";
  const inicioReducido = idx >= 2 && (largoDescanso || e.activo === false);
  if (inicioReducido) {
    destino = ORDEN_DESTINOS[Math.max(0, ORDEN_DESTINOS.indexOf(destino) - 1)];
    avisos.push({ k: "niv.av.inicio" });
  }

  const atrasados = patrones.filter((p) => p.idx !== null && p.idx <= idxBruto - 2).map((p) => p.clave);
  if (atrasados.length) avisos.push({ k: "niv.av.atrasado", v: { lista: atrasados.join(",") } });

  return { ok: true, r: { version: VERSION, nivel, subnivel, patrones, atrasados, avisos, parqAlerta, inicioReducido, destino } };
}

/** Limpia entradas llegadas del navegador: tipos y rangos razonables. */
export function sanear(x: unknown): Entradas | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const num = (v: unknown, max = 600) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), max) : null);
  const bool = (v: unknown) => v === true;
  const g = (k: string) => (o[k] && typeof o[k] === "object" ? (o[k] as Record<string, unknown>) : {});
  const pi = g("piernas"), em = g("empuje"), co = g("core"), tr = g("traccion"), re = g("resistencia");
  if (!Array.isArray(o.parq) || o.parq.length !== N_PARQ) return null;
  return {
    parq: o.parq.map((v: unknown) => (v === true ? true : v === false ? false : null)),
    parqZona: String(o.parqZona ?? "").slice(0, 120),
    edad: String(o.edad ?? "").slice(0, 10),
    activo: o.activo === true ? true : o.activo === false ? false : null,
    ultimoEntreno: ["semana", "mes", "seis_meses", "mas_seis", "nunca"].includes(o.ultimoEntreno) ? o.ultimoEntreno : "",
    percibido: CLAVES.includes(o.percibido) ? o.percibido : "",
    piernas: { omitir: bool(pi.omitir), completa: pi.completa !== false, reps: num(pi.reps), silla: num(pi.silla, 600), pistolAsistido: bool(pi.pistolAsistido), pistolLibre: num(pi.pistolLibre) },
    empuje: { omitir: bool(em.omitir), pared: num(em.pared), banco: num(em.banco), rodillas: num(em.rodillas), piso: num(em.piso), fondos: num(em.fondos), pino: bool(em.pino), pseudo: bool(em.pseudo) },
    core: { omitir: bool(co.omitir), plancha: num(co.plancha), hollow: num(co.hollow), lsit: num(co.lsit) },
    traccion: { omitir: bool(tr.omitir), colgado: num(tr.colgado), estatica: num(tr.estatica), dominadas: num(tr.dominadas), muscleUp: bool(tr.muscleUp), frontLever: bool(tr.frontLever) },
    resistencia: { omitir: bool(re.omitir), medios: num(re.medios, 120), conFlexion: num(re.conFlexion, 120), pechoSalto: bool(re.pechoSalto) },
    camara: Array.isArray(o.camara) ? o.camara.filter((c: unknown) => typeof c === "string" && CAMPOS_CAMARA.includes(c)).slice(0, 20) : [],
  };
}
