"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/accounting/AppShell";
import { KPICard } from "@/components/accounting/KPICard";
import { DataTable } from "@/components/accounting/DataTable";
import {
  Ship,
  CalendarDays,
  TrendingUp,
  Loader2,
  Anchor,
  Plus,
  FileText,
  AlertTriangle,
  CreditCard,
  Clock,
  ExternalLink,
} from "lucide-react";
import { bookingsApi } from "@/lib/supabase/api/bookings";
import { projectsApi } from "@/lib/supabase/api/projects";
import { bookingPaymentsApi, type BookingPaymentExtended } from "@/lib/supabase/api/bookingPayments";
import { invoicesApi } from "@/lib/supabase/api/invoices";
import type { Booking } from "@/data/booking/types";
import Link from "next/link";

const formatMoney = (n: number, currency = "THB") =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ` ${currency}`;

const STATUS_COLORS: Record<string, string> = {
  booked: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  enquiry: "bg-amber-100 text-amber-800",
  hold: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [monthBookings, setMonthBookings] = useState<Booking[]>([]);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Booking[]>([]);
  const [paymentsNeedingAction, setPaymentsNeedingAction] = useState<BookingPaymentExtended[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [mb, up, pr, pe, pa, oi] = await Promise.all([
        bookingsApi.getByDateRange(monthStart, monthEnd),
        bookingsApi.getUpcoming(),
        projectsApi.getActive(),
        bookingsApi.getPendingCharterExpenses(),
        bookingPaymentsApi.getNeedingAction(),
        invoicesApi.getOverdue(),
      ]);
      setMonthBookings(mb);
      setUpcoming(up);
      setProjects(pr);
      setPendingExpenses(pe);
      setPaymentsNeedingAction(pa);
      setOverdueInvoices(oi);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppShell>
    );
  }

  // KPI calculations
  const confirmedBookings = monthBookings.filter(
    (b) => b.status === "booked" || b.status === "completed"
  );
  const totalBookingsCount = confirmedBookings.length;
  const upcomingCount = upcoming.filter((b) => b.status === "booked").length;
  const revenueThisMonth = confirmedBookings.reduce(
    (sum, b) => sum + (b.totalPrice || 0),
    0
  );

  // Boat utilization: for each project, count booked days this month
  const daysInMonth = lastDay;
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const boatStats = new Map<
    string,
    { name: string; bookedDays: number; revenue: number; bookingCount: number }
  >();

  for (const p of projects) {
    boatStats.set(p.id, {
      name: p.name,
      bookedDays: 0,
      revenue: 0,
      bookingCount: 0,
    });
  }

  for (const b of confirmedBookings) {
    if (!b.projectId) continue;
    const stat = boatStats.get(b.projectId);
    if (!stat) continue;
    // Calculate overlap days with this month
    const bStart = new Date(Math.max(new Date(b.dateFrom).getTime(), new Date(monthStart).getTime()));
    const bEnd = new Date(Math.min(new Date(b.dateTo).getTime(), new Date(monthEnd).getTime()));
    const days = Math.max(1, Math.ceil((bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    stat.bookedDays += days;
    stat.revenue += b.totalPrice || 0;
    stat.bookingCount += 1;
  }

  const boatUtilData = Array.from(boatStats.values())
    .map((s) => ({
      boat: s.name,
      bookedDays: s.bookedDays,
      available: daysInMonth - s.bookedDays,
      utilization: `${Math.min(100, Math.round((s.bookedDays / daysInMonth) * 100))}%`,
      revenue: formatMoney(s.revenue),
      bookings: s.bookingCount,
    }))
    .sort((a, b) => b.bookedDays - a.bookedDays);

  const avgOccupancy =
    projects.length > 0
      ? Math.round(
          Array.from(boatStats.values()).reduce((s, b) => s + b.bookedDays, 0) /
            (projects.length * daysInMonth) *
            100
        )
      : 0;

  // Upcoming charters table data
  const upcomingData = upcoming
    .filter((b) => b.status === "booked")
    .slice(0, 10)
    .map((b) => ({
      id: b.id,
      customer: b.customerName,
      boat: b.projectId ? projectMap.get(b.projectId)?.name || b.externalBoatName || "-" : b.externalBoatName || "-",
      dates: `${new Date(b.dateFrom).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} - ${new Date(b.dateTo).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`,
      amount: b.totalPrice ? formatMoney(b.totalPrice, b.currency || "THB") : "-",
      status: b.status,
      type: b.type?.replace("_", " ") || "-",
    }));

  const boatColumns = [
    { key: "boat", header: "Boat" },
    { key: "bookedDays", header: "Booked Days", align: "right" as const },
    { key: "available", header: "Available", align: "right" as const },
    { key: "utilization", header: "Utilization", align: "right" as const, render: (row: any) => {
      const pct = parseInt(row.utilization);
      return (
        <span className={`font-medium ${pct >= 70 ? "text-green-600" : pct >= 40 ? "text-amber-600" : "text-gray-500"}`}>
          {row.utilization}
        </span>
      );
    }},
    { key: "revenue", header: "Revenue", align: "right" as const },
    { key: "bookings", header: "Bookings", align: "right" as const },
  ];

  const upcomingColumns = [
    { key: "customer", header: "Customer" },
    { key: "boat", header: "Boat" },
    { key: "type", header: "Type" },
    { key: "dates", header: "Dates" },
    { key: "amount", header: "Amount", align: "right" as const },
  ];

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Bookings overview for {monthLabel}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KPICard
          title="Bookings This Month"
          value={totalBookingsCount}
          icon={Ship}
          subtitle={`Confirmed charters in ${monthLabel}`}
        />
        <KPICard
          title="Upcoming Charters"
          value={upcomingCount}
          icon={CalendarDays}
          subtitle="Confirmed, next 30 days"
        />
        <KPICard
          title="Avg. Occupancy"
          value={`${avgOccupancy}%`}
          icon={Anchor}
          subtitle={`Across ${projects.length} boats this month`}
          variant={avgOccupancy >= 50 ? "success" : "default"}
        />
        <KPICard
          title="Revenue This Month"
          value={formatMoney(revenueThisMonth)}
          icon={TrendingUp}
          variant="success"
          subtitle="From confirmed bookings"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/bookings/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c3e50] transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Booking
          </Link>
          <Link
            href="/accounting/manager/expenses"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Link>
          <Link
            href="/accounting/manager/invoices"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <FileText className="h-4 w-4" />
            Invoices
          </Link>
        </div>
      </div>

      {/* Action Required */}
      {(pendingExpenses.length > 0 || paymentsNeedingAction.length > 0 || overdueInvoices.length > 0) && (
        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-amber-800">
              Action Required
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                {pendingExpenses.length + paymentsNeedingAction.length + overdueInvoices.length}
              </span>
            </h2>
          </div>

          {/* Charter Expenses Pending */}
          {pendingExpenses.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Ship className="h-4 w-4 text-amber-700" />
                <h3 className="text-sm font-semibold text-amber-800">
                  Charter Expenses Pending
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {pendingExpenses.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-2">
                {pendingExpenses.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-md bg-white border border-amber-100 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">
                        {b.bookingNumber || "No number"}
                      </span>
                      <span className="mx-2 text-gray-400">&middot;</span>
                      <span className="text-sm text-gray-600">{b.customerName}</span>
                      <span className="mx-2 text-gray-400">&middot;</span>
                      <span className="text-sm text-gray-500">{b.externalBoatName || "External"}</span>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatMoney(b.charterCost || 0, b.currency || "THB")}
                      </span>
                      <Link
                        href={`/accounting/manager/expenses/expense-records/new?booking_id=${b.id}&amount=${b.charterCost || 0}&account_code=5530&vendor_name=${encodeURIComponent(b.externalBoatName || "")}`}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Record Expense
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments Needing Action */}
          {paymentsNeedingAction.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-amber-700" />
                <h3 className="text-sm font-semibold text-amber-800">
                  Payments Needing Action
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {paymentsNeedingAction.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-2">
                {paymentsNeedingAction.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md bg-white border border-amber-100 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">
                        {p.payment_type === "receipt" ? "Receipt" : p.payment_type === "deposit" ? "Deposit" : p.payment_type || "Payment"}
                      </span>
                      <span className="mx-2 text-gray-400">&middot;</span>
                      <span className="text-sm text-gray-600">
                        {formatMoney(p.amount || 0, p.currency || "THB")}
                      </span>
                      {p.paid_date && (
                        <>
                          <span className="mx-2 text-gray-400">&middot;</span>
                          <span className="text-sm text-gray-500">
                            Paid {new Date(p.paid_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </span>
                        </>
                      )}
                      {p.payment_method && (
                        <>
                          <span className="mx-2 text-gray-400">&middot;</span>
                          <span className="text-sm text-gray-500">{p.payment_method === "cash" ? "Cash" : "Bank"}</span>
                        </>
                      )}
                    </div>
                    <div className="ml-4">
                      <Link
                        href={`/bookings/manager/${p.booking_id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Booking
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Invoices */}
          {overdueInvoices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-700" />
                <h3 className="text-sm font-semibold text-amber-800">
                  Overdue Invoices
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {overdueInvoices.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-2">
                {overdueInvoices.map((inv: any) => {
                  const daysOverdue = Math.ceil(
                    (Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-md bg-white border border-amber-100 px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">
                          {inv.invoice_number || "No number"}
                        </span>
                        <span className="mx-2 text-gray-400">&middot;</span>
                        <span className="text-sm text-gray-600">
                          {formatMoney(inv.total_amount || 0, inv.currency || "THB")}
                        </span>
                        <span className="mx-2 text-gray-400">&middot;</span>
                        <span className="text-sm text-red-600 font-medium">
                          {daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue
                        </span>
                      </div>
                      <div className="ml-4">
                        <Link
                          href={`/accounting/manager/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Invoice
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Boat Utilization */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Boat Utilization — {monthLabel}
        </h2>
        <DataTable columns={boatColumns} data={boatUtilData} emptyMessage="No active boats found." />
      </div>

      {/* Upcoming Charters */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Upcoming Confirmed Charters
        </h2>
        <DataTable columns={upcomingColumns} data={upcomingData} emptyMessage="No upcoming charters." />
      </div>
    </AppShell>
  );
}
