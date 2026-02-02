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
} from "lucide-react";
import { bookingsApi } from "@/lib/supabase/api/bookings";
import { projectsApi } from "@/lib/supabase/api/projects";
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

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [mb, up, pr] = await Promise.all([
        bookingsApi.getByDateRange(monthStart, monthEnd),
        bookingsApi.getUpcoming(),
        projectsApi.getActive(),
      ]);
      setMonthBookings(mb);
      setUpcoming(up);
      setProjects(pr);
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
