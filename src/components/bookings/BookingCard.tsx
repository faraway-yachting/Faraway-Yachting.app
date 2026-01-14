'use client';

import { Booking, bookingStatusColors } from '@/data/booking/types';
import { Ship, Clock } from 'lucide-react';

interface BookingCardProps {
  booking: Booking;
  boatName: string;
  onClick?: () => void;
  isAgencyView?: boolean;
  isMultiDay?: boolean;
  isFirstDay?: boolean;
  isLastDay?: boolean;
}

export function BookingCard({
  booking,
  boatName,
  onClick,
  isAgencyView = false,
  isMultiDay = false,
  isFirstDay = true,
  isLastDay = true,
}: BookingCardProps) {
  const colors = bookingStatusColors[booking.status];

  // For agency view, show limited info
  const displayTitle = isAgencyView ? boatName : booking.title;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-2 py-1 rounded text-xs transition-all
        ${colors.bg} ${colors.border} border
        hover:shadow-sm hover:scale-[1.02]
        ${isMultiDay && !isFirstDay ? 'rounded-l-none border-l-0' : ''}
        ${isMultiDay && !isLastDay ? 'rounded-r-none border-r-0' : ''}
      `}
    >
      <div className="flex items-center gap-1">
        {/* Status indicator */}
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          booking.status === 'enquiry' ? 'bg-yellow-500' :
          booking.status === 'hold' ? 'bg-orange-500' :
          booking.status === 'booked' ? 'bg-green-500' :
          booking.status === 'cancelled' ? 'bg-gray-400' :
          'bg-blue-500'
        }`} />

        {/* Title or boat name */}
        <span className={`truncate font-medium ${colors.text}`}>
          {displayTitle}
        </span>
      </div>

      {/* Second line: boat (if not agency) or time */}
      {!isAgencyView && (
        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500">
          <Ship className="h-2.5 w-2.5" />
          <span className="truncate">{boatName}</span>
        </div>
      )}

      {/* Time for day charters */}
      {booking.time && isFirstDay && (
        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500">
          <Clock className="h-2.5 w-2.5" />
          <span>{booking.time}</span>
        </div>
      )}
    </button>
  );
}

// Compact version for list views
export function BookingCardCompact({
  booking,
  boatName,
  onClick,
  isAgencyView = false,
}: BookingCardProps) {
  const colors = bookingStatusColors[booking.status];

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-3 py-2 rounded-lg text-sm transition-all
        ${colors.bg} ${colors.border} border
        hover:shadow-md hover:scale-[1.01]
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            booking.status === 'enquiry' ? 'bg-yellow-500' :
            booking.status === 'hold' ? 'bg-orange-500' :
            booking.status === 'booked' ? 'bg-green-500' :
            booking.status === 'cancelled' ? 'bg-gray-400' :
            'bg-blue-500'
          }`} />

          <div>
            <span className={`font-medium ${colors.text}`}>
              {isAgencyView ? boatName : booking.title}
            </span>
            {!isAgencyView && (
              <span className="text-gray-500 ml-2">
                {boatName}
              </span>
            )}
          </div>
        </div>

        <div className="text-xs text-gray-500">
          {new Date(booking.dateFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          {booking.dateFrom !== booking.dateTo && (
            <> - {new Date(booking.dateTo).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>
          )}
        </div>
      </div>
    </button>
  );
}
