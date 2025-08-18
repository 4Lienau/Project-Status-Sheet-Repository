import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "truncate_activities_preference";

/**
 * Custom hook for managing the truncate activities preference in localStorage
 */
export const useTruncatePreference = () => {
  // Initialize from localStorage or default to true
  const [truncateActivities, setTruncateActivities] = useState(() => {
    const savedPreference = localStorage.getItem(STORAGE_KEY);
    return savedPreference !== null ? savedPreference === "true" : true;
  });

  // Update localStorage when preference changes
  const updateTruncatePreference = useCallback((checked: boolean) => {
    setTruncateActivities(checked);
    localStorage.setItem(STORAGE_KEY, checked.toString());
  }, []);

  // Sync with localStorage on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem(STORAGE_KEY);
    if (savedPreference !== null) {
      setTruncateActivities(savedPreference === "true");
    }
  }, []);

  return {
    truncateActivities,
    updateTruncatePreference,
  };
};
