import { redirect } from 'next/navigation';

/**
 * Accounting module entry point
 *
 * Redirects users directly to the manager dashboard.
 * The dashboard and navigation will be filtered based on
 * the user's actual permissions from the database.
 */
export default function AccountingPage() {
  redirect('/accounting/manager');
}
