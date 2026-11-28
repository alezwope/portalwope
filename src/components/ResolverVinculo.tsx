"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTextos } from "@/components/Idioma";
import { crearCliente } from "@/lib/supabase/client";

export default function ResolverVinculo({ id, escuelas }: { id: string; escuelas: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const { t } = useTextos();
  const [escuela, setEscuela] = useState(escuelas.length === 1 ? escuelas[0].id : "");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function resolver(aceptar: boolean) {
    setError("");
    setCargando(true);
    const { error } = await crearCliente().rpc("resolver_vinculo", { p_id: id, p_aceptar: aceptar, p_escuela: escuela || null });
    setCargando(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <div className="grid gap-2">
      {escuelas.length > 0 && (
        <label className="grid gap-1 text-sm">
          {t["res.sumar"]}
          <select className="campo !py-1.5" value={escuela} onChange={(e) => setEscuela(e.target.value)}>
            <option value="">{t["res.sinEscuela"]}</option>
            {escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </label>
      )}
      <div className="flex gap-2">
        <button type="button" disabled={cargando} onClick={() => resolver(true)} className="btn btn-lava">{t["res.aceptar"]}</button>
        <button type="button" disabled={cargando} onClick={() => resolver(false)} className="btn btn-borde">{t["res.noPuedo"]}</button>
      </div>
      {error && <p className="aviso-error" role="alert">{error}</p>}
    </div>
  );
}
