/** Puente con el motor de cámara de WOPE (public/pose/arena-pose.js). Todo corre en el teléfono: no sale video. */
export const VERSION_MOTOR = "arena-4.23";

type Cb = (n: number, estado: string, texto?: string) => void;
export type ContadorPose = { n: number; parar: () => void };
export type ArenaPose = {
  Contador: new (video: HTMLVideoElement, lienzo: HTMLCanvasElement | null, tipo: string, cb: Cb) => ContadorPose;
  calibrar: (o: Record<string, Record<string, number>>) => void;
  sostenido: (t: string) => boolean;
  guia: (t: string) => string;
  vista: (t: string) => string;
};

declare global {
  interface Window { ArenaPose?: ArenaPose }
}

let promesa: Promise<ArenaPose> | null = null;

/** Carga el motor una sola vez, solo cuando alguien abre la cámara. */
export function cargarMotor(): Promise<ArenaPose> {
  if (typeof window === "undefined") return Promise.reject(new Error("sin navegador"));
  if (window.ArenaPose) return Promise.resolve(window.ArenaPose);
  if (promesa) return promesa;
  promesa = new Promise((ok, mal) => {
    const s = document.createElement("script");
    s.src = "/pose/arena-pose.js?v=4.23";
    s.async = true;
    s.onload = () => (window.ArenaPose ? ok(window.ArenaPose) : mal(new Error("motor")));
    s.onerror = () => { promesa = null; mal(new Error("motor")); };
    document.head.appendChild(s);
  });
  return promesa;
}

export function tipoDispositivo(): "movil" | "tablet" | "escritorio" {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return /Mobi|Android|iPhone/i.test(ua) ? "movil" : "escritorio";
}
