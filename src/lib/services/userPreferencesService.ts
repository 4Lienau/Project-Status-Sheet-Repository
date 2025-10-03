/**
 * File: userPreferencesService.ts
 * Purpose: Service for managing user-specific preferences in localStorage
 * Description: Provides utility functions for saving and loading user preferences
 * such as table sorting, column visibility, filters, and pagination settings.
 * Preferences are stored per user ID to ensure isolation between different users.
 */

import { SortingState, PaginationState } from "@tanstack/react-table";

export interface ProjectsOverviewPreferences {
  sorting: SortingState;
  columnVisibility: Record<string, boolean>;
  pagination: PaginationState;
  filters: {
    projectId: string;
    status: string;
    healthStatus: string;
    department: string;
    manager: string;
  };
}

const PREFERENCES_KEY_PREFIX = "projects_overview_preferences_";

/**
 * Get the localStorage key for a specific user
 */
const getPreferencesKey = (userId: string): string => {
  return `${PREFERENCES_KEY_PREFIX}${userId}`;
};

/**
 * Load user preferences from localStorage
 */
export const loadUserPreferences = (
  userId: string
): ProjectsOverviewPreferences | null => {
  try {
    const key = getPreferencesKey(userId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return null;
    }

    const preferences = JSON.parse(stored) as ProjectsOverviewPreferences;
    return preferences;
  } catch (error) {
    console.error("Error loading user preferences:", error);
    return null;
  }
};

/**
 * Save user preferences to localStorage
 */
export const saveUserPreferences = (
  userId: string,
  preferences: ProjectsOverviewPreferences
): void => {
  try {
    const key = getPreferencesKey(userId);
    localStorage.setItem(key, JSON.stringify(preferences));
  } catch (error) {
    console.error("Error saving user preferences:", error);
  }
};

/**
 * Clear user preferences from localStorage
 */
export const clearUserPreferences = (userId: string): void => {
  try {
    const key = getPreferencesKey(userId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error clearing user preferences:", error);
  }
};

/**
 * Get default preferences
 */
export const getDefaultPreferences = (): ProjectsOverviewPreferences => {
  return {
    sorting: [],
    columnVisibility: {
      budget_forecast: false,
      budget_status: false,
      milestones: true,
      working_days_remaining: true,
      calculated_end_date: false,
      total_days: false,
      last_updated: true,
    },
    pagination: {
      pageIndex: 0,
      pageSize: 25,
    },
    filters: {
      projectId: "",
      status: "all",
      healthStatus: "all",
      department: "all",
      manager: "all",
    },
  };
};
