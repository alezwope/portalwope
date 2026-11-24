import { createClient } from "@supabase/supabase-js";

const POR_DEFECTO = { nombre: "UniBars", lema: "El Universo de las Barras" };

/** La marca vive en la base (config_marca). Si falla la lectura, se usan los valores por defecto. */
export async function obtenerMarca() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    const { data } = await supabase.from("config_marca").select("clave, valor").in("clave", ["nombre", "lema"]);
    const mapa = Object.fromEntries((data ?? []).map((f) => [f.clave, f.valor as string]));
    return { nombre: mapa.nombre ?? POR_DEFECTO.nombre, lema: mapa.lema ?? POR_DEFECTO.lema };
  } catch {
    return POR_DEFECTO;
  }
}
