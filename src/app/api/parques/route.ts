// Todos los parques en un solo JSON compacto: [id, lat, lng, categoria, aparatos, nombre].
// Se cachea una hora en el servidor para no consultar la base en cada visita.
export const revalidate = 3600;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const r = await fetch(`${url}/rest/v1/rpc/parques_mapa`, {
    method: "POST",
    headers: { apikey: clave, "Content-Type": "application/json" },
    body: "{}",
    next: { revalidate: 3600 },
  });
  if (!r.ok) return Response.json({ error: "No pudimos cargar los parques." }, { status: 502 });
  return new Response(await r.text(), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
