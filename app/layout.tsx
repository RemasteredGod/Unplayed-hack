import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Conveyor Belt Health Monitoring — 3D Rig',
  description:
    'Sensor layout and motion bound to simulated telemetry: downward rip lasers reading the belt against an LDR array between the runs, CNN vision camera, head-bearing accelerometer.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
