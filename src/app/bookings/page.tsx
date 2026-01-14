'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Shield, Users, Eye } from 'lucide-react';

// Role definitions for booking module
const roles = [
  {
    id: 'manager',
    name: 'Manager',
    description: 'Full access to all bookings, can manage all aspects of the booking calendar',
    icon: Shield,
    color: 'from-blue-600 to-blue-800',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'agent',
    name: 'Agent',
    description: 'Can view calendar availability, create bookings, but limited access to customer details',
    icon: Users,
    color: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to booking calendar, cannot create or modify bookings',
    icon: Eye,
    color: 'from-slate-500 to-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
];

export default function BookingsRoleSelector() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In production, this would check user's assigned role and redirect automatically
    // For now, show role selector
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-xl">
              <Calendar className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Booking Calendar
          </h1>
          <p className="text-lg text-gray-600">
            Select your role to access the booking system
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.id}
                href={`/bookings/${role.id}/calendar`}
                className={`group relative p-6 rounded-2xl border-2 ${role.borderColor} ${role.bgColor} hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {role.name}
                </h2>
                <p className="text-sm text-gray-600">
                  {role.description}
                </p>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium text-gray-500">Click to enter</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>&larr;</span>
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
