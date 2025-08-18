import { useCallback } from "react";

/**
 * Custom hook for managing list operations (add, update, delete)
 * Provides reusable functions for common list manipulation patterns
 */
export const useListManagement = <T>(
  items: T[],
  setItems: (updater: (prev: T[]) => T[]) => void,
) => {
  const addItem = useCallback(
    (newItem: T) => {
      setItems((prev) => [...prev, newItem]);
    },
    [setItems],
  );

  const updateItem = useCallback(
    (index: number, updatedItem: Partial<T>) => {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, ...updatedItem } : item,
        ),
      );
    },
    [setItems],
  );

  const deleteItem = useCallback(
    (index: number) => {
      setItems((prev) => prev.filter((_, i) => i !== index));
    },
    [setItems],
  );

  const updateItemByField = useCallback(
    (index: number, field: keyof T, value: any) => {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      );
    },
    [setItems],
  );

  return {
    addItem,
    updateItem,
    deleteItem,
    updateItemByField,
  };
};
