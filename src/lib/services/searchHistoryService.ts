/**
 * Search History Service
 * Manages recent Azure AD user searches in localStorage
 */

const SEARCH_HISTORY_KEY = "azure_ad_search_history";
const MAX_HISTORY_ITEMS = 3;

export interface SearchHistoryItem {
  searchTerm: string;
  selectedUser: string;
  timestamp: number;
}

export const searchHistoryService = {
  /**
   * Get the search history from localStorage
   */
  getSearchHistory(): SearchHistoryItem[] {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!stored) {
        console.log("[SearchHistoryService] No stored history found");
        return [];
      }

      const history = JSON.parse(stored) as SearchHistoryItem[];
      // Sort by timestamp (most recent first)
      const sortedHistory = history.sort((a, b) => b.timestamp - a.timestamp);
      console.log("[SearchHistoryService] Retrieved history:", sortedHistory);
      return sortedHistory;
    } catch (error) {
      console.error("Error loading search history:", error);
      return [];
    }
  },

  /**
   * Add a new search to the history
   */
  addToHistory(searchTerm: string, selectedUser: string): void {
    try {
      const trimmedSearchTerm = searchTerm.trim();
      const trimmedSelectedUser = selectedUser.trim();

      console.log("[SearchHistoryService] Adding to history:", {
        searchTerm: trimmedSearchTerm,
        selectedUser: trimmedSelectedUser,
      });

      if (!trimmedSearchTerm || !trimmedSelectedUser) {
        console.log(
          "[SearchHistoryService] Skipping - empty search term or user",
        );
        return;
      }

      const history = this.getSearchHistory();
      console.log("[SearchHistoryService] Current history:", history);

      // Remove any existing entry with the same search term or selected user
      // This handles both directory users and custom entries
      const filteredHistory = history.filter(
        (item) =>
          item.searchTerm.toLowerCase() !== trimmedSearchTerm.toLowerCase() &&
          item.selectedUser.toLowerCase() !== trimmedSelectedUser.toLowerCase(),
      );

      // Add the new entry at the beginning
      const newEntry: SearchHistoryItem = {
        searchTerm: trimmedSearchTerm,
        selectedUser: trimmedSelectedUser,
        timestamp: Date.now(),
      };

      const updatedHistory = [newEntry, ...filteredHistory].slice(
        0,
        MAX_HISTORY_ITEMS,
      );

      console.log("[SearchHistoryService] Updated history:", updatedHistory);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Error saving search history:", error);
    }
  },

  /**
   * Get the last search term used
   */
  getLastSearchTerm(): string {
    const history = this.getSearchHistory();
    return history.length > 0 ? history[0].searchTerm : "";
  },

  /**
   * Get the last selected user
   */
  getLastSelectedUser(): string {
    const history = this.getSearchHistory();
    return history.length > 0 ? history[0].selectedUser : "";
  },

  /**
   * Clear all search history
   */
  clearHistory(): void {
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error("Error clearing search history:", error);
    }
  },

  /**
   * Remove a specific item from history
   */
  removeFromHistory(searchTerm: string): void {
    try {
      const history = this.getSearchHistory();
      const filteredHistory = history.filter(
        (item) => item.searchTerm.toLowerCase() !== searchTerm.toLowerCase(),
      );

      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error("Error removing from search history:", error);
    }
  },
};
