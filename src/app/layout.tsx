import type { Metadata } from "next";
import { Lora, Roboto_Flex } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import InAppBrowserRedirect from "@/components/InAppBrowserRedirect";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  weight: ["400", "600", "700"],
});

const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  variable: "--font-roboto-flex",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Profe Kyle",
  description:
    "Lee y escucha inglés con Profe Kyle. Toca cualquier palabra para ver la traducción y la pronunciación.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${lora.variable} ${robotoFlex.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <InAppBrowserRedirect />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
