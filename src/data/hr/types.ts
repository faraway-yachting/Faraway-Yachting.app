export type EmploymentType = 'fixed' | 'part_time' | 'online_hourly';
export type EmployeeStatus = 'active' | 'on_leave' | 'resigned' | 'terminated';
export type Season = 'high' | 'low';
export type CharterRateType = 'half_day' | 'full_day' | 'overnight' | 'sleep_on_boat' | 'other';
export type DocumentType = 'id_card' | 'passport' | 'work_permit' | 'license' | 'other';

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  fixed: 'Fixed',
  part_time: 'Part Time',
  online_hourly: 'Online (Paid per Hour)',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  resigned: 'Resigned',
  terminated: 'Terminated',
};

export const CHARTER_RATE_TYPE_LABELS: Record<CharterRateType, string> = {
  half_day: 'Half Day',
  full_day: 'Full Day',
  overnight: 'Overnight',
  sleep_on_boat: 'Sleep on Boat',
  other: 'Other',
};

export const SEASON_LABELS: Record<Season, string> = {
  high: 'High Season (Nov-Apr)',
  low: 'Low Season (May-Oct)',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  id_card: 'ID Card',
  passport: 'Passport',
  work_permit: 'Work Permit',
  license: 'License',
  other: 'Other',
};

export const ALL_CHARTER_RATE_TYPES: CharterRateType[] = ['half_day', 'full_day', 'overnight', 'sleep_on_boat', 'other'];
export const ALL_SEASONS: Season[] = ['high', 'low'];

// Leave Management
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const LEAVE_REQUEST_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const LEAVE_REQUEST_STATUS_COLORS: Record<LeaveRequestStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

// Payroll
export type PayrollRunStatus = 'draft' | 'approved' | 'paid';

export const PAYROLL_RUN_STATUS_LABELS: Record<PayrollRunStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  paid: 'Paid',
};

export const PAYROLL_RUN_STATUS_COLORS: Record<PayrollRunStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
};

// Thailand Social Security Fund
export const THAILAND_SSF_RATE = 0.05;
export const THAILAND_SSF_CAP = 750;
export const THAILAND_SSF_MAX_BASE = 15000;
