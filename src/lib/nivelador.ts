// Cálculo del Nivelador (versión declarada). Código puro: se usa igual en el navegador y en el servidor.
import type { Nivel } from "@/lib/catalogos";

export const CLAVES: Nivel[] = ["genesis", "fenix", "guerrero", "maestro", "titan"];
export const NOMBRE_NIVEL: Record<Nivel, string> = { genesis: "Génesis", fenix: "Fénix", guerrero: "Guerrero", maestro: "Maestro", titan: "Titán" };

export const PARQ = [
  "¿Un médico te dijo alguna vez que tienes un problema del corazón o presión arterial alta?",
  "¿Sientes dolor en el pecho en reposo, en tu vida diaria o cuando haces actividad física?",
  "¿Has perdido el equilibrio por mareos o perdido el conocimiento en los últimos 12 meses?",
  "¿Te diagnosticaron otra condición médica crónica (distinta de corazón o presión)?",
  "¿Tomas medicamentos recetados para una condición médica crónica?",
  "¿Tienes (o tuviste en los últimos 12 meses) un problema de huesos, articulaciones o tejidos blandos que podría empeorar al hacer más actividad?",
  "¿Un médico te dijo que solo debes hacer actividad física bajo supervisión médica?",
] as const;

export type UltimoEntreno = "semana" | "mes" | "seis_meses" | "mas_seis" | "nunca";

export type Entradas = {
  parq: (boolean | null)[]; // true = Sí
  parqZona: string;
  edad: string;
  activo: boolean | null; // ¿cumples 150 min/semana de actividad moderada? (ACSM)
  ultimoEntreno: UltimoEntreno | "";
  percibido: Nivel | "";
  piernas: { omitir: boolean; completa: boolean; reps: number | null; pistolAsistido: boolean; pistolLibre: number | null };
  empuje: { omitir: boolean; pared: number | null; banco: number | null; rodillas: number | null; piso: number | null; fondos: number | null; pino: boolean; pseudo: boolean };
  core: { omitir: boolean; plancha: number | null; hollow: number | null; lsit: number | null };
  traccion: { omitir: boolean; colgado: number | null; estatica: number | null; dominadas: number | null; muscleUp: boolean; frontLever: boolean };
};

export const ENTRADAS_VACIAS: Entradas = {
  parq: Array(7).fill(null),
  parqZona: "",
  edad: "",
  activo: null,
  ultimoEntreno: "",
  percibido: "",
  piernas: { omitir: false, completa: true, reps: null, pistolAsistido: false, pistolLibre: null },
  empuje: { omitir: false, pared: null, banco: null, rodillas: null, piso: null, fondos: null, pino: false, pseudo: false },
  core: { omitir: false, plancha: null, hollow: null, lsit: null },
  traccion: { omitir: false, colgado: null, estatica: null, dominadas: null, muscleUp: false, frontLever: false },
};

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

