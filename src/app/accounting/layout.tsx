'use client';

import { NotificationProvider } from '@/contexts/NotificationContext';

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
