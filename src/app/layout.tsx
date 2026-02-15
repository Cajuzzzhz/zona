import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from 'next/font/local';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sinaisFont = localFont({
  src: './fonts/Sinais.ttf', // O caminho onde você salvou
  variable: '--font-sinais', // O nome da variável CSS
  display: 'swap',
});

export const metadata: Metadata = {
  title: "mapa.tactical - Duga Radar Station",
  description: "Mapa tático interativo da Zona de Exclusão de Chernobyl",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sinaisFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
