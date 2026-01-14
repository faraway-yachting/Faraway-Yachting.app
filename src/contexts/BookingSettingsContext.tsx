'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BoatColor, defaultBoatColors, defaultExternalBoatColor } from '@/data/booking/types';

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

interface BookingSettings {
  boatColors: BoatColor[];
  externalBoats: ExternalYacht[];
  bannerImageUrl: string | null;
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
}

const STORAGE_KEY = 'faraway-booking-settings';

const BookingSettingsContext = createContext<BookingSettingsContextType | undefined>(undefined);

export function BookingSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BookingSettings>({
    boatColors: [],
    externalBoats: [],
    bannerImageUrl: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate old external boats format to new format
        const migratedExternalBoats = (parsed.externalBoats || []).map((boat: Partial<ExternalYacht> & { name: string }) => ({
          id: boat.id || `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: boat.name,
          displayName: boat.displayName || boat.name, // Use name as displayName if not set
          departFrom: boat.departFrom || '',
          ownerOperator: boat.ownerOperator || '',
        }));
        // Merge with defaults to ensure all fields exist (for backwards compatibility)
        setSettings({
          boatColors: parsed.boatColors || [],
          externalBoats: migratedExternalBoats,
          bannerImageUrl: parsed.bannerImageUrl ?? null,
        });
      }
    } catch (error) {
      console.error('Error loading booking settings:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving booking settings:', error);
      }
    }
  }, [settings, isLoaded]);

  // Get boat color by ID, return default if not set
  const getBoatColor = (boatId: string): string => {
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
  };

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
