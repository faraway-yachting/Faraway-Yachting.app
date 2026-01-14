// Mock data for all accounting dashboards (Empty - use Supabase)

export const mockBoatPerformance: Array<{
  boat: string;
  company: string;
  revenue: string;
  expenses: string;
  profit: string;
  margin: string;
}> = [];

export const mockAlerts: Array<{
  id: number;
  type: string;
  message: string;
  time: string;
}> = [];

export const mockTransactions: Array<{
  id: string;
  date: string;
  type: string;
  category: string;
  boat: string;
  amount: string;
  status: string;
  receipt: string;
}> = [];

export const mockBankReconciliation: Array<{
  id: number;
  date: string;
  description: string;
  bankAmount: string;
  systemAmount: string;
  status: string;
}> = [];

export const mockInvoices: Array<{
  id: string;
  client: string;
  boat: string;
  amount: string;
  date: string;
  dueDate: string;
  status: string;
}> = [];

export const mockPettyCashTransactions: Array<{
  id: string;
  date: string;
  type: string;
  category: string;
  amount: string;
  status: string;
}> = [];

export const mockMissingDocuments: Array<{
  id: number;
  transaction: string;
  date: string;
  description: string;
  amount: string;
  documentType: string;
}> = [];

export const mockVATStatus = {
  currentPeriod: "",
  inputVAT: "฿0.00",
  outputVAT: "฿0.00",
  netVAT: "฿0.00",
  dueDate: "",
  status: "N/A",
};

export const mockWHTStatus = {
  currentMonth: "",
  totalWithheld: "฿0.00",
  submissionDate: "",
  status: "N/A",
};

export const mockCompanyCashBalance: Array<{
  company: string;
  balance: string;
  status: string;
}> = [];

export const mockMonthlyPLTrend: Array<{
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}> = [];
