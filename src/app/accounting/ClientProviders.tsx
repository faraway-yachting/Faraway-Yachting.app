'use client';

import { NotificationProvider } from '@/contexts/NotificationContext';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
