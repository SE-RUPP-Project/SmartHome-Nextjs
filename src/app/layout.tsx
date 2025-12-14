import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Inter } from 'next/font/google';
import './globals.css';
import { useDeviceStore } from '@/stores/deviceStore';
import { useWebSocket } from '@/hooks/useWebSocket';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Smart Home Dashboard',
  description: 'Complete smart home control with shadcn/ui',
  icons: {
    icon: "/icon.png",
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const updateDevice = useDeviceStore((state) => state.updateDevice);

  // useWebSocket((data) => {
  //   if (data.type === 'device_update') {
  //     updateDevice(data.device_id, data.updates);
  //   }
  // });

  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          expand={false}
        />
      </body>

    </html>
  );
}
