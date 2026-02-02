'use client';

interface ReconciliationStatementProps {
  bankAccountId?: string;
  asOfDate: string;
  onClose: () => void;
}

// Placeholder data until data integration is complete
const PLACEHOLDER = {
  bankStatementBalance: 125430.5,
  depositsInTransit: [
    { description: 'Client deposit - INV-2024-0087', amount: 8500.0 },
    { description: 'Transfer from savings', amount: 3200.0 },
  ],
  outstandingPayments: [
    { description: 'Cheque #1042 - Marina fees', amount: 4250.0 },
    { description: 'Cheque #1045 - Fuel supplier', amount: 1875.0 },
    { description: 'Cheque #1048 - Insurance premium', amount: 6300.0 },
  ],
  bookBalance: 124705.5,
  bookAdjustments: [] as { description: string; amount: number }[],
};

export default function ReconciliationStatement({
  bankAccountId,
  asOfDate,
  onClose,
}: ReconciliationStatementProps) {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const d = PLACEHOLDER;
  const totalDepositsInTransit = d.depositsInTransit.reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = d.outstandingPayments.reduce((s, i) => s + i.amount, 0);
  const adjustedBankBalance = d.bankStatementBalance + totalDepositsInTransit - totalOutstanding;
  const totalBookAdj = d.bookAdjustments.reduce((s, i) => s + i.amount, 0);
  const adjustedBookBalance = d.bookBalance + totalBookAdj;
  const difference = adjustedBankBalance - adjustedBookBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:bg-white print:static print:block">
      <div className="bg-white rounded-lg shadow w-full max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-1 print:mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Bank Reconciliation Statement
            </h2>
            <div className="flex gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 text-sm font-medium text-[#5A7A8F] border border-[#5A7A8F] rounded-md hover:bg-[#5A7A8F]/5"
              >
                Print
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm font-medium text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">
            As of {asOfDate}
            {bankAccountId && <> &middot; Account: {bankAccountId}</>}
          </p>
          <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mb-6 inline-block">
            Coming Soon: Live data integration. Displaying placeholder data.
          </p>

          {/* Bank side */}
          <div className="mb-6">
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Balance per Bank Statement</span>
              <span>{fmt(d.bankStatementBalance)}</span>
            </div>

            <div className="ml-4 mb-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Add: Deposits in Transit</p>
              {d.depositsInTransit.map((item, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-600 py-0.5">
                  <span className="ml-2">{item.description}</span>
                  <span>{fmt(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-medium text-gray-700 border-t border-gray-100 mt-1 pt-1">
                <span>Total Deposits in Transit</span>
                <span>{fmt(totalDepositsInTransit)}</span>
              </div>
            </div>

            <div className="ml-4 mb-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Less: Outstanding Payments</p>
              {d.outstandingPayments.map((item, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-600 py-0.5">
                  <span className="ml-2">{item.description}</span>
                  <span>({fmt(item.amount)})</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-medium text-gray-700 border-t border-gray-100 mt-1 pt-1">
                <span>Total Outstanding Payments</span>
                <span>({fmt(totalOutstanding)})</span>
              </div>
            </div>

            <div className="flex justify-between text-sm font-semibold text-[#5A7A8F] border-t-2 border-[#5A7A8F] pt-2">
              <span>Adjusted Bank Balance</span>
              <span>{fmt(adjustedBankBalance)}</span>
            </div>
          </div>

          {/* Book side */}
          <div className="mb-6">
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Balance per Books</span>
              <span>{fmt(d.bookBalance)}</span>
            </div>

            {d.bookAdjustments.length > 0 && (
              <div className="ml-4 mb-2">
                <p className="text-xs font-medium text-gray-500 mb-1">Adjustments</p>
                {d.bookAdjustments.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-600 py-0.5">
                    <span className="ml-2">{item.description}</span>
                    <span>{fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between text-sm font-semibold text-[#5A7A8F] border-t-2 border-[#5A7A8F] pt-2">
              <span>Adjusted Book Balance</span>
              <span>{fmt(adjustedBookBalance)}</span>
            </div>
          </div>

          {/* Difference */}
          <div
            className={`flex justify-between text-sm font-bold p-3 rounded-lg ${
              difference === 0
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            <span>Difference</span>
            <span>{fmt(difference)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
