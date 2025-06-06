import { useState, useCallback } from "react";
import { searchHistoryService } from "@/lib/services/searchHistoryService";

interface UseUserSelectionProps {
  initialValue?: string;
  multiSelect?: boolean;
  onSelectionChange?: (value: string) => void;
}

interface UseUserSelectionReturn {
  value: string;
  selectedUsers: string[];
  isPopupOpen: boolean;
  openPopup: () => void;
  closePopup: () => void;
  handleUserSelection: (users: string[], searchTerm?: string) => void;
  setValue: (value: string) => void;
  clearSelection: () => void;
}

export const useUserSelection = ({
  initialValue = "",
  multiSelect = false,
  onSelectionChange,
}: UseUserSelectionProps = {}): UseUserSelectionReturn => {
  const [value, setValue] = useState<string>(initialValue);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Parse the current value into an array of user names
  const selectedUsers = value
    ? value
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  const openPopup = useCallback(() => {
    setIsPopupOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    setIsPopupOpen(false);
  }, []);

  const handleUserSelection = useCallback(
    (users: string[], searchTerm?: string) => {
      console.log("[useUserSelection] Handling user selection:", {
        users,
        searchTerm,
        multiSelect,
      });

      const newValue = users.join(", ");
      setValue(newValue);
      onSelectionChange?.(newValue);
      setIsPopupOpen(false);

      // Add to search history if we have both a search term and selected users
      if (searchTerm && searchTerm.trim() && users.length > 0) {
        // For single selection, use the selected user
        // For multi-selection, use the first user as the primary selection
        const primaryUser = users[0];
        console.log("[useUserSelection] Adding to search history:", {
          searchTerm: searchTerm.trim(),
          primaryUser,
        });
        searchHistoryService.addToHistory(searchTerm.trim(), primaryUser);
      }
    },
    [onSelectionChange, multiSelect],
  );

  const handleSetValue = useCallback(
    (newValue: string) => {
      setValue(newValue);
      onSelectionChange?.(newValue);
    },
    [onSelectionChange],
  );

  const clearSelection = useCallback(() => {
    setValue("");
    onSelectionChange?.("");
  }, [onSelectionChange]);

  return {
    value,
    selectedUsers,
    isPopupOpen,
    openPopup,
    closePopup,
    handleUserSelection,
    setValue: handleSetValue,
    clearSelection,
  };
};
