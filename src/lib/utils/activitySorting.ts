/**
 * Utility functions for sorting activities by date
 */

interface ActivityItem {
  date: string;
  description: string;
  completion: number;
  assignee: string;
}

interface ActivityWithIndex {
  item: ActivityItem;
  originalIndex: number;
}

/**
 * Sorts activities by date while preserving original indices for form updates
 * @param activities - Array of activity items
 * @returns Array of activities with original indices, sorted by date
 */
export const sortActivitiesByDate = (
  activities: ActivityItem[],
): ActivityWithIndex[] => {
  // Create array of [item, originalIndex] pairs
  const itemsWithIndices = activities.map((item, index) => ({
    item,
    originalIndex: index,
  }));

  // Sort by date
  return [...itemsWithIndices].sort((a, b) =>
    a.item.date.localeCompare(b.item.date),
  );
};
