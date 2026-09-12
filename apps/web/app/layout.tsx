import type { ReactNode } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

export const metadata = {
  title: 'LUNAD Mobility',
  description: 'Sta. Magdalena mobility laboratory',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}