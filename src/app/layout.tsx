import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/cinzel";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { ProveedorIdioma } from "@/components/Idioma";
import { textos } from "@/lib/i18n/servidor";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "UniBars · El Universo de las Barras", template: "%s · UniBars" },
  description:
    "La red social de la calistenia: parques, niveles, entrenadores y comunidad en un solo lugar.",
  icons: { icon: "/icon.png", apple: "/brand/icon-192.png" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "UniBars · El Universo de las Barras",
    description: "La red social de la calistenia.",
    images: ["/brand/isologo.webp"],
    locale: "es_AR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090B" },
    { media: "(prefers-color-scheme: light)", color: "#F8F7F4" },
  ],
};

// Aplica el tema guardado antes de pintar para evitar el parpadeo. Oscuro por defecto, como la plantilla.
const SCRIPT_TEMA = `try{var t=localStorage.getItem('unibars-tema');if(t==='claro'){document.documentElement.dataset.tema='claro'}}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { idioma, t } = await textos();
  return (
    <html lang={idioma} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <ProveedorIdioma idioma={idioma} t={t}>{children}</ProveedorIdioma>
      </body>
    </html>
  );
}
