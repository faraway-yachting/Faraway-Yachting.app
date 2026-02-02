'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, CheckCircle2, Banknote, DollarSign, Users, TrendingDown, FileText, Download } from 'lucide-react';
import { payrollRunsApi, type PayrollRun } from '@/lib/supabase/api/payrollRuns';
import { payrollSlipsApi, type PayrollSlip, calcSSF } from '@/lib/supabase/api/payrollSlips';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { createClient } from '@/lib/supabase/client';
import { PAYROLL_RUN_STATUS_LABELS, PAYROLL_RUN_STATUS_COLORS, type PayrollRunStatus } from '@/data/hr/types';
import { generateAllPayslipPDFs, generateSummaryPDF, generateThaiPayslipPDF, generateAwayCharterInvoicePDF } from '@/lib/payroll/generatePayslipPDF';
import { companiesApi } from '@/lib/supabase/api/companies';

interface BankAccount {
  id: string;
  account_name: string;
}

export default function PayrollRunDetail({ runId }: { runId: string }) {
  const router = useRouter();
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [slips, setSlips] = useState<PayrollSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Pay modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payBankAccountId, setPayBankAccountId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // PDF dropdown
  const [pdfMenuSlipId, setPdfMenuSlipId] = useState<string | null>(null);
  const pdfMenuRef = useRef<HTMLDivElement>(null);

  // Close PDF menu on outside click
  useEffect(() => {
    if (!pdfMenuSlipId) return;
    const handler = (e: MouseEvent) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) {
        setPdfMenuSlipId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pdfMenuSlipId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [r, s] = await Promise.all([
        payrollRunsApi.getById(runId),
        payrollSlipsApi.getByRun(runId),
      ]);
      setRun(r);
      setSlips(s);

      // Auto-fill Thai Company / Away Charter for slips missing the split
      if (r?.status === 'draft') {
        for (const slip of s) {
          const thaiReg = Number(slip.thai_registered_salary) || Number(slip.employee?.thai_registered_salary) || 0;
          if (thaiReg > 0 && !Number(slip.thai_company_amount)) {
            const grossPay = Number(slip.base_salary) + Number(slip.charter_bonus) + Number(slip.overtime_amount) + Number(slip.commission_amount) + Number(slip.allowances) + Number(slip.other_earnings);
            const totalDed = Number(slip.ssf_employee) + Number(slip.withholding_tax) + Number(slip.advance_deduction) + Number(slip.other_deductions);
            const netPay = grossPay - totalDed;
            const thaiCo = Math.max(0, thaiReg - Number(slip.ssf_employee) - Number(slip.withholding_tax) - Number(slip.advance_deduction) - Number(slip.other_deductions));
            const awayCharter = Math.round((netPay - thaiCo) * 100) / 100;
            const empCurrency = (slip as any).employee_currency || 'THB';
            const fxRate = Number((slip as any).fx_rate) || 1;
            const awayOriginal = empCurrency !== 'THB' && fxRate > 0
              ? Math.round((awayCharter / fxRate) * 100) / 100
              : awayCharter;
            await payrollSlipsApi.update(slip.id, {
              thai_registered_salary: thaiReg,
              thai_company_amount: Math.round(thaiCo * 100) / 100,
              away_charter_amount: awayCharter,
              away_charter_original: awayOriginal,
            } as any);
          }
        }
        // Reload if any were updated
        if (s.some(slip => {
          const thaiReg = Number(slip.thai_registered_salary) || Number(slip.employee?.thai_registered_salary) || 0;
          return thaiReg > 0 && !Number(slip.thai_company_amount);
        })) {
          const [r2, s2] = await Promise.all([
            payrollRunsApi.getById(runId),
            payrollSlipsApi.getByRun(runId),
          ]);
          setRun(r2);
          setSlips(s2);
        }
      }

      // Load bank accounts for the company
      if (r?.company_id) {
        try {
          const accounts = await bankAccountsApi.getByCompanyActive(r.company_id);
          setBankAccounts(accounts.map((a: any) => ({ id: a.id, account_name: a.account_name })));
        } catch { setBankAccounts([]); }
      }
    } catch (error) {
      console.error('Failed to load payroll run:', error);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async () => {
    if (!run || !confirm('Approve this payroll run?')) return;
    setActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await payrollRunsApi.approve(run.id, user.id);
      await loadData();
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve payroll run.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!run || !payBankAccountId) return;
    setActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await payrollRunsApi.markPaid(run.id, payBankAccountId, payDate, user.id);
      setShowPayModal(false);
      await loadData();
    } catch (error) {
      console.error('Failed to mark paid:', error);
      alert('Failed to mark payroll as paid.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSlipUpdate = async (slipId: string, field: string, value: number) => {
    const slip = slips.find(s => s.id === slipId);
    if (!slip) return;

    // Recalculate SSF if base_salary changed
    const updates: any = { [field]: value };
    if (field === 'base_salary') {
      const empSsfEnabled = slip.employee?.ssf_enabled !== false;
      const empSsfOverride = slip.employee?.ssf_override;
      if (empSsfEnabled) {
        if (empSsfOverride != null && empSsfOverride !== '') {
          updates.ssf_employee = Number(empSsfOverride);
          updates.ssf_employer = Number(empSsfOverride);
        } else {
          const ssf = calcSSF(value);
          updates.ssf_employee = ssf.employee;
          updates.ssf_employer = ssf.employer;
        }
      } else {
        updates.ssf_employee = 0;
        updates.ssf_employer = 0;
      }
    }

    // Recalculate Thai Company / Away Charter split
    const merged = { ...slip, ...updates };
    const grossPay = Number(merged.base_salary) + Number(merged.charter_bonus) + Number(merged.overtime_amount) + Number(merged.commission_amount) + Number(merged.allowances) + Number(merged.other_earnings);
    const totalDed = Number(merged.ssf_employee) + Number(merged.withholding_tax) + Number(merged.advance_deduction) + Number(merged.other_deductions);
    const netPay = grossPay - totalDed;
    const thaiRegistered = Number(merged.thai_registered_salary) || Number(slip.employee?.thai_registered_salary) || 0;

    if (thaiRegistered > 0) {
      const thaiCo = Math.max(0, thaiRegistered - Number(merged.ssf_employee) - Number(merged.withholding_tax) - Number(merged.advance_deduction) - Number(merged.other_deductions));
      updates.thai_company_amount = Math.round(thaiCo * 100) / 100;
      updates.away_charter_amount = Math.round((netPay - thaiCo) * 100) / 100;
    } else {
      updates.thai_company_amount = 0;
      updates.away_charter_amount = Math.round(netPay * 100) / 100;
    }

    // Recalculate away_charter_original for non-THB employees
    const empCurrency = (slip as any).employee_currency || 'THB';
    const fxRate = Number((slip as any).fx_rate) || 1;
    if (empCurrency !== 'THB' && fxRate > 0) {
      updates.away_charter_original = Math.round((updates.away_charter_amount / fxRate) * 100) / 100;
    }

    // Store thai_registered_salary on slip if not yet set
    if (!Number(slip.thai_registered_salary) && thaiRegistered > 0) {
      updates.thai_registered_salary = thaiRegistered;
    }

    try {
      await payrollSlipsApi.update(slipId, updates);
      await loadData();
    } catch (error) {
      console.error('Failed to update slip:', error);
    }
  };

  const handleViewPDF = async (slip: PayrollSlip, type: 'summary' | 'thai' | 'invoice') => {
    if (!run) return;
    setPdfMenuSlipId(null);
    const period = `${monthNames[run.period_month]} ${run.period_year}`;
    try {
      let thaiCompany: any = null;
      if (slip.thai_company_id) {
        try { thaiCompany = await companiesApi.getById(slip.thai_company_id); } catch { /* ignore */ }
      }
      let doc: any = null;
      if (type === 'summary') {
        doc = await generateSummaryPDF(slip, period, thaiCompany);
      } else if (type === 'thai') {
        doc = await generateThaiPayslipPDF(slip, period, thaiCompany);
      } else if (type === 'invoice') {
        doc = await generateAwayCharterInvoicePDF(slip, period);
      }
      if (doc) {
        const url = doc.output('bloburl');
        window.open(url as string, '_blank');
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF.');
    }
  };

  const handleDownloadAllPDFs = async () => {
    if (!run || slips.length === 0) return;
    setActionLoading(true);
    try {
      const period = `${monthNames[run.period_month]} ${run.period_year}`;
      await generateAllPayslipPDFs(slips, period);
    } catch (error) {
      console.error('Failed to generate PDFs:', error);
      alert('Failed to generate PDFs.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatMoney = (n: number) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!run) {
    return <p className="text-gray-500">Payroll run not found.</p>;
  }

  const isDraft = run.status === 'draft';

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/hr/manager/payroll')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Payroll Runs
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{run.run_number}</h2>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${PAYROLL_RUN_STATUS_COLORS[run.status as PayrollRunStatus]}`}>
              {PAYROLL_RUN_STATUS_LABELS[run.status as PayrollRunStatus]}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{monthNames[run.period_month]} {run.period_year}</p>
        </div>
        <div className="flex items-center gap-2">
          {slips.length > 0 && (
            <button
              onClick={handleDownloadAllPDFs}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download All PDFs
            </button>
          )}
          {run.status === 'draft' && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Approve
            </button>
          )}
          {run.status === 'approved' && (
            <button
              onClick={() => setShowPayModal(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
            >
              <Banknote className="h-4 w-4" />
              Mark as Paid
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {(() => {
        // Department breakdown
        const deptMap: Record<string, { count: number; net: number }> = {};
        for (const s of slips) {
          const dept = s.employee?.department || 'Unassigned';
          if (!deptMap[dept]) deptMap[dept] = { count: 0, net: 0 };
          deptMap[dept].count++;
          deptMap[dept].net += Number(s.net_pay);
        }
        const depts = Object.entries(deptMap).sort((a, b) => b[1].net - a[1].net);

        // Currency breakdown for net pay (in original currencies)
        const currMap: Record<string, number> = {};
        for (const s of slips) {
          const cur = s.employee_currency || 'THB';
          if (cur !== 'THB') {
            currMap[cur] = (currMap[cur] || 0) + Number(s.away_charter_original);
            // Thai Co portion is always THB
            currMap['THB'] = (currMap['THB'] || 0) + Number(s.thai_company_amount);
          } else {
            currMap['THB'] = (currMap['THB'] || 0) + Number(s.net_pay);
          }
        }
        const currencies = Object.entries(currMap).sort((a, b) => a[0] === 'THB' ? -1 : b[0] === 'THB' ? 1 : 0);
        const hasMixed = currencies.length > 1;

        return (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs font-medium">Employees</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{run.employee_count}</p>
              {depts.length > 1 && (
                <div className="mt-2 space-y-0.5">
                  {depts.map(([dept, info]) => (
                    <div key={dept} className="flex justify-between text-[11px] text-gray-500">
                      <span>{dept}</span>
                      <span>{info.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">Total Gross</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(run.total_gross)} <span className="text-sm font-medium text-gray-400">THB</span></p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs font-medium">Total Deductions</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{formatMoney(run.total_deductions)} <span className="text-sm font-medium text-gray-400">THB</span></p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Banknote className="h-4 w-4" />
                <span className="text-xs font-medium">Total Net Pay</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{formatMoney(run.total_net)} <span className="text-sm font-medium text-gray-400">THB</span></p>
              {hasMixed && (
                <div className="mt-1 space-y-0.5">
                  {currencies.map(([cur, amt]) => (
                    <div key={cur} className="text-[11px] text-gray-500">
                      {formatMoney(amt)} {cur}
                    </div>
                  ))}
                </div>
              )}
              {!hasMixed && <p className="text-[11px] text-gray-400">THB</p>}
            </div>
          </div>
        );
      })()}

      {/* Department Summary */}
      {(() => {
        const deptMap: Record<string, { count: number; net: number; thaiCo: number; away: number }> = {};
        for (const s of slips) {
          const dept = s.employee?.department || 'Unassigned';
          if (!deptMap[dept]) deptMap[dept] = { count: 0, net: 0, thaiCo: 0, away: 0 };
          deptMap[dept].count++;
          deptMap[dept].net += Number(s.net_pay);
          deptMap[dept].thaiCo += Number(s.thai_company_amount);
          deptMap[dept].away += Number(s.away_charter_amount);
        }
        const depts = Object.entries(deptMap).sort((a, b) => b[1].net - a[1].net);
        if (depts.length <= 1) return null;

        return (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Employees</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Net Pay (THB)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thai Co. (THB)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Away Charter (THB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {depts.map(([dept, info]) => (
                  <tr key={dept} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{dept}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{info.count}</td>
                    <td className="px-4 py-2 text-right font-medium text-green-700">{formatMoney(info.net)}</td>
                    <td className="px-4 py-2 text-right text-purple-700">{formatMoney(info.thaiCo)}</td>
                    <td className="px-4 py-2 text-right text-orange-700">{formatMoney(info.away)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Slips Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Employee</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Base Salary</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Charter Bonus</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">OT</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Commission</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Allowances</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap bg-blue-50">Gross</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">SSF</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">WHT</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Other Ded.</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap bg-green-50">Net Pay</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap bg-purple-50">Thai Co.</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap bg-orange-50">Away Charter</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {slips.map(slip => (
              <tr key={slip.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-900 font-medium whitespace-nowrap">
                  {slip.employee?.full_name_en || '—'}
                  {slip.employee?.nickname && <span className="text-gray-400 ml-1 text-xs">({slip.employee.nickname})</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  {isDraft ? (
                    <input
                      type="number"
                      value={Number(slip.base_salary)}
                      onChange={(e) => handleSlipUpdate(slip.id, 'base_salary', Number(e.target.value) || 0)}
                      className="w-24 px-1.5 py-0.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                    />
                  ) : (
                    formatMoney(slip.base_salary)
                  )}
                  {slip.employee_currency && slip.employee_currency !== 'THB' && (
                    <div className="text-[10px] text-gray-400">{formatMoney(slip.base_salary_original)} {slip.employee_currency} @{slip.fx_rate}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">{formatMoney(slip.charter_bonus)}</td>
                <td className="px-3 py-2 text-right">
                  {isDraft ? (
                    <input
                      type="number"
                      value={Number(slip.overtime_amount)}
                      onChange={(e) => handleSlipUpdate(slip.id, 'overtime_amount', Number(e.target.value) || 0)}
                      className="w-20 px-1.5 py-0.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                    />
                  ) : (
                    formatMoney(slip.overtime_amount)
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">{formatMoney(slip.commission_amount)}</td>
                <td className="px-3 py-2 text-right">
                  {isDraft ? (
                    <input
                      type="number"
                      value={Number(slip.allowances)}
                      onChange={(e) => handleSlipUpdate(slip.id, 'allowances', Number(e.target.value) || 0)}
                      className="w-20 px-1.5 py-0.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                    />
                  ) : (
                    formatMoney(slip.allowances)
                  )}
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-900 bg-blue-50">{formatMoney(slip.gross_pay)}</td>
                <td className="px-3 py-2 text-right text-red-600">{formatMoney(slip.ssf_employee)}</td>
                <td className="px-3 py-2 text-right">
                  {isDraft ? (
                    <input
                      type="number"
                      value={Number(slip.withholding_tax)}
                      onChange={(e) => handleSlipUpdate(slip.id, 'withholding_tax', Number(e.target.value) || 0)}
                      className="w-20 px-1.5 py-0.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                    />
                  ) : (
                    formatMoney(slip.withholding_tax)
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {isDraft ? (
                    <input
                      type="number"
                      value={Number(slip.other_deductions)}
                      onChange={(e) => handleSlipUpdate(slip.id, 'other_deductions', Number(e.target.value) || 0)}
                      className="w-20 px-1.5 py-0.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                    />
                  ) : (
                    formatMoney(slip.other_deductions)
                  )}
                </td>
                <td className="px-3 py-2 text-right font-bold text-green-700 bg-green-50">{formatMoney(slip.net_pay)}</td>
                <td className="px-3 py-2 text-right text-purple-700 bg-purple-50">{formatMoney(slip.thai_company_amount)}</td>
                <td className="px-3 py-2 text-right text-orange-700 bg-orange-50">
                  {slip.employee_currency && slip.employee_currency !== 'THB' ? (
                    <>
                      <div>{formatMoney(slip.away_charter_original)} {slip.employee_currency}</div>
                      <div className="text-[10px] text-gray-400">{formatMoney(slip.away_charter_amount)} THB</div>
                    </>
                  ) : (
                    formatMoney(slip.away_charter_amount)
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="relative" ref={pdfMenuSlipId === slip.id ? pdfMenuRef : undefined}>
                    <button
                      type="button"
                      onClick={() => setPdfMenuSlipId(pdfMenuSlipId === slip.id ? null : slip.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[#5A7A8F] hover:bg-gray-100 rounded transition-colors"
                      title="View PDFs"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    {pdfMenuSlipId === slip.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 w-48">
                        <button
                          onClick={() => handleViewPDF(slip, 'summary')}
                          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Summary
                        </button>
                        {Number(slip.thai_company_amount) > 0 && (
                          <button
                            onClick={() => handleViewPDF(slip, 'thai')}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Thai Payslip
                          </button>
                        )}
                        {Number(slip.away_charter_amount) > 0 && (
                          <button
                            onClick={() => handleViewPDF(slip, 'invoice')}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Away Charter Invoice
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-semibold">
            <tr>
              <td className="px-3 py-2 text-gray-700">Totals ({slips.length} employees)</td>
              <td className="px-3 py-2 text-right">{formatMoney(slips.reduce((s, sl) => s + Number(sl.base_salary), 0))}</td>
              <td className="px-3 py-2 text-right">{formatMoney(slips.reduce((s, sl) => s + Number(sl.charter_bonus), 0))}</td>
              <td className="px-3 py-2 text-right">{formatMoney(slips.reduce((s, sl) => s + Number(sl.overtime_amount), 0))}</td>
              <td className="px-3 py-2 text-right">{formatMoney(slips.reduce((s, sl) => s + Number(sl.commission_amount), 0))}</td>
              <td className="px-3 py-2 text-right">{formatMoney(slips.reduce((s, sl) => s + Number(sl.allowances), 0))}</td>
              <td className="px-3 py-2 text-right text-gray-900 bg-blue-50">{formatMoney(run.total_gross)}</td>
              <td className="px-3 py-2 text-right text-red-600">{formatMoney(slips.reduce((s, sl) => s + Number(sl.ssf_employee), 0))}</td>
              <td className="px-3 py-2 text-right">{formatMoney(slips.reduce((s, sl) => s + Number(sl.withholding_tax), 0))}</td>
              <td className="px-3 py-2 text-right">{formatMoney(slips.reduce((s, sl) => s + Number(sl.other_deductions), 0))}</td>
              <td className="px-3 py-2 text-right text-green-700 bg-green-50">{formatMoney(run.total_net)}</td>
              <td className="px-3 py-2 text-right text-purple-700 bg-purple-50">{formatMoney(slips.reduce((s, sl) => s + Number(sl.thai_company_amount), 0))}</td>
              <td className="px-3 py-2 text-right text-orange-700 bg-orange-50">{formatMoney(slips.reduce((s, sl) => s + Number(sl.away_charter_amount), 0))}</td>
              <td className="px-3 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* SSF Employer note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <p className="text-sm text-blue-800">
          Employer SSF contribution: <strong>{formatMoney(run.total_employer_ssf)} THB</strong> (5% capped at 750 THB per employee)
        </p>
      </div>

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/50" onClick={() => setShowPayModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Mark as Paid</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account *</label>
              <select
                value={payBankAccountId}
                onChange={(e) => setPayBankAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
              >
                <option value="">Select bank account...</option>
                {bankAccounts.map(ba => (
                  <option key={ba.id} value={ba.id}>{ba.account_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Total Net Pay: <strong className="text-gray-900">{formatMoney(run.total_net)} THB</strong></p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPayModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={actionLoading || !payBankAccountId}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
