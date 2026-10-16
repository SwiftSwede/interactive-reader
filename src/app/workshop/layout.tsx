import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Charis_SIL, Open_Sans } from "next/font/google";
import Script from "next/script";
import { WorkshopLegalLinks } from "@/components/workshop/WorkshopLegalLinks";
import { workshopConfig } from "@/lib/workshop/config";
import "./workshop.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-open-sans",
  display: "swap",
});

const charis = Charis_SIL({
  subsets: ["latin", "latin-ext"],
  weight: ["700"],
  variable: "--font-ipa",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Taller de Escucha | Profe Kyle",
  description:
    "Taller gratis en vivo: los 3 sonidos que más les cuesta escuchar a los latinos. 45 minutos, el miércoles 28 de octubre.",
};

export default function WorkshopLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`workshop ${openSans.variable} ${charis.variable} ${openSans.className}`}>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${workshopConfig.pixelId}');
fbq('track', 'PageView');`}
      </Script>
      {children}
      <footer className="wk-footer">
        <div className="wk-column">
          <p>Profe Kyle</p>
          <a href="https://www.profekyle.com">www.profekyle.com</a>
          <WorkshopLegalLinks variant="footer" />
        </div>
      </footer>
    </div>
  );
}
