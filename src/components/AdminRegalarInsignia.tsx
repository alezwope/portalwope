"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

const ROLES: Record<string, string> = {
  entrenador: "Entrenador/a", wellness: "Bienestar", tienda_fisica: "Tienda física",
  tienda_digital: "Tienda digital", constructor: "Constructor de parques", persona: "Persona",
};

export default function AdminRegalarInsignia({ roles }: { roles: string[] }) {
  const router = useRouter();
  const [rol, setRol] = useState(roles[0] ?? "entrenador");
  const [destino, setDestino] = useState("");
  const [dias, setDias] = useState("");
  const [nota, setNota] = useState("");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const esPersona = rol === "persona";

  async function regalar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    setEnviando(true);
    const supabase = crearCliente();
    const clave = destino.trim().toLowerCase().replace(/^@/, "");
    if (!clave) { setMensaje({ tipo: "error", texto: esPersona ? "Escribe el alias." : "Escribe la dirección (slug) de la página." }); setEnviando(false); return; }

    const { data: encontrado } = esPersona
      ? await supabase.from("profiles").select("id").eq("alias", clave).maybeSingle()
      : await supabase.from("paginas").select("id").eq("slug", clave).maybeSingle();
    if (!encontrado) { setMensaje({ tipo: "error", texto: "No encontré a quién regalársela." }); setEnviando(false); return; }

    const { error } = await supabase.rpc("admin_insignia_regalar", {
      p_pagina: esPersona ? null : encontrado.id,
      p_perfil: esPersona ? encontrado.id : null,
      p_rol: rol,
      p_dias: dias === "" ? null : Number(dias),
      p_nota: nota || null,
    });
    setEnviando(false);
    if (error) { setMensaje({ tipo: "error", texto: error.message }); return; }
    setMensaje({ tipo: "ok", texto: "Insignia regalada." });
    setDestino(""); setNota("");
    router.refresh();
  }

  return (
    <form onSubmit={regalar} className="tarjeta grid gap-3">
      <h2 className="text-xl">Regalar insignia (testers)</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="grid gap-1 text-sm">Tipo
          <select className="campo" value={rol} onChange={(e) => setRol(e.target.value)}>
            {roles.map((r) => <option key={r} value={r}>{ROLES[r] ?? r}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">{esPersona ? "Alias de la persona" : "Dirección (slug) de la página"}
          <input className="campo" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder={esPersona ? "@alias" : "mi-escuela"} />
        </label>
        <label className="grid gap-1 text-sm">Duración (días, vacío = sin fin)
          <input className="campo" inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} />
        </label>
      </div>
      <label className="grid gap-1 text-sm">Nota interna (opcional)
        <input className="campo" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} />
      </label>
      <div className="flex items-center gap-3">
        <button className="btn btn-dorado" disabled={enviando}>{enviando ? "Regalando…" : "Regalar insignia"}</button>
        {mensaje && <span className={mensaje.tipo === "ok" ? "aviso-ok" : "aviso-error"}>{mensaje.texto}</span>}
      </div>
    </form>
  );
}
