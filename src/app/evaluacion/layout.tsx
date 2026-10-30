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
    "¿Puedes ganarme? Una evaluación rápida de inglés, sin registro. Al final te digo tu nivel y qué te falta.",
};

export default function EvaluacionLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`evaluacion-classic ${openSans.variable} ${openSans.className}`}>
      {children}
    </div>
  );
}
