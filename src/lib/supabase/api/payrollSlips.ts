import { createClient } from '../client';
import { THAILAND_SSF_RATE, THAILAND_SSF_CAP } from '@/data/hr/types';
import { getExchangeRate, convertToTHB } from '@/lib/exchangeRate/service';

export interface PayrollSlip {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  base_salary: number;
  charter_bonus: number;
  overtime_amount: number;
  commission_amount: number;
  allowances: number;
  other_earnings: number;
  gross_pay: number;
  ssf_employee: number;
  withholding_tax: number;
  advance_deduction: number;
  other_deductions: number;
  total_deductions: number;
  ssf_employer: number;
  net_pay: number;
  earnings_detail: any[];
  deductions_detail: any[];
  thai_registered_salary: number;
  thai_company_amount: number;
  away_charter_amount: number;
  thai_company_id: string | null;
  employee_currency: string;
  fx_rate: number;
  fx_rate_source: string;
  base_salary_original: number;
  away_charter_original: number;
  away_charter_currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  employee?: any;
}

export function calcSSF(baseSalary: number): { employee: number; employer: number } {
  const amount = Math.min(baseSalary * THAILAND_SSF_RATE, THAILAND_SSF_CAP);
  return { employee: Math.round(amount * 100) / 100, employer: Math.round(amount * 100) / 100 };
}

