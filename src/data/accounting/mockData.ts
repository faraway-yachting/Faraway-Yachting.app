// Mock data for all accounting dashboards

export const mockBoatPerformance = [
  {
    boat: "Ocean Star",
    company: "Blue Horizon Yachts",
    revenue: "$125,000",
    expenses: "$45,000",
    profit: "$80,000",
    margin: "64%",
  },
  {
    boat: "Sea Breeze",
    company: "Blue Horizon Yachts",
    revenue: "$98,000",
    expenses: "$52,000",
    profit: "$46,000",
    margin: "47%",
  },
  {
    boat: "Wave Rider",
    company: "Coastal Marine Co",
    revenue: "$156,000",
    expenses: "$68,000",
    profit: "$88,000",
    margin: "56%",
  },
  {
    boat: "Sunset Dream",
    company: "Coastal Marine Co",
    revenue: "$87,000",
    expenses: "$39,000",
    profit: "$48,000",
    margin: "55%",
  },
];

export const mockAlerts = [
  {
    id: 1,
    type: "warning",
    message: "Low cash balance in Blue Horizon Yachts",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "danger",
    message: "Missing invoice for Ocean Star charter (Dec 20)",
    time: "5 hours ago",
  },
  {
    id: 3,
    type: "info",
    message: "High fuel expenses detected for Wave Rider",
    time: "1 day ago",
  },
];

export const mockTransactions = [
  {
    id: "TXN-001",
    date: "2025-12-26",
    type: "Income",
    category: "Charter Fee",
    boat: "Ocean Star",
    amount: "$5,000",
    status: "Completed",
    receipt: "Yes",
  },
  {
    id: "TXN-002",
    date: "2025-12-25",
    type: "Expense",
    category: "Fuel",
    boat: "Sea Breeze",
    amount: "$1,200",
    status: "Completed",
    receipt: "Yes",
  },
  {
    id: "TXN-003",
    date: "2025-12-24",
    type: "Expense",
    category: "Maintenance",
    boat: "Wave Rider",
    amount: "$3,500",
    status: "Pending",
    receipt: "No",
  },
  {
    id: "TXN-004",
    date: "2025-12-23",
    type: "Income",
    category: "Charter Fee",
    boat: "Sunset Dream",
    amount: "$4,200",
    status: "Completed",
    receipt: "Yes",
  },
  {
    id: "TXN-005",
    date: "2025-12-22",
    type: "Expense",
    category: "Crew Salary",
    boat: "Ocean Star",
    amount: "$6,000",
    status: "Completed",
    receipt: "Yes",
  },
];

export const mockBankReconciliation = [
  {
    id: 1,
    date: "2025-12-26",
    description: "Charter payment - Ocean Star",
    bankAmount: "$5,000",
    systemAmount: "$5,000",
    status: "Matched",
  },
  {
    id: 2,
    date: "2025-12-25",
    description: "Fuel purchase - Marina",
    bankAmount: "$1,200",
    systemAmount: "$1,200",
    status: "Matched",
  },
  {
    id: 3,
    date: "2025-12-24",
    description: "Unknown transfer",
    bankAmount: "$850",
    systemAmount: "-",
    status: "Unmatched",
  },
  {
    id: 4,
    date: "2025-12-23",
    description: "Maintenance service",
    bankAmount: "$3,450",
    systemAmount: "$3,500",
    status: "Unmatched",
  },
];

export const mockInvoices = [
  {
    id: "INV-2025-001",
    client: "John Smith",
    boat: "Ocean Star",
    amount: "$5,000",
    date: "2025-12-20",
    dueDate: "2026-01-20",
    status: "Paid",
  },
  {
    id: "INV-2025-002",
    client: "Sarah Johnson",
    boat: "Sea Breeze",
    amount: "$3,800",
    date: "2025-12-22",
    dueDate: "2026-01-22",
    status: "Sent",
  },
  {
    id: "INV-2025-003",
    client: "Mike Williams",
    boat: "Wave Rider",
    amount: "$6,500",
    date: "2025-12-24",
    dueDate: "2026-01-24",
    status: "Draft",
  },
  {
    id: "INV-2025-004",
    client: "Emma Davis",
    boat: "Sunset Dream",
    amount: "$4,200",
    date: "2025-12-18",
    dueDate: "2026-01-18",
    status: "Paid",
  },
];

export const mockPettyCashTransactions = [
  {
    id: "PC-001",
    date: "2025-12-26",
    type: "Expense",
    category: "Office Supplies",
    amount: "$45.00",
    status: "Approved",
  },
  {
    id: "PC-002",
    date: "2025-12-25",
    type: "Expense",
    category: "Fuel",
    amount: "$120.00",
    status: "Pending",
  },
  {
    id: "PC-003",
    date: "2025-12-24",
    type: "Top-up",
    category: "Cash Transfer",
    amount: "$500.00",
    status: "Completed",
  },
  {
    id: "PC-004",
    date: "2025-12-23",
    type: "Expense",
    category: "Meals",
    amount: "$85.00",
    status: "Approved",
  },
];

export const mockMissingDocuments = [
  {
    id: 1,
    transaction: "TXN-003",
    date: "2025-12-24",
    description: "Maintenance - Wave Rider",
    amount: "$3,500",
    documentType: "Receipt",
  },
  {
    id: 2,
    transaction: "TXN-007",
    date: "2025-12-20",
    description: "Docking Fee",
    amount: "$450",
    documentType: "Invoice",
  },
  {
    id: 3,
    transaction: "TXN-009",
    date: "2025-12-18",
    description: "Insurance Payment",
    amount: "$2,100",
    documentType: "Receipt",
  },
];

export const mockVATStatus = {
  currentPeriod: "Q4 2025",
  inputVAT: "$12,450",
  outputVAT: "$18,900",
  netVAT: "$6,450",
  dueDate: "2026-01-31",
  status: "Pending Submission",
};

export const mockWHTStatus = {
  currentMonth: "December 2025",
  totalWithheld: "$4,250",
  submissionDate: "2026-01-07",
  status: "Not Submitted",
};

export const mockCompanyCashBalance = [
  {
    company: "Blue Horizon Yachts",
    balance: "$45,200",
    status: "healthy",
  },
  {
    company: "Coastal Marine Co",
    balance: "$12,800",
    status: "warning",
  },
  {
    company: "Premium Yacht Services",
    balance: "$78,500",
    status: "healthy",
  },
];

export const mockMonthlyPLTrend = [
  { month: "Jul", revenue: 95000, expenses: 42000, profit: 53000 },
  { month: "Aug", revenue: 110000, expenses: 48000, profit: 62000 },
  { month: "Sep", revenue: 125000, expenses: 55000, profit: 70000 },
  { month: "Oct", revenue: 142000, expenses: 58000, profit: 84000 },
  { month: "Nov", revenue: 156000, expenses: 62000, profit: 94000 },
  { month: "Dec", revenue: 168000, expenses: 67000, profit: 101000 },
];
