/**
 * ¿La contraseña apareció en filtraciones conocidas? Usa Pwned Passwords (gratis) por rangos:
 * solo viajan los 5 primeros caracteres del hash SHA-1; la contraseña nunca sale del navegador.
 * Si el servicio no responde, deja pasar (no bloquea el registro).
 */
export async function claveFiltrada(clave: string): Promise<boolean> {
  try {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(clave));
    const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hex.slice(0, 5)}`, { headers: { "Add-Padding": "true" } });
    if (!res.ok) return false;
    const resto = hex.slice(5);
    return (await res.text()).split("\n").some((l) => { const [suf, n] = l.trim().split(":"); return suf === resto && Number(n) > 0; });
  } catch {
    return false;
  }
}
