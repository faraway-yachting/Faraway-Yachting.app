import { redirect } from 'next/navigation';

/**
 * Bookings module entry point
 *
 * Redirects users directly to the manager calendar view.
 * The calendar and navigation will be filtered based on
 * the user's actual permissions from the database.
 */
export default function BookingsPage() {
  redirect('/bookings/manager/calendar');
}
