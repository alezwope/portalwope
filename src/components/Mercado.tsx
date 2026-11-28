"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTextos } from "@/components/Idioma";
import { rellenar } from "@/lib/i18n/diccionarios";
import { crearCliente } from "@/lib/supabase/client";

export type ItemMercado = {
  id: string; pagina_id: string; pagina_nombre: string; pagina_slug: string; seccion: string; titulo: string; descripcion: string | null;
  precio: number | null; moneda: string; foto_path: string | null; enlace_url: string | null; whatsapp: string | null; material: string | null;
  estado: string; oficial: boolean; ciudad: string | null; pais: string | null; mio: boolean;
};

export const urlFoto = (path: string | null) => (path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/mercado/${path}` : null);

export function TarjetaItem({ i }: { i: ItemMercado }) {
  const { t } = useTextos();
  const [rep, setRep] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [msg, setMsg] = useState("");
  const foto = urlFoto(i.foto_path);
  async function reportar() {
    const { error } = await crearCliente().rpc("reportar", { p_tipo: "producto", p_id: i.id, p_motivo: motivo });
    setMsg(error ? error.message : t["mk.reportado"]);
    if (!error) setRep(false);
  }
  return (
    <article className="tarjeta grid content-start gap-2 !p-0 overflow-hidden">
      {foto && /* eslint-disable-next-line @next/next/no-img-element */ <img src={foto} alt={i.titulo} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
      <div className="grid gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {i.oficial && <span className="rounded-full border border-dorado px-2 text-xs text-dorado">★ {t["mk.oficial"]}</span>}
          {i.estado === "pausado" && <span className="rounded-full border px-2 text-xs text-suave">pausado</span>}
        </div>
        <h3 className="text-lg">{i.titulo}</h3>
        <p className="text-xs text-suave">
          <Link href={`/e/${i.pagina_slug}`} className="underline">{rellenar(t["mk.de"], { n: i.pagina_nombre })}</Link>
          {i.ciudad ? ` · ${i.ciudad}` : ""}
        </p>
        {i.descripcion && <p className="whitespace-pre-line text-sm">{i.descripcion}</p>}
        {i.material && <p className="text-xs text-suave"><strong>{t["mk.material"]}:</strong> {i.material}</p>}
        <p className="text-sm">{i.precio !== null ? <>{t["mk.precio"]}: <strong>{i.precio} {i.moneda}</strong></> : t["mk.consultar"]}</p>
        <div className="flex flex-wrap gap-2">
          {i.enlace_url && <a className="btn btn-lava !py-1" href={i.enlace_url} target="_blank" rel="noopener noreferrer nofollow ugc">{t["mk.ver"]}</a>}
          {i.whatsapp && <a className="btn btn-borde !py-1" href={`https://wa.me/${i.whatsapp}?text=${encodeURIComponent(rellenar(t["mk.waTexto"], { t: i.titulo }))}`} target="_blank" rel="noopener noreferrer">{t["mk.wa"]}</a>}
          {!i.mio && <button type="button" className="text-xs text-suave underline" onClick={() => setRep(!rep)}>{t["mk.reportar"]}</button>}
        </div>
        {rep && (
          <div className="grid gap-2">
            <textarea className="campo" rows={2} maxLength={300} placeholder={t["mk.motivo"]} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <button type="button" className="btn btn-borde !py-1 justify-self-start" disabled={motivo.trim().length < 3} onClick={reportar}>{t["mk.reportar"]}</button>
          </div>
        )}
        {msg && <p className="text-xs text-suave" role="status">{msg}</p>}
      </div>
    </article>
  );
}

const SECCIONES = ["servicio", "digital", "fisico"];

export default function Mercado({ pais, puedePublicar }: { pais: string; puedePublicar: boolean }) {
  const { t } = useTextos();
  const [sec, setSec] = useState("fisico");
  const [q, setQ] = useState("");
  const [soloPais, setSoloPais] = useState(true);
  const [items, setItems] = useState<ItemMercado[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [listo, setListo] = useState(false);

  const cargar = useCallback(async (offset: number) => {
    const { data } = await crearCliente().rpc("mercado_listar", { p_seccion: sec, p_pais: soloPais ? pais : "", p_q: q, p_offset: offset });
    const lista = (data ?? []) as ItemMercado[];
    setItems((prev) => (offset === 0 ? lista : [...prev, ...lista]));
    setHayMas(lista.length === 24);
    setListo(true);
  }, [sec, q, soloPais, pais]);
  useEffect(() => { const id = setTimeout(() => cargar(0), 250); return () => clearTimeout(id); }, [cargar]);

  return (
    <div className="grid gap-4">
      <p className="text-suave">{t["mk.intro"]}</p>
      <p className="text-xs text-suave">{t["mk.aviso"]}</p>
      <div className="flex flex-wrap gap-2" role="tablist">
        {SECCIONES.map((s) => (
          <button key={s} role="tab" aria-selected={sec === s} className={`btn !py-1 ${sec === s ? "btn-lava" : "btn-borde"}`} onClick={() => setSec(s)}>{t[`mk.s.${s}` as keyof typeof t]}</button>
        ))}
        {puedePublicar && <Link href="/panel/mercado/catalogo" className="btn btn-borde !py-1 ml-auto">{t["mk.publicar"]}</Link>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input className="campo max-w-xs" placeholder={t["mk.buscar"]} value={q} onChange={(e) => setQ(e.target.value)} />
        {pais && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={soloPais} onChange={(e) => setSoloPais(e.target.checked)} />{t["mk.miPais"]}</label>}
      </div>
      {listo && items.length === 0 && <p className="text-suave">{t["mk.vacio"]}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{items.map((i) => <TarjetaItem key={i.id} i={i} />)}</div>
      {hayMas && <button className="btn btn-borde justify-self-center" onClick={() => cargar(items.length)}>{t["mk.mas"]}</button>}
    </div>
  );
}
