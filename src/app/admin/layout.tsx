import type { Metadata } from "next";
import Link from "next/link";
import Cabecera from "@/components/Cabecera";
import AdminNav from "@/components/AdminNav";
import { requerirEquipo, puede, SECCIONES_ADMIN } from "@/lib/permisos";

export const metadata: Metadata = { title: "Consola" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { equipo } = await requerirEquipo();
  const items = SECCIONES_ADMIN.filter((s) => !s.permiso || puede(equipo, s.permiso));

  return (
    <>
      <Cabecera />
      <main className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl">Consola</h1>
          <Link href="/panel" className="btn btn-borde">Volver al panel</Link>
        </div>
        <AdminNav items={items} />
        {children}
      </main>
    </>
  );
}
