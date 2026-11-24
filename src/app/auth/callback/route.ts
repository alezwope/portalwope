import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";
import { rutaSegura, urlDelSitio } from "@/lib/sesion";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const base = urlDelSitio(origin);
  const codigo = searchParams.get("code");
  const siguiente = rutaSegura(searchParams.get("siguiente"));

  if (codigo) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(`${base}${siguiente}`);
  }
  return NextResponse.redirect(`${base}/entrar?error=enlace`);
}
