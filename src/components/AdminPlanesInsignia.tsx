"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/lib/supabase/client";

type Textos = Record<string, string>;
export type PlanInsignia = {
  rol: string; nombre: Textos; subtitulo: Textos; activo: boolean;
  precio_mensual_usd: number; precio_anual_usd: number | null;
  descuento_fundador_pct: number; prueba_dias: number;
};
export type BeneficioInsignia = { clave: string; nombre: Textos; activo: boolean };

const ROLES: Record<string, string> = {
  entrenador: "Entrenador/a", wellness: "Bienestar", tienda_fisica: "Tienda física",
  tienda_digital: "Tienda digital", constructor: "Constructor de parques", persona: "Persona",
};
const IDIOMAS = ["es", "en", "pt"] as const;

function TarjetaPlan({ plan, beneficios, incluidos }: { plan: PlanInsignia; beneficios: BeneficioInsignia[]; incluidos: string[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState<Textos>(plan.nombre);
  const [subtitulo, setSubtitulo] = useState<Textos>(plan.subtitulo);
  const [activo, setActivo] = useState(plan.activo);
  const [mensual, setMensual] = useState(String(plan.precio_mensual_usd));
  const [anual, setAnual] = useState(plan.precio_anual_usd == null ? "" : String(plan.precio_anual_usd));
  const [fundador, setFundador] = useState(String(plan.descuento_fundador_pct));
  const [prueba, setPrueba] = useState(String(plan.prueba_dias));
  const [con, setCon] = useState<Set<string>>(new Set(incluidos));
  const [estado, setEstado] = useState<"" | "guardando" | "ok" | "error">("");
  const [mensajeError, setMensajeError] = useState("");

  async function guardar() {
    setEstado("guardando");
    const { error } = await crearCliente().rpc("admin_plan_guardar", {
      p_rol: plan.rol,
      p_datos: {
        nombre, subtitulo, activo,
        precio_mensual_usd: Number(mensual),
        precio_anual_usd: anual === "" ? null : Number(anual),
        descuento_fundador_pct: Number(fundador),
        prueba_dias: Number(prueba),
      },
    });
    if (error) { setEstado("error"); setMensajeError(error.message); return; }
    setEstado("ok");
    router.refresh();
  }

  async function alternar(clave: string) {
    const nuevo = !con.has(clave);
    const copia = new Set(con);
    if (nuevo) copia.add(clave);
    else copia.delete(clave);
    setCon(copia);
    const { error } = await crearCliente().rpc("admin_plan_beneficio", { p_rol: plan.rol, p_beneficio: clave, p_incluido: nuevo });
    if (error) { setCon(new Set(con)); setEstado("error"); setMensajeError(error.message); }
  }

  return (
    <details className="tarjeta" open={plan.rol === "entrenador"}>
      <summary className="cursor-pointer text-lg">
        {ROLES[plan.rol] ?? plan.rol} <span className="text-suave text-sm">· ${plan.precio_mensual_usd}/mes · {con.size} beneficios{!activo && " · apagado"}</span>
      </summary>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {IDIOMAS.map((i) => (
            <label key={i} className="grid gap-1 text-sm">Nombre ({i})
              <input className="campo" value={nombre[i] ?? ""} onChange={(e) => setNombre({ ...nombre, [i]: e.target.value })} />
            </label>
          ))}
          {IDIOMAS.map((i) => (
            <label key={i} className="grid gap-1 text-sm">Subtítulo ({i})
              <input className="campo" value={subtitulo[i] ?? ""} onChange={(e) => setSubtitulo({ ...subtitulo, [i]: e.target.value })} />
            </label>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <label className="grid gap-1 text-sm">Precio mensual (USD)
            <input className="campo" inputMode="decimal" value={mensual} onChange={(e) => setMensual(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">Precio anual (USD)
            <input className="campo" inputMode="decimal" value={anual} onChange={(e) => setAnual(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">Descuento fundador (%)
            <input className="campo" inputMode="numeric" value={fundador} onChange={(e) => setFundador(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">Prueba gratis (días)
            <input className="campo" inputMode="numeric" value={prueba} onChange={(e) => setPrueba(e.target.value)} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          Plan activo (visible para la comunidad)
        </label>

        <div>
          <p className="mb-2 text-sm text-suave">Beneficios incluidos (se guardan al marcar)</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {beneficios.map((b) => (
              <label key={b.clave} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={con.has(b.clave)} onChange={() => alternar(b.clave)} />
                {b.nombre.es ?? b.clave}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-lava" onClick={guardar} disabled={estado === "guardando"}>
            {estado === "guardando" ? "Guardando…" : "Guardar plan"}
          </button>
          {estado === "ok" && <span className="aviso-ok">Guardado</span>}
          {estado === "error" && <span className="aviso-error">{mensajeError || "No se pudo guardar"}</span>}
        </div>
      </div>
    </details>
  );
}

export default function AdminPlanesInsignia(props: {
  planes: PlanInsignia[]; beneficios: BeneficioInsignia[]; incluidos: Record<string, string[]>;
}) {
  return (
    <div className="grid gap-4">
      {props.planes.map((p) => (
        <TarjetaPlan key={p.rol} plan={p} beneficios={props.beneficios} incluidos={props.incluidos[p.rol] ?? []} />
      ))}
    </div>
  );
}
