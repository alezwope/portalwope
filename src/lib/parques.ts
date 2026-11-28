export const CATEGORIAS = {
  calistenia_oficial: { nombre: "Calistenia oficial", detalle: "Parque de calistenia de una fuente oficial (gobierno).", color: "#D4A017" },
  calistenia_etiquetada: { nombre: "Calistenia confirmada", detalle: "La comunidad de OpenStreetMap lo marcó como parque de calistenia.", color: "#E8540C" },
  probable_calistenia: { nombre: "Probable calistenia", detalle: "Tiene barras, paralelas o equipos típicos de calistenia, pero nadie lo confirmó todavía.", color: "#3B82F6" },
  estacion_fitness: { nombre: "Estación de ejercicio", detalle: "Gimnasio al aire libre. Puede tener barras; no está confirmado como calistenia.", color: "#8E8E93" },
} as const;
export type CategoriaParque = keyof typeof CATEGORIAS;

/** Punto compacto que devuelve la base: [id, lat, lng, categoria, aparatos, nombre]. */
export type PuntoParque = [string, number, number, CategoriaParque, number | null, string | null];

export const nombreParque = (nombre: string | null, categoria: CategoriaParque, cat?: string, sinNombre = "sin nombre") =>
  nombre?.trim() || `${cat ?? CATEGORIAS[categoria].nombre} (${sinNombre})`;

export function urlComoLlegar(lat: number, lng: number) {
  return `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`;
}
export function urlGoogleMaps(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
