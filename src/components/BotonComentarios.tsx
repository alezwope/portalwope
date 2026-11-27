"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

export default function BotonComentarios({ tipos }: { tipos: { clave: string; nombre: string }[] }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState(tipos[0]?.clave ?? "idea");
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (texto.trim().length < 3) { setMsg({ ok: false, texto: "Cuéntanos un poco más." }); return; }
    setEnviando(true);
    const { error } = await crearCliente().rpc("enviar_comentario", {
      p_tipo: tipo, p_texto: texto.trim(), p_ruta: ruta, p_dispositivo: navigator.userAgent.slice(0, 300),
    });
    setEnviando(false);
    if (error) { setMsg({ ok: false, texto: error.message }); return; }
    setTexto(""); setMsg({ ok: true, texto: "¡Gracias! Lo recibimos." });
    setTimeout(() => { setAbierto(false); setMsg(null); }, 1500);
  }

  return (
    <div className="fixed bottom-20 left-3 z-40 md:bottom-6 md:left-auto md:right-6">
      {abierto && (
        <div className="tarjeta mb-2 grid w-72 gap-2 shadow-lg" role="dialog" aria-label="Enviar comentario">
          <select className="campo !py-1" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
            {tipos.map((t) => <option key={t.clave} value={t.clave}>{t.nombre}</option>)}
          </select>
          <textarea className="campo" rows={4} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¿Qué viste, qué falló o qué se te ocurre?" />
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-lava !py-1" onClick={enviar} disabled={enviando}>Enviar</button>
            <button type="button" className="btn btn-borde !py-1" onClick={() => setAbierto(false)}>Cerrar</button>
          </div>
          {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"}>{msg.texto}</p>}
        </div>
      )}
      <button type="button" className="btn btn-lava ml-auto flex rounded-full !px-3 !py-2 shadow-lg" onClick={() => setAbierto(!abierto)} aria-label="Enviar comentario">
        💬
      </button>
    </div>
  );
}
