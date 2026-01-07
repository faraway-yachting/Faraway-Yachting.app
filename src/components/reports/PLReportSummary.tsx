"use client";

import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";
import { formatTHB } from "@/lib/reports/plCalculation";

interface PLReportSummaryProps {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  showInTHB: boolean;
}

export function PLReportSummary({
  totalIncome,
  totalExpenses,
  netProfit,
  showInTHB,
}: PLReportSummaryProps) {
  const isProfit = netProfit >= 0;

  const cards = [
    {
      title: "Total Income",
      value: totalIncome,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Expenses",
      value: totalExpenses,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Net Profit",
      value: netProfit,
      icon: isProfit ? Wallet : DollarSign,
      color: isProfit ? "text-blue-600" : "text-orange-600",
      bgColor: isProfit ? "bg-blue-50" : "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`${card.bgColor} rounded-lg border border-gray-200 p-4`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className={`text-2xl font-bold ${card.color} mt-1`}>
                {showInTHB ? formatTHB(card.value) : formatTHB(card.value)}
              </p>
            </div>
            <div className={`${card.bgColor} p-3 rounded-full`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