// Cada patrón devuelve un índice 0..4 (Génesis..Titán).
export function nivelPiernas(p: Entradas["piernas"]): number {
  if (!p.completa || n(p.reps) < 15) return 0;
  const r = n(p.reps);
  if (r < 30) return 1;
  if (r < 45) return 2;
  if (n(p.pistolLibre) >= 3) return 4;
  return p.pistolAsistido ? 3 : 2;
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

export type Patron = { clave: "piernas" | "empuje" | "core" | "traccion"; nombre: string; idx: number | null };
export type Destino = { etiqueta: string; detalle: string };

export type Resultado = {
  nivel: Nivel;
  subnivel: "2.1" | "2.2" | "2.3" | null;
  patrones: Patron[];
  atrasados: string[];
  avisos: string[];
  parqAlerta: boolean;
  inicioReducido: boolean;
  destino: Destino;
};

const DESTINOS: Record<string, Destino> = {
  genesis: { etiqueta: "Nivel 1 · Despertar", detalle: "Empiezas por el principio, con calma. Al terminarlo sigues al Nivel 2 · Echar raíces." },
  fenix: { etiqueta: "Nivel 3 · Resurgir", detalle: "Ya tienes base: toca construir fuerza y control." },
  g21: { etiqueta: "Nivel 6 · Primeras flexiones", detalle: "Subnivel Guerrero 2.1." },
  g22: { etiqueta: "Nivel 7", detalle: "Subnivel Guerrero 2.2." },
  g23: { etiqueta: "Niveles 8-9", detalle: "Subnivel Guerrero 2.3." },
  maestro: { etiqueta: "Niveles 10-13", detalle: "Parte en el Nivel 10 y avanza hasta el 12-13." },
  titan: { etiqueta: "Programas por truco", detalle: "Eliges la habilidad que quieres dominar (planche, front lever, muscle up…)." },
};
const ORDEN_DESTINOS = ["genesis", "fenix", "g21", "g22", "g23", "maestro", "titan"];

export function calcular(e: Entradas): { ok: true; r: Resultado } | { ok: false; error: string } {
  const patrones: Patron[] = [
    { clave: "piernas", nombre: "Piernas", idx: e.piernas.omitir ? null : nivelPiernas(e.piernas) },
    { clave: "empuje", nombre: "Empuje", idx: e.empuje.omitir ? null : nivelEmpuje(e.empuje) },
    { clave: "core", nombre: "Core", idx: e.core.omitir ? null : nivelCore(e.core) },
    { clave: "traccion", nombre: "Tracción", idx: e.traccion.omitir ? null : nivelTraccion(e.traccion) },
  ];
  const medidos = patrones.filter((p) => p.idx !== null).map((p) => p.idx as number);
  if (medidos.length < 3) return { ok: false, error: "Necesitamos al menos 3 de los 4 patrones para calcular tu nivel." };
  if (e.parq.some((x) => x === null)) return { ok: false, error: "Responde las 7 preguntas de salud (Sí o No)." };

  const avisos: string[] = [];
  const sinMedirTodo = medidos.length < 4;

  // Nivel más alto alcanzado por al menos 3 patrones.
  let idx = 0;
  for (let L = 4; L >= 0; L--) {
    if (medidos.filter((m) => m >= L).length >= 3) {
      idx = L;
      break;
    }
  }
  const idxBruto = idx;
  // Nunca más de 1 por encima del patrón más bajo.
  idx = Math.min(idx, Math.min(...medidos) + 1);
  if (sinMedirTodo) {
    if (idx > 2) avisos.push("Como no mediste los 4 patrones, tu nivel queda como máximo en Guerrero. Mide el que falta para poder subir.");
    idx = Math.min(idx, 2);
  }

  const parqAlerta = e.parq.some((x) => x === true);
  if (parqAlerta) {
    if (idx > 1) idx = 1;
    avisos.push(
      "Respondiste Sí en alguna pregunta de salud. Te dejamos como máximo en Fénix. Antes de entrenar más fuerte consulta con un profesional de la salud" +
        (e.parq[5] && e.parqZona.trim() ? ` (zona que indicaste: ${e.parqZona.trim()})` : "") +
        ".",
    );
  }

  const nivel = CLAVES[idx];

  // Subnivel de Guerrero según el empuje.
  let subnivel: Resultado["subnivel"] = null;
  if (nivel === "guerrero") {
    const piso = n(e.empuje.piso);
    subnivel = e.empuje.omitir || piso < 8 ? "2.1" : piso < 14 ? "2.2" : "2.3";
  }

  let clave = nivel === "guerrero" ? (subnivel === "2.1" ? "g21" : subnivel === "2.2" ? "g22" : "g23") : nivel;

  // Arranque suave: sin entrenar hace tiempo o sin la actividad mínima recomendada.
  const largoDescanso = e.ultimoEntreno === "mas_seis" || e.ultimoEntreno === "nunca";
  const inicioReducido = idx >= 2 && (largoDescanso || e.activo === false);
  if (inicioReducido) {
    clave = ORDEN_DESTINOS[Math.max(0, ORDEN_DESTINOS.indexOf(clave) - 1)];
    avisos.push("Llevas tiempo sin entrenar o por debajo de la actividad mínima recomendada: durante 2 semanas empiezas un subnivel más abajo para que tu cuerpo se adapte.");
  }

  const atrasados = patrones.filter((p) => p.idx !== null && p.idx <= idxBruto - 2).map((p) => p.nombre);
  if (atrasados.length) avisos.push(`Patrón atrasado: ${atrasados.join(", ")}. Dale prioridad: es lo que más te va a ayudar a subir.`);

  return { ok: true, r: { nivel, subnivel, patrones, atrasados, avisos, parqAlerta, inicioReducido, destino: DESTINOS[clave] } };
}

/** Limpia entradas llegadas del navegador: tipos y rangos razonables. */
export function sanear(x: unknown): Entradas | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const num = (v: unknown, max = 600) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), max) : null);
  const bool = (v: unknown) => v === true;
  const g = (k: string) => (o[k] && typeof o[k] === "object" ? (o[k] as Record<string, unknown>) : {});
  const pi = g("piernas"), em = g("empuje"), co = g("core"), tr = g("traccion");
  if (!Array.isArray(o.parq) || o.parq.length !== 7) return null;
  return {
    parq: o.parq.map((v: unknown) => (v === true ? true : v === false ? false : null)),
    parqZona: String(o.parqZona ?? "").slice(0, 120),
    edad: String(o.edad ?? "").slice(0, 10),
    activo: o.activo === true ? true : o.activo === false ? false : null,
    ultimoEntreno: ["semana", "mes", "seis_meses", "mas_seis", "nunca"].includes(o.ultimoEntreno) ? o.ultimoEntreno : "",
    percibido: CLAVES.includes(o.percibido) ? o.percibido : "",
    piernas: { omitir: bool(pi.omitir), completa: pi.completa !== false, reps: num(pi.reps), pistolAsistido: bool(pi.pistolAsistido), pistolLibre: num(pi.pistolLibre) },
    empuje: { omitir: bool(em.omitir), pared: num(em.pared), banco: num(em.banco), rodillas: num(em.rodillas), piso: num(em.piso), fondos: num(em.fondos), pino: bool(em.pino), pseudo: bool(em.pseudo) },
    core: { omitir: bool(co.omitir), plancha: num(co.plancha), hollow: num(co.hollow), lsit: num(co.lsit) },
    traccion: { omitir: bool(tr.omitir), colgado: num(tr.colgado), estatica: num(tr.estatica), dominadas: num(tr.dominadas), muscleUp: bool(tr.muscleUp), frontLever: bool(tr.frontLever) },
  };
}
