"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTextos } from "@/components/Idioma";
import { rellenar } from "@/lib/i18n/diccionarios";
import { crearCliente } from "@/lib/supabase/client";
import { NIVELES, nivelDe } from "@/lib/catalogos";
import { formatoValor, type ResumenVerif } from "@/lib/habilidades";
import InsigniaVerif from "@/components/InsigniaVerif";
import Avatar from "@/components/Avatar";
import { mensajeError } from "@/lib/social";

type Item = {
  id: string; ejercicio: string; habilidad: string | null; valor: number; unidad: string; fecha: string; nota: string | null;
  video_url: string | null; metodo: string;
  autor: { id: string; alias: string; avatar_url: string | null; nivel: string | null };
  verif: ResumenVerif; nivel_req?: number; yo?: { valida: boolean } | null;
};
export type ColaVerificar = { alumnos: Item[]; comunidad: Item[]; puede_comunidad: boolean };

export default function VerificarMarcas({ cola }: { cola: ColaVerificar }) {
  const { t } = useTextos();
  return (
    <div className="grid gap-6">
      {cola.alumnos.length > 0 || cola.comunidad.length === 0 ? (
        <section className="grid gap-3">
          <h2 className="text-xl">{t["vp.alumnos"]}</h2>
          {cola.alumnos.length === 0 ? <p className="tarjeta text-suave">{t["vp.sinAlumnos"]}</p> : cola.alumnos.map((m) => <Tarjeta key={m.id} m={m} alumno />)}
        </section>
      ) : null}
      <section className="grid gap-3">
        <h2 className="text-xl">{t["vp.comunidad"]}</h2>
        {!cola.puede_comunidad ? (
          <p className="tarjeta text-suave">{t["vp.noPuede"]}</p>
        ) : cola.comunidad.length === 0 ? (
          <p className="tarjeta text-suave">{t["vp.sinComunidad"]}</p>
        ) : (
          cola.comunidad.map((m) => <Tarjeta key={m.id} m={m} />)
        )}
      </section>
    </div>
  );
}

function Tarjeta({ m, alumno = false }: { m: Item; alumno?: boolean }) {
  const { t, idioma } = useTextos();
  const router = useRouter();
  const tx = (k: string) => (t as Record<string, string>)[k] ?? k;
  const [c, setC] = useState([false, false, false, false]);
  const [verif, setVerif] = useState<ResumenVerif>(m.verif);
  const [yo, setYo] = useState<boolean | null>(m.yo ? m.yo.valida : null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const LOCALE = { es: "es-AR", en: "en-US", pt: "pt-BR" }[idioma];
  const conVideo = !!m.video_url;
  // Con video se exigen los 4 criterios; si es alumno visto en persona basta el toque del entrenador.
  const listo = alumno && !conVideo ? true : c.every(Boolean);
  const nv = nivelDe(m.autor.nivel);
  const nombre = m.habilidad ? tx(`hab.${m.habilidad}`) : m.ejercicio;

  async function enviar(valida: boolean) {
    setCargando(true);
    setMsg(null);
    const { data, error } = await crearCliente().rpc("verificar_marca", { p_marca: m.id, p_valida: valida });
    setCargando(false);
    if (error) return setMsg({ ok: false, texto: mensajeError(error) || t["vp.error"] });
    setVerif(data as ResumenVerif);
    setYo(valida);
    setCambiando(false);
    setMsg({ ok: true, texto: t["vp.hecho"] });
    router.refresh();
  }

  return (
    <article className="tarjeta grid gap-3">
      <div className="flex items-center gap-3">
        <Avatar alias={m.autor.alias} url={m.autor.avatar_url} nivel={m.autor.nivel} tam={40} />
        <div className="min-w-0">
          <p className="truncate text-sm text-suave">{t["vp.marcaDe"]} <strong className="text-texto">@{m.autor.alias}</strong>{nv ? <> · <span style={{ color: nv.color }}>{nv.nombre}</span></> : null}</p>
          <p>
            <strong>{nombre}</strong> <span className="titulo text-xl text-dorado">{formatoValor(m.valor, m.unidad)}</span>{" "}
            <span className="text-sm text-suave">{m.unidad === "seg" ? "s" : m.unidad === "kg" ? "kg" : "reps"} · {new Date(m.fecha + "T12:00:00").toLocaleDateString(LOCALE, { dateStyle: "medium" })}</span>
          </p>
        </div>
      </div>
      {m.nota && <p className="text-sm text-suave">{m.nota}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <InsigniaVerif v={verif} />
        {m.metodo === "camara" && <span className="rounded-full border border-borde px-2 py-0.5 text-xs">📷 {t["dia.camaraOk"]}</span>}
        {conVideo ? (
          <a href={m.video_url!} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-borde !py-1">▶ {t["vp.abrir"]}</a>
        ) : (
          <span className="text-xs text-suave">{t["vp.sinVideo"]}</span>
        )}
        {!alumno && m.nivel_req !== undefined && m.nivel_req > 0 && (
          <span className="text-xs text-suave">{rellenar(t["vp.nivelReq"], { nivel: NIVELES[m.nivel_req].nombre })}</span>
        )}
      </div>

      {yo !== null && !cambiando ? (
        <p className="text-sm">
          <span className={yo ? "text-ok" : "text-lava"}>{yo ? t["vp.yoValida"] : t["vp.yoNo"]}</span>{" "}
          <button type="button" className="text-suave underline" onClick={() => setCambiando(true)}>{t["vp.cambiar"]}</button>
        </p>
      ) : (
        <div className="grid gap-2">
          {(conVideo || !alumno) && (
            <fieldset className="grid gap-1 text-sm">
              <legend className="mb-1 text-suave">{t["vp.reglas"]}</legend>
              {(["vp.c1", "vp.c2", "vp.c3", "vp.c4"] as const).map((k, i) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={c[i]} onChange={(e) => setC(c.map((x, j) => (j === i ? e.target.checked : x)))} />
                  {t[k]}
                </label>
              ))}
            </fieldset>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-lava" disabled={!listo || cargando} onClick={() => enviar(true)}>✓ {t["vp.valida"]}</button>
            <button type="button" className="btn btn-borde" disabled={cargando} onClick={() => enviar(false)}>{t["vp.noValida"]}</button>
          </div>
        </div>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-lava"}`} role="status">{msg.texto}</p>}
    </article>
  );
}
