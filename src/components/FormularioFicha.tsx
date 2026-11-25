"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";
import type { Pagina } from "@/lib/sesion";
import { MODALIDADES, NIVELES, OBJETIVOS } from "@/lib/catalogos";
import SelectorUbicacion, { type Ubicacion } from "@/components/SelectorUbicacion";

function Casillas({ titulo, opciones, valor, cambiar }: { titulo: string; opciones: [string, string][]; valor: string[]; cambiar: (v: string[]) => void }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-bold">{titulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opciones.map(([k, t]) => {
          const on = valor.includes(k);
          return (
            <label key={k} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${on ? "border-lava bg-lava text-white" : "border-borde"}`}>
              <input type="checkbox" className="sr-only" checked={on} onChange={() => cambiar(on ? valor.filter((x) => x !== k) : [...valor, k])} />
              {t}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function FormularioFicha({ pagina }: { pagina: Pagina }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(pagina.nombre);
  const [bio, setBio] = useState(pagina.bio ?? "");
  const [ub, setUb] = useState<Ubicacion>({ pais: pagina.pais ?? "", ciudad: pagina.ciudad ?? "" });
  const [contacto, setContacto] = useState(pagina.contacto_url ?? "");
  const [modalidades, setModalidades] = useState(pagina.modalidades);
  const [niveles, setNiveles] = useState(pagina.atiende_niveles);
  const [objetivos, setObjetivos] = useState(pagina.atiende_objetivos);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (nombre.trim().length < 2) return setMsg({ ok: false, texto: "El nombre debe tener al menos 2 caracteres." });
    setCargando(true);
    const { error } = await crearCliente()
      .from("paginas")
      .update({
        nombre: nombre.trim(),
        bio: bio.trim() || null,
        ciudad: ub.ciudad.trim() || null,
        pais: ub.pais || null,
        contacto_url: contacto.trim() || null,
        modalidades,
        atiende_niveles: niveles,
        atiende_objetivos: objetivos,
      })
      .eq("id", pagina.id);
    setCargando(false);
    if (error) setMsg({ ok: false, texto: error.message.includes("paginas_contacto_valido") ? "El contacto debe ser un enlace https de Instagram, Facebook, YouTube, WhatsApp o Telegram." : "No pudimos guardar la ficha." });
    else {
      setMsg({ ok: true, texto: "Ficha guardada ✓" });
      router.refresh();
    }
  }

  async function pausar() {
    const pausar = pagina.estado === "activa";
    if (pausar && !window.confirm("¿Pausar tu página? No aparecerás en búsquedas ni recibirás solicitudes.")) return;
    const { error } = await crearCliente().rpc("pausar_pagina", { p_id: pagina.id, p_pausar: pausar });
    if (error) setMsg({ ok: false, texto: error.message });
    else router.refresh();
  }

  return (
    <form onSubmit={guardar} className="tarjeta grid gap-4">
      <label className="grid gap-1 text-sm">
        Nombre de tu escuela (puede ser tu nombre)
        <input className="campo" required maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label className="grid gap-1 text-sm">
        Presentación
        <textarea className="campo" rows={4} maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tu experiencia, tu método, dónde entrenas…" />
      </label>
      <SelectorUbicacion etiqueta="Ciudad principal de tu escuela" valor={ub} onCambio={setUb} />
      <label className="grid gap-1 text-sm">
        Enlace de contacto (opcional)
        <input className="campo" type="url" maxLength={200} value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Instagram, WhatsApp, YouTube, Facebook o Telegram" />
      </label>
      <Casillas titulo="Modalidades" opciones={Object.entries(MODALIDADES)} valor={modalidades} cambiar={setModalidades} />
      <Casillas titulo="Niveles que entrenas" opciones={NIVELES.map((n) => [n.clave, n.nombre])} valor={niveles} cambiar={setNiveles} />
      <Casillas titulo="Objetivos con los que ayudas" opciones={Object.entries(OBJETIVOS)} valor={objetivos} cambiar={setObjetivos} />
      {msg && <p className={msg.ok ? "aviso-ok" : "aviso-error"} role={msg.ok ? "status" : "alert"}>{msg.texto}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-lava" disabled={cargando}>{cargando ? "Guardando…" : "Guardar ficha"}</button>
        {(pagina.estado === "activa" || pagina.estado === "pausada") && (
          <button type="button" onClick={pausar} className="btn btn-borde">{pagina.estado === "activa" ? "Pausar página" : "Reactivar página"}</button>
        )}
      </div>
    </form>
  );
}
