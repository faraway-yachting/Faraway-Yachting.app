'use client';

import { BookingStatus, bookingStatusLabels, bookingStatusColors } from '@/data/booking/types';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function BookingStatusBadge({ status, size = 'md' }: BookingStatusBadgeProps) {
  const colors = bookingStatusColors[status];
  const label = bookingStatusLabels[status];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium border
        ${colors.bg} ${colors.text} ${colors.border}
        ${sizeClasses[size]}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'enquiry' ? 'bg-yellow-500' :
        status === 'hold' ? 'bg-orange-500' :
        status === 'booked' ? 'bg-green-500' :
        status === 'cancelled' ? 'bg-gray-400' :
        'bg-blue-500'
      }`} />
      {label}
    </span>
  );
}
