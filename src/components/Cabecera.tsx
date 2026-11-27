import Image from "next/image";
import Link from "next/link";
import Preferencias from "@/components/Preferencias";

/** Cabecera de las páginas públicas (puerta, mapa público, fichas). La app usa su propio esqueleto. */
export default function Cabecera({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-borde bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" aria-label="UniBars" className="flex items-center gap-2">
          <Image src="/brand/isotipo-96.png" alt="" width={40} height={40} priority className="logo-fundido h-9 w-9" />
          <Image src="/brand/logotipo.png" alt="UniBars" width={150} height={32} priority className="logo-fundido hidden h-7 w-auto sm:block" />
        </Link>
        <div className="flex items-center gap-2">
          <Preferencias />
          {children}
        </div>
      </div>
    </header>
  );
}
