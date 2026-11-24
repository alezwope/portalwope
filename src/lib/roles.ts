export const ROLES = {
  super_admin: { nombre: "Super Admin", resumen: "Administra toda la plataforma." },
  coach: { nombre: "Coach", resumen: "Crea o dirige su escuela, arma entrenamientos y acompaña a sus alumnos." },
  alumno: { nombre: "Alumno", resumen: "Entrena, progresa y pertenece a una escuela." },
  atleta_libre: { nombre: "Atleta libre", resumen: "Lobo solitario: entrena por su cuenta y participa de la comunidad." },
  wellness: { nombre: "Wellness", resumen: "Profesional del bienestar: nutrición, kinesiología y más." },
} as const;

export type Rol = keyof typeof ROLES;

/** Roles que una persona puede elegir al registrarse. El super admin nunca se elige. */
export const ROLES_ELEGIBLES: Rol[] = ["alumno", "coach", "atleta_libre", "wellness"];

export const NIVELES = [
  { n: 1, nombre: "Génesis", color: "#B8BCC2", etapa: "Principiante" },
  { n: 2, nombre: "Fénix", color: "#3FAE5A", etapa: "Intermedio" },
  { n: 3, nombre: "Guerrero", color: "#3B82F6", etapa: "Avanzado" },
  { n: 4, nombre: "Maestro", color: "#F28C28", etapa: "Atleta" },
  { n: 5, nombre: "Titán", color: "#9B5DE5", etapa: "Atleta de élite" },
];
