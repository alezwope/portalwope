"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [claro, setClaro] = useState(false);

  useEffect(() => {
    setClaro(document.documentElement.dataset.tema === "claro");
  }, []);

  function alternar() {
    const siguiente = !claro;
    setClaro(siguiente);
    if (siguiente) document.documentElement.dataset.tema = "claro";
    else delete document.documentElement.dataset.tema;
    try {
      localStorage.setItem("unibars-tema", siguiente ? "claro" : "oscuro");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="btn btn-borde !px-3 !py-2"
      aria-label={claro ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      title={claro ? "Modo oscuro" : "Modo claro"}
    >
      {claro ? "🌙" : "☀️"}
    </button>
  );
}
