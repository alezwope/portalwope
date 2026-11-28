"use client";

import { useCallback, useEffect, useState } from "react";
import { crearCliente } from "@/lib/supabase/client";
import { TarjetaItem, type ItemMercado } from "@/components/Mercado";

const ERR: Record<string, string> = {
  falta_material: "Para equipos físicos indica material y carga máxima.",
  falta_contacto: "Agrega un enlace (https) o un WhatsApp para que te contacten.",
  enlace_invalido: "El enlace debe empezar con https://",
  whatsapp_invalido: "El WhatsApp debe tener entre 8 y 15 números, con código de país.",
  limite_productos: "Llegaste al límite gratuito de productos activos. Pausa alguno o consigue el Sello WOPE.",
  sin_permiso: "No tienes permiso.",
  foto_invalida: "No se pudo usar la foto.",
};
const SEC: Record<string, string> = { servicio: "Servicio", digital: "Producto digital", fisico: "Equipo físico" };
const vacio = { id: "", seccion: "fisico", titulo: "", descripcion: "", precio: "", moneda: "USD", enlace: "", whatsapp: "", material: "", foto: "" as string | null, estado: "activo" };

/** Reduce la foto a 900 px y la pasa a WebP para ahorrar espacio (máx. 1 MB). */
async function comprimir(archivo: File): Promise<Blob> {
  const bmp = await createImageBitmap(archivo);
  const esc = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * esc); c.height = Math.round(bmp.height * esc);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("foto"))), "image/webp", 0.8));
}

export default function MercadoCatalogo({ paginas }: { paginas: { id: string; nombre: string; tipo: string }[] }) {
  const [pagina, setPagina] = useState(paginas[0].id);
  const [items, setItems] = useState<ItemMercado[]>([]);
  const [f, setF] = useState(vacio);
  const [editando, setEditando] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await crearCliente().rpc("mercado_listar", { p_seccion: null, p_pais: "", p_q: "", p_pagina: pagina, p_offset: 0 });
    setItems((data ?? []) as ItemMercado[]);
  }, [pagina]);
  useEffect(() => { cargar(); }, [cargar]);

  async function foto(e: React.ChangeEvent<HTMLInputElement>) {
    const a = e.target.files?.[0]; if (!a) return;
    setErr(""); setSubiendo(true);
    try {
      const c = crearCliente();
      const { data: u } = await c.auth.getUser();
      const blob = await comprimir(a);
      const ruta = `${u.user!.id}/${crypto.randomUUID()}.webp`;
      const { error } = await c.storage.from("mercado").upload(ruta, blob, { contentType: "image/webp" });
      if (error) throw error;
      setF((x) => ({ ...x, foto: ruta }));
    } catch { setErr("No se pudo subir la foto. Prueba con otra imagen."); }
    setSubiendo(false);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setOk("");
    const { error } = await crearCliente().rpc("mercado_guardar", {
      p_id: f.id || null, p_pagina: pagina, p_seccion: f.seccion, p_titulo: f.titulo, p_desc: f.descripcion, p_precio: f.precio === "" ? null : Number(f.precio),
      p_moneda: f.moneda, p_enlace: f.enlace, p_whatsapp: f.whatsapp, p_material: f.material, p_foto: f.foto || null, p_estado: f.estado,
    });
    if (error) return setErr(ERR[error.message] ?? "No se pudo guardar.");
    setOk("Guardado."); setF(vacio); setEditando(false); cargar();
  }
  async function borrar(id: string) {
    if (!confirm("¿Borrar este producto? No se puede deshacer.")) return;
    const { error } = await crearCliente().rpc("mercado_borrar", { p_id: id });
    if (error) return setErr("No se pudo borrar.");
    cargar();
  }
  function editar(i: ItemMercado) {
    setF({ id: i.id, seccion: i.seccion, titulo: i.titulo, descripcion: i.descripcion ?? "", precio: i.precio === null ? "" : String(i.precio), moneda: i.moneda,
      enlace: i.enlace_url ?? "", whatsapp: i.whatsapp ?? "", material: i.material ?? "", foto: i.foto_path, estado: i.estado === "pausado" ? "pausado" : "activo" });
    setEditando(true); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid gap-6">
      {paginas.length > 1 && (
        <label className="grid gap-1 text-sm">Página
          <select className="campo" value={pagina} onChange={(e) => setPagina(e.target.value)}>{paginas.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.tipo})</option>)}</select>
        </label>
      )}
      {err && <p className="aviso-error" role="alert">{err}</p>}
      {ok && <p className="aviso-ok" role="status">{ok}</p>}
      {!editando && <button className="btn btn-lava justify-self-start" onClick={() => { setF(vacio); setEditando(true); }}>+ Nuevo producto o servicio</button>}
      {editando && (
        <form onSubmit={guardar} className="tarjeta grid gap-3">
          <h2 className="text-xl">{f.id ? "Editar" : "Nuevo"}</h2>
          <label className="grid gap-1 text-sm">Sección
            <select className="campo" value={f.seccion} onChange={(e) => setF({ ...f, seccion: e.target.value })}>{Object.entries(SEC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
          <label className="grid gap-1 text-sm">Título<input className="campo" required minLength={3} maxLength={100} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></label>
          <label className="grid gap-1 text-sm">Descripción<textarea className="campo" rows={4} maxLength={1000} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></label>
          {f.seccion === "fisico" && <label className="grid gap-1 text-sm">Material y carga máxima (obligatorio)<input className="campo" maxLength={300} value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })} placeholder="Ej: acero 40 mm, soporta 200 kg" /></label>}
          <div className="grid grid-cols-3 gap-2">
            <label className="col-span-2 grid gap-1 text-sm">Precio indicativo (opcional)<input className="campo" type="number" min="0" step="0.01" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} /></label>
            <label className="grid gap-1 text-sm">Moneda<input className="campo" maxLength={4} value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })} /></label>
          </div>
          <label className="grid gap-1 text-sm">Enlace donde comprar (https://…)<input className="campo" type="url" value={f.enlace} onChange={(e) => setF({ ...f, enlace: e.target.value })} /></label>
          <label className="grid gap-1 text-sm">WhatsApp con código de país (ej: 5491155551234)<input className="campo" inputMode="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></label>
          <label className="grid gap-1 text-sm">Foto{subiendo && " (subiendo…)"}<input type="file" accept="image/*" onChange={foto} /></label>
          {f.foto && <p className="text-xs text-suave">Foto cargada ✓ <button type="button" className="underline" onClick={() => setF({ ...f, foto: null })}>quitar</button></p>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.estado === "activo"} onChange={(e) => setF({ ...f, estado: e.target.checked ? "activo" : "pausado" })} />Visible en el marketplace</label>
          <p className="text-xs text-suave">UniBars no cobra: los compradores te contactan por tu enlace o WhatsApp. Eres responsable de lo que ofreces.</p>
          <div className="flex gap-2"><button className="btn btn-lava" disabled={subiendo}>Guardar</button><button type="button" className="btn btn-borde" onClick={() => { setEditando(false); setF(vacio); }}>Cancelar</button></div>
        </form>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((i) => (
          <div key={i.id} className="grid gap-2">
            <TarjetaItem i={i} />
            <div className="flex gap-2"><button className="btn btn-borde !py-1" onClick={() => editar(i)}>Editar</button><button className="btn btn-borde !py-1" onClick={() => borrar(i.id)}>Borrar</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