export const payrollSlipsApi = {
  async getByRun(runId: string): Promise<PayrollSlip[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('payroll_slips')
      .select('*, employee:employees(id, employee_id, full_name_en, full_name_th, nickname, position, department, base_salary, company_id, thai_registered_salary, away_charter_description, ssf_enabled, ssf_override)')
      .eq('payroll_run_id', runId)
      .order('employee(full_name_en)', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getByEmployee(employeeId: string): Promise<PayrollSlip[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('payroll_slips')
      .select('*, payroll_run:payroll_runs(id, period_year, period_month, status)')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async upsert(slip: {
    payroll_run_id: string;
    employee_id: string;
    base_salary?: number;
    charter_bonus?: number;
    overtime_amount?: number;
    commission_amount?: number;
    allowances?: number;
    other_earnings?: number;
    ssf_employee?: number;
    withholding_tax?: number;
    advance_deduction?: number;
    other_deductions?: number;
    ssf_employer?: number;
    earnings_detail?: any[];
    deductions_detail?: any[];
    notes?: string | null;
  }): Promise<PayrollSlip> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('payroll_slips')
      .upsert([{
        ...slip,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'payroll_run_id,employee_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async generateForRun(runId: string, periodYear: number, periodMonth: number): Promise<number> {
    const supabase = createClient();

    // Get ALL active employees (no company filter)
    const { data: employees, error: empErr } = await (supabase as any)
      .from('employees')
      .select('id, base_salary, currency, company_id, thai_registered_salary, away_charter_description, ssf_enabled, ssf_override')
      .eq('status', 'active');
    if (empErr) throw empErr;
    if (!employees || employees.length === 0) return 0;

    // Get bookings for this period to calculate charter bonuses
    const periodStart = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(periodYear, periodMonth, 0).getDate();
    const periodEnd = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${lastDay}`;

    // Get booking crew assignments for bookings in this period
    const { data: bookingCrew } = await (supabase as any)
      .from('booking_crew')
      .select('employee_id, booking_id, bookings!inner(id, charter_date_from, charter_date_to, charter_type)')
      .gte('bookings.charter_date_from', periodStart)
      .lte('bookings.charter_date_from', periodEnd);

    // Get charter rates for all employees
    const { data: charterRates } = await (supabase as any)
      .from('employee_charter_rates')
      .select('*');

    // Get commission records for this period
    const { data: commissions } = await (supabase as any)
      .from('commission_records')
      .select('*')
      .gte('charter_date_from', periodStart)
      .lte('charter_date_from', periodEnd);

    // Determine season (Nov-Apr = high, May-Oct = low)
    const season = (periodMonth >= 11 || periodMonth <= 4) ? 'high' : 'low';

    // Fetch FX rates for non-THB employees
    const periodDate = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
    const fxRateCache: Record<string, { rate: number; source: string }> = {};
    for (const emp of employees) {
      const currency = emp.currency || 'THB';
      if (currency !== 'THB' && !fxRateCache[currency]) {
        const result = await getExchangeRate(currency as any, periodDate);
        if (result.success && result.rate) {
          fxRateCache[currency] = { rate: result.rate, source: result.source || 'bot' };
        } else {
          // Fallback: rate 1 with warning (should not happen in prod)
          fxRateCache[currency] = { rate: 1, source: 'missing' };
        }
      }
    }

    // Generate slips
    const slips: any[] = [];
    for (const emp of employees) {
      const employeeCurrency = emp.currency || 'THB';
      const salaryOriginal = Number(emp.base_salary) || 0;
      const fxInfo = fxRateCache[employeeCurrency] || { rate: 1, source: 'bot' };
      const fxRate = fxInfo.rate;
      // Convert salary to THB for all calculations
      const salary = employeeCurrency !== 'THB' ? convertToTHB(salaryOriginal, fxRate) : salaryOriginal;

      let ssfEmployee = 0;
      let ssfEmployer = 0;
      if (emp.ssf_enabled !== false) {
        if (emp.ssf_override != null && emp.ssf_override !== '') {
          ssfEmployee = Number(emp.ssf_override);
          ssfEmployer = Number(emp.ssf_override);
        } else {
          const ssf = calcSSF(salary);
          ssfEmployee = ssf.employee;
          ssfEmployer = ssf.employer;
        }
      }

      // Calculate charter bonus
      let charterBonus = 0;
      const earningsDetail: any[] = [];

      if (bookingCrew) {
        const empBookings = bookingCrew.filter((bc: any) => bc.employee_id === emp.id);
        for (const bc of empBookings) {
          const booking = bc.bookings;
          if (!booking) continue;

          // Find rate for this charter type and season
          const charterType = booking.charter_type || 'full_day';
          const rate = charterRates?.find((r: any) =>
            r.employee_id === emp.id &&
            r.charter_rate_type === charterType &&
            r.season === season
          );

          if (rate) {
            // Calculate days
            const from = new Date(booking.charter_date_from);
            const to = new Date(booking.charter_date_to || booking.charter_date_from);
            const days = Math.max(1, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
            const bonus = Number(rate.rate_amount) * days;
            charterBonus += bonus;
            earningsDetail.push({
              label: `Charter ${charterType} (${days}d)`,
              amount: bonus,
              booking_id: booking.id,
            });
          }
        }
      }

      // Calculate commission
      let commissionAmount = 0;
      if (commissions) {
        const empCommissions = commissions.filter((c: any) => c.booking_owner_id === emp.id);
        for (const c of empCommissions) {
          commissionAmount += Number(c.total_commission) || 0;
        }
      }

      // Calculate company split
      const thaiRegistered = Number(emp.thai_registered_salary) || 0;
      const grossPay = salary + charterBonus + commissionAmount;
      const totalDeductions = ssfEmployee;
      const netPay = grossPay - totalDeductions;

      let thaiCompanyAmount = 0;
      let awayCharterAmount = netPay;
      let thaiCompanyId: string | null = null;

      if (emp.company_id && thaiRegistered > 0) {
        thaiCompanyAmount = Math.max(0, thaiRegistered - ssfEmployee);
        awayCharterAmount = netPay - thaiCompanyAmount;
        thaiCompanyId = emp.company_id;
      }

      // Convert away charter to employee's currency
      const awayCharterOriginal = employeeCurrency !== 'THB' && fxRate > 0
        ? Math.round((awayCharterAmount / fxRate) * 100) / 100
        : awayCharterAmount;

      slips.push({
        payroll_run_id: runId,
        employee_id: emp.id,
        base_salary: salary,
        charter_bonus: charterBonus,
        commission_amount: commissionAmount,
        ssf_employee: ssfEmployee,
        ssf_employer: ssfEmployer,
        earnings_detail: earningsDetail,
        thai_registered_salary: thaiRegistered,
        thai_company_amount: thaiCompanyAmount,
        away_charter_amount: awayCharterAmount,
        thai_company_id: thaiCompanyId,
        employee_currency: employeeCurrency,
        fx_rate: fxRate,
        fx_rate_source: fxInfo.source,
        base_salary_original: salaryOriginal,
        away_charter_original: awayCharterOriginal,
        away_charter_currency: employeeCurrency,
      });
    }

    // Bulk insert
    if (slips.length > 0) {
      const { error: insertErr } = await (supabase as any)
        .from('payroll_slips')
        .insert(slips);
      if (insertErr) throw insertErr;
    }

    return slips.length;
  },

  async update(id: string, updates: Partial<PayrollSlip>): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('payroll_slips')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('payroll_slips')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
