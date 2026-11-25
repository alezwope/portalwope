export const NIVELES = [
  { clave: "genesis", n: 1, nombre: "Génesis", color: "#B8BCC2", etapa: "Principiante" },
  { clave: "fenix", n: 2, nombre: "Fénix", color: "#3FAE5A", etapa: "Intermedio" },
  { clave: "guerrero", n: 3, nombre: "Guerrero", color: "#3B82F6", etapa: "Avanzado" },
  { clave: "maestro", n: 4, nombre: "Maestro", color: "#F28C28", etapa: "Atleta" },
  { clave: "titan", n: 5, nombre: "Titán", color: "#9B5DE5", etapa: "Atleta de élite" },
] as const;
export type Nivel = (typeof NIVELES)[number]["clave"];
export const nivelDe = (clave: string | null | undefined) => NIVELES.find((n) => n.clave === clave);

export const OBJETIVOS = {
  fuerza: "Ganar fuerza",
  habilidades: "Aprender habilidades",
  salud: "Salud y bienestar",
  masa_muscular: "Ganar masa muscular",
  bajar_grasa: "Bajar grasa",
  movilidad: "Mejorar movilidad",
} as const;
export type Objetivo = keyof typeof OBJETIVOS;

export const MODALIDADES = { presencial: "Presencial", distancia: "A distancia", grupo: "En grupo" } as const;

export const TIPOS_PAGINA = {
  entrenador: {
    nombre: "Entrenador",
    resumen: "Tu escuela: tu nombre o el que elijas, tus sedes en el mapa, tus alumnos e invitaciones. 10 alumnos gratis.",
    icono: "🏋️",
  },
  tienda: {
    nombre: "Tienda",
    resumen: "Vende equipos y parques de calistenia en el marketplace.",
    icono: "🛒",
  },
  wellness: {
    nombre: "Wellness",
    resumen: "Ofrece servicios de salud: nutrición, kinesiología, salud mental. Se verifica antes de mostrarse.",
    icono: "🌿",
  },
} as const;
export type TipoPagina = keyof typeof TIPOS_PAGINA;

export const ESTADOS_PAGINA: Record<string, string> = {
  activa: "Activa",
  pausada: "Pausada",
  revision: "En revisión",
  suspendida: "Suspendida",
};
