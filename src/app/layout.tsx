import type { Metadata } from 'next';
import { Anek_Latin, DM_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { ChatWidget } from "@/components/ai/ChatWidget";

const anekLatin = Anek_Latin({
  subsets: ['latin'],
  variable: '--font-anek-latin',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Control AMA Evolutivos - Altim',
  description: 'Dashboard operativo para la gestión de evolutivos en Altim.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Control AMA',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${anekLatin.variable} ${dmSans.variable} antialiased bg-[#F0F0F0]`}>
        <Providers>
          {children}
          {/* <ChatWidget /> */}
        </Providers>
      </body>
    </html>
  );
}
