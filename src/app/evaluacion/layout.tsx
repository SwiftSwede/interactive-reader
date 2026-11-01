import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Open_Sans } from "next/font/google";
import "./evaluacion.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Evaluación de inglés | Profe Kyle",
  description:
    "¿No sabes tu nivel de inglés? Toma esta evaluación corta para saber más o menos tu nivel.",
};

export default function EvaluacionLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`evaluacion-classic ${openSans.variable} ${openSans.className}`}>
      {children}
    </div>
  );
}
