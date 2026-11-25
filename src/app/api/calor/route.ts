// Actividad reciente por parque: [[parque_id, entrenamientos_30_dias, ahora], …]. Solo conteos, nunca personas.
export const revalidate = 300;

export async function GET() {
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/rpc/calor_parques`, {
    method: "POST",
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, "Content-Type": "application/json" },
    body: "{}",
    next: { revalidate: 300 },
  });
  if (!r.ok) return Response.json({ error: "No pudimos cargar la actividad." }, { status: 502 });
  return new Response(await r.text(), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" },
  });
}
