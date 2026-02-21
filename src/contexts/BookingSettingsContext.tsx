'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { BoatColor, defaultBoatColors, defaultExternalBoatColor } from '@/data/booking/types';
import { bookingSettingsApi } from '@/lib/supabase/api/bookingSettings';

// External yacht definition
export interface ExternalYacht {
  id: string;
  name: string;              // Yacht name (e.g., "Ocean Paradise")
  displayName: string;       // Display name for calendar/bookings
  departFrom: string;        // Default departure location
  ownerOperator: string;     // Owner/Operator name or company
}

// Backwards compatibility alias
export type ExternalBoat = ExternalYacht;

export interface CalendarDisplaySettings {
  allBookingsFields: string[];
  boatTabFields: string[];
}

export const CALENDAR_DISPLAY_FIELD_OPTIONS = [
  { key: 'title', label: 'Title' },
  { key: 'boatName', label: 'Boat Name' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'bookingType', label: 'Booking Type' },
  { key: 'time', label: 'Time' },
  { key: 'totalPrice', label: 'Total Price' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'destination', label: 'Destination' },
  { key: 'numberOfGuests', label: 'Number of Guests' },
  { key: 'bookingOwner', label: 'Booking Owner' },
  { key: 'extras', label: 'Extras' },
  { key: 'contractNote', label: 'Charter Contract' },
  { key: 'meetAndGreeter', label: 'Meet & Greeter' },
  { key: 'cabinSummary', label: 'Cabin Summary' },
  { key: 'balanceDue', label: 'Balance Due' },
] as const;

const DEFAULT_CALENDAR_DISPLAY: CalendarDisplaySettings = {
  allBookingsFields: ['title', 'customerName', 'cabinSummary'],
  boatTabFields: ['title', 'customerName', 'bookingType', 'cabinSummary'],
};

interface BookingSettings {
  boatColors: BoatColor[];
  externalBoats: ExternalYacht[];
  bannerImageUrl: string | null;
  calendarDisplay: CalendarDisplaySettings;
}

interface BookingSettingsContextType {
  settings: BookingSettings;
  getBoatColor: (boatId: string) => string;
  setBoatColor: (boatId: string, name: string, color: string) => void;
  resetToDefaults: () => void;
  // External yachts management
  externalBoats: ExternalYacht[];
  addExternalYacht: (yacht: Omit<ExternalYacht, 'id'>) => void;
  removeExternalYacht: (id: string) => void;
  updateExternalYacht: (id: string, yacht: Partial<Omit<ExternalYacht, 'id'>>) => void;
  // Legacy aliases for backwards compatibility
  addExternalBoat: (name: string) => void;
  removeExternalBoat: (id: string) => void;
  updateExternalBoat: (id: string, name: string) => void;
  // Banner image
  bannerImageUrl: string | null;
  setBannerImageUrl: (url: string | null) => void;
  // Calendar display settings
  calendarDisplay: CalendarDisplaySettings;
  setCalendarDisplayFields: (view: 'all' | 'boat', fields: string[]) => void;
  // Save
  isDirty: boolean;
  isSaving: boolean;
  saveSettings: () => Promise<void>;
}

const BookingSettingsContext = createContext<BookingSettingsContextType | undefined>(undefined);

