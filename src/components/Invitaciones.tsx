"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { crearCliente } from "@/lib/supabase/client";

type Inv = { codigo: string; escuela_id: string | null; usos: number };

function Qr({ url, nombre }: { url: string; nombre: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 2, color: { dark: "#0D0B0A", light: "#FFFFFF" } }).then(setSrc);
  }, [url]);
  if (!src) return <div className="h-40 w-40 rounded-lg bg-bg" />;
  return (
    <div className="grid justify-items-start gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`Código QR de invitación ${nombre}`} className="h-40 w-40 rounded-lg" />
      <a href={src} download={`invitacion-${nombre}.png`} className="text-sm text-dorado underline">Descargar QR</a>
    </div>
  );
}

export default function Invitaciones({
  paginaId,
  sitio,
  invitaciones,
  escuelas,
}: {
  paginaId: string;
  sitio: string;
  invitaciones: Inv[];
  escuelas: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [escuela, setEscuela] = useState("");
  const [copiado, setCopiado] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const nombreEscuela = (id: string | null) => escuelas.find((e) => e.id === id)?.nombre ?? "Entrenamiento individual";

  async function crear() {
    setError("");
    setCargando(true);
    const { error } = await crearCliente().rpc("crear_invitacion", { p_pagina: paginaId, p_escuela: escuela || null });
    setCargando(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function desactivar(codigo: string) {
    if (!window.confirm("¿Desactivar este link? Quien lo tenga ya no podrá usarlo.")) return;
    await crearCliente().rpc("desactivar_invitacion", { p_codigo: codigo });
    router.refresh();
  }

  async function copiar(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(url);
    } catch {
      setError("No pudimos copiar. Mantén presionado el link para copiarlo.");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="tarjeta flex flex-wrap items-end gap-3">
        {escuelas.length > 0 && (
          <label className="grid gap-1 text-sm">
            Para
            <select className="campo" value={escuela} onChange={(e) => setEscuela(e.target.value)}>
              <option value="">Entrenamiento individual</option>
              {escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>
        )}
        <button type="button" onClick={crear} disabled={cargando} className="btn btn-lava">Crear link de invitación</button>
      </div>
      {error && <p className="aviso-error" role="alert">{error}</p>}
      {invitaciones.length === 0 ? (
        <p className="text-suave">Todavía no creaste invitaciones.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {invitaciones.map((i) => {
            const url = `${sitio}/i/${i.codigo}`;
            return (
              <li key={i.codigo} className="tarjeta grid gap-3">
                <p className="font-bold">{nombreEscuela(i.escuela_id)}</p>
                <code className="break-all rounded bg-bg px-2 py-1 text-sm">{url}</code>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => copiar(url)} className="btn btn-borde !py-1.5">{copiado === url ? "¡Copiado!" : "Copiar link"}</button>
                  <a href={`https://wa.me/?text=${encodeURIComponent("Súmate a mis entrenamientos en UniBars: " + url)}`} target="_blank" rel="noopener noreferrer" className="btn btn-borde !py-1.5">
                    Enviar por WhatsApp
                  </a>
                  <button type="button" onClick={() => desactivar(i.codigo)} className="btn btn-borde !py-1.5">Desactivar</button>
                </div>
                <Qr url={url} nombre={i.codigo} />
                <p className="text-xs text-suave">Usado {i.usos} {i.usos === 1 ? "vez" : "veces"}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
