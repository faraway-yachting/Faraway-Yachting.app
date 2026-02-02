'use client';

import { useState } from 'react';
import { HRAppShell } from '@/components/hr/HRAppShell';
import LeaveRequestList from '@/components/hr/LeaveRequestList';
import LeaveCalendar from '@/components/hr/LeaveCalendar';
import { List, CalendarDays } from 'lucide-react';

export default function LeavePage() {
  const [view, setView] = useState<'list' | 'calendar'>('list');

  return (
    <HRAppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage leave requests and view the team calendar.</p>
          </div>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </button>
          </div>
        </div>
        {view === 'list' ? <LeaveRequestList /> : <LeaveCalendar />}
      </div>
    </HRAppShell>
  );
}
