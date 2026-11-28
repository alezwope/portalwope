"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTextos } from "@/components/Idioma";
import { crearCliente } from "@/lib/supabase/client";

type Datos = { total: number; parques: number; racha: number; hoy: boolean };

export default function Constancia() {
  const { t } = useTextos();
  const [d, setD] = useState<Datos | null>(null);
  useEffect(() => {
    const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    crearCliente().rpc("mi_constancia", { p_zona: zona }).then(({ data }) => data && setD(data as Datos));
  }, []);
  const cifras = [
    { n: d?.racha ?? 0, t: t["const.dias"] },
    { n: d?.total ?? 0, t: t["const.entrenos"] },
    { n: d?.parques ?? 0, t: t["const.parques"] },
  ];
  return (
    <section className="tarjeta grid gap-3" aria-label={t["const.titulo"]}>
      <h2 className="text-xl text-lava">{t["const.titulo"]}</h2>
      <div className="grid grid-cols-3 gap-2 text-center">
        {cifras.map((c) => (
          <div key={c.t}>
            <p className="titulo text-3xl text-dorado">{c.n}</p>
            <p className="text-xs text-suave">{c.t}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-suave">
        {d?.hoy ? t["const.hoy"] : t["const.marca"]}{" "}
        <Link href="/panel/mapa" className="text-lava underline">{t["const.buscar"]}</Link>
      </p>
    </section>
  );
}
