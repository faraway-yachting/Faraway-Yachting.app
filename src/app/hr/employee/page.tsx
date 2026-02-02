'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth';
import { employeesApi } from '@/lib/supabase/api/employees';
import { EmployeeAppShell } from '@/components/hr/EmployeeAppShell';
import EmployeeDashboard from '@/components/hr/EmployeeDashboard';

export default function EmployeePortalPage() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const emp = await employeesApi.getByUserId(user!.id);
        if (!emp) {
          setNotLinked(true);
        } else {
          setEmployee(emp);
        }
      } catch (error) {
        console.error('Failed to load employee profile:', error);
        setNotLinked(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <EmployeeAppShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </EmployeeAppShell>
    );
  }

  if (notLinked || !employee) {
    return (
      <EmployeeAppShell>
        <div className="text-center py-24">
          <p className="text-gray-500 text-lg">No employee profile linked to your account.</p>
          <p className="text-gray-400 text-sm mt-2">Please contact HR to link your profile.</p>
        </div>
      </EmployeeAppShell>
    );
  }

  return (
    <EmployeeAppShell employeeName={employee.full_name_en || employee.nickname}>
      <EmployeeDashboard employeeId={employee.id} employeeName={employee.full_name_en || employee.nickname || 'Employee'} />
    </EmployeeAppShell>
  );
}
