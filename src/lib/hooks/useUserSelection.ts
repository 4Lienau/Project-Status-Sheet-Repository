import { useState, useCallback } from "react";

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
  handleUserSelection: (users: string[]) => void;
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
    (users: string[]) => {
      const newValue = users.join(", ");
      setValue(newValue);
      onSelectionChange?.(newValue);
      setIsPopupOpen(false);
    },
    [onSelectionChange],
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
