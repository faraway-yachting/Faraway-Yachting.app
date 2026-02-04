import { ClientProviders } from './ClientProviders';

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientProviders>{children}</ClientProviders>;
}
