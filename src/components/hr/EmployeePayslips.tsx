'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { payrollSlipsApi, type PayrollSlip } from '@/lib/supabase/api/payrollSlips';

interface Props {
  employeeId: string;
}

export default function EmployeePayslips({ employeeId }: Props) {
  const [loading, setLoading] = useState(true);
  const [slips, setSlips] = useState<PayrollSlip[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await payrollSlipsApi.getByEmployee(employeeId);
        setSlips(data);
      } catch (error) {
        console.error('Failed to load payslips:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [employeeId]);

  const formatMoney = (n: number) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const handleViewPDF = async (slip: PayrollSlip) => {
    try {
      const { generateSummaryPDF } = await import('@/lib/payroll/generatePayslipPDF');
      const { companiesApi } = await import('@/lib/supabase/api/companies');
      let thaiCompany: any = null;
      if (slip.thai_company_id) {
        try { thaiCompany = await companiesApi.getById(slip.thai_company_id); } catch { /* ignore */ }
      }
      const run = (slip as any).payroll_run;
      const period = run ? `${monthNames[run.period_month]} ${run.period_year}` : 'Payslip';
      const doc = await generateSummaryPDF(slip, period, thaiCompany);
      const url = doc.output('bloburl');
      window.open(url as unknown as string, '_blank');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (slips.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No payslips found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Pay</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">PDF</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {slips.map((slip) => {
            const run = (slip as any).payroll_run;
            const period = run ? `${monthNames[run.period_month]} ${run.period_year}` : '-';
            const totalDed = Number(slip.ssf_employee) + Number(slip.withholding_tax) + Number(slip.advance_deduction) + Number(slip.other_deductions);
            return (
              <tr key={slip.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{period}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-700">{formatMoney(slip.gross_pay)}</td>
                <td className="px-4 py-3 text-sm text-right text-red-600">{formatMoney(totalDed)}</td>
                <td className="px-4 py-3 text-sm text-right font-bold text-green-700">{formatMoney(slip.net_pay)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${run?.status === 'paid' ? 'bg-green-100 text-green-700' : run?.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {run?.status || 'draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {run?.status === 'paid' || run?.status === 'approved' ? (
                    <button
                      onClick={() => handleViewPDF(slip)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[#5A7A8F] hover:bg-gray-100 rounded transition-colors"
                      title="View PDF"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