export function BookingSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BookingSettings>({
    boatColors: [],
    externalBoats: [],
    bannerImageUrl: null,
    calendarDisplay: DEFAULT_CALENDAR_DISPLAY,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savedSettingsRef = useRef<BookingSettings | null>(null);

  // Load settings from Supabase on mount
  useEffect(() => {
    bookingSettingsApi.get().then((data) => {
      const loaded: BookingSettings = {
        boatColors: data.boatColors || [],
        externalBoats: data.externalBoats || [],
        bannerImageUrl: data.bannerImageUrl,
        calendarDisplay: data.calendarDisplay || DEFAULT_CALENDAR_DISPLAY,
      };
      setSettings(loaded);
      savedSettingsRef.current = loaded;
      setIsLoaded(true);
    }).catch((err) => {
      console.error('Error loading booking settings:', err);
      setIsLoaded(true);
    });
  }, []);

  // Track dirty state
  useEffect(() => {
    if (!isLoaded || !savedSettingsRef.current) return;
    const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettingsRef.current);
    setIsDirty(dirty);
  }, [settings, isLoaded]);

  // Manual save
  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    try {
      await bookingSettingsApi.update({
        boatColors: settings.boatColors,
        externalBoats: settings.externalBoats,
        bannerImageUrl: settings.bannerImageUrl,
        calendarDisplay: settings.calendarDisplay,
      });
      savedSettingsRef.current = { ...settings };
      setIsDirty(false);
    } catch (err) {
      console.error('Error saving booking settings:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  // Get boat color by ID, return default if not set
  const getBoatColor = useCallback((boatId: string): string => {
    const boatColor = settings.boatColors.find(bc => bc.id === boatId);
    if (boatColor) {
      return boatColor.color;
    }

    // Return default external color for 'external'
    if (boatId === 'external') {
      return defaultExternalBoatColor;
    }

    // Return a default color based on index for new boats
    const existingIds = settings.boatColors.map(bc => bc.id);
    const colorIndex = existingIds.length % defaultBoatColors.length;
    return defaultBoatColors[colorIndex];
  }, [settings.boatColors]);

  // Set or update boat color
  const setBoatColor = (boatId: string, name: string, color: string) => {
    setSettings(prev => {
      const existingIndex = prev.boatColors.findIndex(bc => bc.id === boatId);
      const newBoatColors = [...prev.boatColors];

      if (existingIndex >= 0) {
        newBoatColors[existingIndex] = { id: boatId, name, color };
      } else {
        newBoatColors.push({ id: boatId, name, color });
      }

      return { ...prev, boatColors: newBoatColors };
    });
  };

  // Reset all colors to defaults
  const resetToDefaults = () => {
    setSettings(prev => ({ ...prev, boatColors: [] }));
  };

  // Add a new external yacht
  const addExternalYacht = (yacht: Omit<ExternalYacht, 'id'>) => {
    const id = `ext-${Date.now()}`;
    setSettings(prev => ({
      ...prev,
      externalBoats: [...prev.externalBoats, { id, ...yacht }],
    }));
  };

  // Remove an external yacht
  const removeExternalYacht = (id: string) => {
    setSettings(prev => ({
      ...prev,
      externalBoats: prev.externalBoats.filter(boat => boat.id !== id),
    }));
  };

  // Update an external yacht
  const updateExternalYacht = (id: string, yacht: Partial<Omit<ExternalYacht, 'id'>>) => {
    setSettings(prev => ({
      ...prev,
      externalBoats: prev.externalBoats.map(boat =>
        boat.id === id ? { ...boat, ...yacht } : boat
      ),
    }));
  };

  // Legacy function aliases for backwards compatibility
  const addExternalBoat = (name: string) => {
    addExternalYacht({ name, displayName: name, departFrom: '', ownerOperator: '' });
  };

  const removeExternalBoat = (id: string) => {
    removeExternalYacht(id);
  };

  const updateExternalBoat = (id: string, name: string) => {
    updateExternalYacht(id, { name });
  };

  // Set calendar display fields
  const setCalendarDisplayFields = (view: 'all' | 'boat', fields: string[]) => {
    setSettings(prev => ({
      ...prev,
      calendarDisplay: {
        ...prev.calendarDisplay,
        [view === 'all' ? 'allBookingsFields' : 'boatTabFields']: fields,
      },
    }));
  };

  // Set banner image URL
  const setBannerImageUrl = (url: string | null) => {
    setSettings(prev => ({
      ...prev,
      bannerImageUrl: url,
    }));
  };

  return (
    <BookingSettingsContext.Provider
      value={{
        settings,
        getBoatColor,
        setBoatColor,
        resetToDefaults,
        externalBoats: settings.externalBoats || [],
        addExternalYacht,
        removeExternalYacht,
        updateExternalYacht,
        // Legacy aliases
        addExternalBoat,
        removeExternalBoat,
        updateExternalBoat,
        bannerImageUrl: settings.bannerImageUrl ?? null,
        setBannerImageUrl,
        calendarDisplay: settings.calendarDisplay ?? DEFAULT_CALENDAR_DISPLAY,
        setCalendarDisplayFields,
        isDirty,
        isSaving,
        saveSettings,
      }}
    >
      {children}
    </BookingSettingsContext.Provider>
  );
}

export function useBookingSettings() {
  const context = useContext(BookingSettingsContext);
  if (context === undefined) {
    throw new Error('useBookingSettings must be used within a BookingSettingsProvider');
  }
  return context;
}
