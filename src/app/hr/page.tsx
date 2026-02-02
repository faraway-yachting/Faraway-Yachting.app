'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HRPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/hr/manager');
  }, [router]);
  return null;
}
