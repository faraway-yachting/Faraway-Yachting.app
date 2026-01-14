import { BookingsAppShell, BookingsRole } from '@/components/bookings/BookingsAppShell';
import { BookingSettingsProvider } from '@/contexts/BookingSettingsContext';

interface BookingsRoleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ role: string }>;
}

const validRoles: BookingsRole[] = ['admin', 'manager', 'agent', 'viewer'];

export default async function BookingsRoleLayout({
  children,
  params,
}: BookingsRoleLayoutProps) {
  const { role } = await params;

  // Validate role
  const currentRole = validRoles.includes(role as BookingsRole)
    ? (role as BookingsRole)
    : 'viewer';

  return (
    <BookingSettingsProvider>
      <BookingsAppShell currentRole={currentRole}>
        {children}
      </BookingsAppShell>
    </BookingSettingsProvider>
  );
}
