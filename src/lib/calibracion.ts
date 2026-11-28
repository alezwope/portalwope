// Algoritmo de calibración (fase 1.2 C). Solo PROPONE: Alez aprueba y guarda desde la consola.
// Diseño completo: claude/calibracion-algoritmo-unibars-wope.md (proyecto).

export type EstCamara = {
  ejercicio: string; n: number; personas: number; media_persona: number; sesgo: number; sesgo_pct: number | null;
  error_abs: number; exacto_pct: number; dentro_pct: number; movil_pct: number;
};
/** [clave, etiqueta, mínimo, máximo, paso, dónde] — viene del motor (ArenaPose.par). */
export type Par = [string, string, number, number, number, string];

export const MIN_MUESTRA_CAMARA = 20;
export const MIN_PERSONAS_CAMARA = 5;
export const MIN_MUESTRA_NIVEL = 30;

export type Propuesta =
  | { tipo: "faltan"; texto: string }
  | { tipo: "bien"; texto: string }
  | { tipo: "ajuste"; texto: string; valores: Record<string, number> };

const ajustar = (p: Par, v: number) => {
  const [, , min, max, paso] = p;
  const r = Math.round(Math.min(max, Math.max(min, v)) / paso) * paso;
  return Number(r.toFixed(4));
};

/**
 * Cámara: compara lo que contó con lo que la persona confirmó.
 * - Cuenta de más (sesgo > +5 %): pide más recorrido/cierre (más exigente).
 * - Cuenta de menos (sesgo < −5 %): afloja un paso.
 * - Sostenidos: si corta antes (cuenta de menos), ensancha la ventana del ángulo; si sigue de más, la estrecha.
 * Paso de cambio chico (5 % o un par de grados) para que nunca salte de golpe; se repite con datos nuevos.
 */
export function proponerCamara(e: EstCamara | undefined, par: Par[], actual: Record<string, number>, sostenido: boolean): Propuesta {
  if (!e || e.n < MIN_MUESTRA_CAMARA || e.personas < MIN_PERSONAS_CAMARA)
    return { tipo: "faltan", texto: `Faltan datos: ${e?.n ?? 0}/${MIN_MUESTRA_CAMARA} pruebas de ${e?.personas ?? 0}/${MIN_PERSONAS_CAMARA} personas.` };
  const s = e.sesgo_pct ?? 0;
  if (e.dentro_pct >= 90 && Math.abs(s) <= 5) return { tipo: "bien", texto: `Acierta en el ${e.dentro_pct} % (±1 o ±5 %). No hace falta tocar nada.` };
  if (Math.abs(s) <= 5) return { tipo: "bien", texto: `Sin sesgo claro (${s} %), pero acierta solo el ${e.dentro_pct} %: el error es de un lado y del otro. Revisa la guía de colocación antes que los números.` };

  const masExigente = s > 0;
  const v: Record<string, number> = {};
  const P = (k: string) => par.find((p) => p[0] === k);
  if (!sostenido) {
    for (const k of ["recorrido", "cierre"]) {
      const p = P(k);
      if (!p || actual[k] == null) continue;
      v[k] = ajustar(p, k === "recorrido" ? actual[k] * (masExigente ? 1.05 : 0.95) : actual[k] + (masExigente ? 2 : -2));
    }
  } else {
    const pmin = P("min"), pmax = P("max");
    if (pmin && actual.min != null) v.min = ajustar(pmin, actual.min + (masExigente ? 3 : -3));
    if (pmax && actual.max != null) v.max = ajustar(pmax, actual.max + (masExigente ? -3 : 3));
  }
  if (!Object.keys(v).length) return { tipo: "bien", texto: `Sesgo ${s} %, pero este ejercicio no tiene números simples para mover: revisar a mano.` };
  return {
    tipo: "ajuste",
    texto: masExigente
      ? `La cámara cuenta de más (${s > 0 ? "+" : ""}${s} %). Propuesta: un poco más exigente.`
      : `La cámara cuenta de menos (${s} %). Propuesta: un poco más permisiva.`,
    valores: v,
  };
}

/** Umbral de entrada a cada nivel por campo (copia de src/lib/nivelador.ts, para comparar). */
export const UMBRALES: Record<string, Partial<Record<"fenix" | "guerrero" | "maestro" | "titan", number>>> = {
  "piernas.reps": { fenix: 15, guerrero: 30, maestro: 45, titan: 45 },
  "piernas.silla": { fenix: 30, guerrero: 60, maestro: 120, titan: 300 },
  "empuje.piso": { guerrero: 3, maestro: 20, titan: 20 },
  "empuje.fondos": { maestro: 3, titan: 12 },
  "core.plancha": { fenix: 20, guerrero: 45, maestro: 90, titan: 90 },
  "core.hollow": { maestro: 30, titan: 30 },
  "traccion.dominadas": { maestro: 1, titan: 8 },
  "resistencia.conFlexion": { guerrero: 8, maestro: 20, titan: 30 },
};

/**
 * Nivelador: compara el umbral con lo que hace la gente que ya está en ese nivel.
 * Ojo con la circularidad: quien llegó a un nivel ya superó su umbral, así que p25 ≥ umbral casi siempre.
 * La señal útil es la DISTANCIA: si el p25 queda muy por encima (×1,5), el umbral es fácil para ese nivel;
 * si el p50 queda pegado al umbral (<×1,1), el nivel está «lleno de justos» y conviene revisar el anterior.
 * Datos fiables solo cuando el nivel viene de pruebas con cámara o verificadas (fase 1.3).
 */
export function proponerUmbral(umbral: number | undefined, n: number, p25: number, p50: number): string {
  if (umbral == null) return "—";
  if (n < MIN_MUESTRA_NIVEL) return `Faltan datos (${n}/${MIN_MUESTRA_NIVEL}).`;
  if (umbral > 0 && p25 >= umbral * 1.5) return `Umbral fácil: el 75 % hace ${Math.round(p25)} o más. Proponer ≈ ${Math.round((umbral + p25) / 2)}.`;
  if (umbral > 0 && p50 < umbral * 1.1) return "Muchos entran justo: revisar si el umbral del nivel anterior es muy bajo.";
  return "Coherente.";
}
