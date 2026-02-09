"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  BalanceSheetSection,
  BalanceSheetSubType,
  AccountBalance,
  formatTHB,
} from "@/lib/reports/balanceSheetCalculation";

interface BalanceSheetTableProps {
  section: BalanceSheetSection;
  showInTHB: boolean;
}

export function BalanceSheetTable({ section, showInTHB }: BalanceSheetTableProps) {
  const [expandedSubTypes, setExpandedSubTypes] = useState<Set<string>>(
    new Set()
  );

  const toggleSubType = (name: string) => {
    const newExpanded = new Set(expandedSubTypes);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedSubTypes(newExpanded);
  };

  // Determine header color based on section type
  const getHeaderColors = () => {
    switch (section.accountType) {
      case "Asset":
        return { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" };
      case "Liability":
        return { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" };
      case "Equity":
        return { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" };
      default:
        return { bg: "bg-gray-50", text: "text-gray-800", border: "border-gray-200" };
    }
  };

  const isMobile = useIsMobile();
  const colors = getHeaderColors();
  const total = showInTHB ? section.totalTHB : section.total;

  const formatBalance = (balance: number) => {
    if (showInTHB) {
      return formatTHB(balance);
    }
    return balance.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
      {/* Section Header */}
      <div className={`${colors.bg} px-3 md:px-4 py-3 border-b ${colors.border}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-base md:text-lg font-semibold ${colors.text}`}>
            {section.name}
          </h3>
          <span className={`text-base md:text-lg font-bold ${colors.text}`}>
            {formatBalance(total)}
          </span>
        </div>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {!isMobile && (
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Code
              </th>
            )}
            <th className="text-left px-3 md:px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Account Name
            </th>
            <th className="text-right px-3 md:px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-28 md:w-40">
              Balance
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {section.subTypes.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                No accounts with balances found.
              </td>
            </tr>
          ) : (
            section.subTypes.map((subType) => (
              <SubTypeRows
                key={subType.name}
                subType={subType}
                showInTHB={showInTHB}
                isExpanded={expandedSubTypes.has(subType.name)}
                onToggle={() => toggleSubType(subType.name)}
                formatBalance={formatBalance}
                isMobile={isMobile}
              />
            ))
          )}
        </tbody>
      </table>

      {/* Section Total Footer */}
      <div className={`${colors.bg} px-3 md:px-4 py-3 border-t ${colors.border}`}>
        <div className="flex items-center justify-between">
          <span className={`font-semibold ${colors.text}`}>
            Total {section.name}
          </span>
          <span className={`text-base md:text-lg font-bold ${colors.text}`}>
            {formatBalance(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface SubTypeRowsProps {
  subType: BalanceSheetSubType;
  showInTHB: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  formatBalance: (balance: number) => string;
  isMobile: boolean;
}

function SubTypeRows({
  subType,
  showInTHB,
  isExpanded,
  onToggle,
  formatBalance,
  isMobile,
}: SubTypeRowsProps) {
  const total = showInTHB ? subType.totalTHB : subType.total;

  return (
    <>
      {/* SubType Header Row */}
      <tr
        className="bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={onToggle}
      >
        <td colSpan={isMobile ? 1 : 2} className="px-3 md:px-4 py-2">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            <span className="font-medium text-gray-700 text-sm md:text-base">{subType.name}</span>
            <span className="text-xs md:text-sm text-gray-500">
              ({subType.accounts.length})
            </span>
          </div>
        </td>
        <td className="px-3 md:px-4 py-2 text-right font-medium text-gray-700">
          {formatBalance(total)}
        </td>
      </tr>

      {/* Account Detail Rows */}
      {isExpanded &&
        subType.accounts.map((account) => (
          <AccountRow
            key={account.accountCode}
            account={account}
            showInTHB={showInTHB}
            formatBalance={formatBalance}
            isMobile={isMobile}
          />
        ))}
    </>
  );
}

interface AccountRowProps {
  account: AccountBalance;
  showInTHB: boolean;
  formatBalance: (balance: number) => string;
  isMobile: boolean;
}

function AccountRow({ account, showInTHB, formatBalance, isMobile }: AccountRowProps) {
  const balance = showInTHB ? account.balanceTHB : account.balance;

  return (
    <tr className="hover:bg-gray-50">
      {!isMobile && (
        <td className="px-4 py-2 pl-10 text-sm text-gray-600">
          {account.accountCode}
        </td>
      )}
      <td className="px-3 md:px-4 py-2 pl-8 md:pl-4 text-sm text-gray-900">{account.accountName}</td>
      <td className="px-3 md:px-4 py-2 text-sm text-right font-medium text-gray-900">
        {formatBalance(balance)}
      </td>
    </tr>
  );
}
