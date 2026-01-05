/**
 * File: MilestoneList.tsx
 * Purpose: Component for managing a list of milestone items sorted by date
 * Description: This component renders a list of milestone items sorted by date (earliest to latest).
 * The component calculates weighted completion percentages based on milestone weights and ensures
 * milestones are always displayed in chronological order without modifying the original data.
 *
 * Imports from:
 * - React core libraries
 * - MilestoneItem component for individual milestone items
 *
 * Called by: src/components/ProjectForm.tsx
 */

import React, { useMemo } from "react";
import { MilestoneItem } from "./MilestoneItem";

interface Task {
  id?: string;
  description: string;
  assignee: string;
  date: string;
  completion: number;
}

interface Milestone {
  id?: string;
  date: string;
  end_date?: string;
  milestone: string;
  owner: string;
  completion: number;
  status: "green" | "yellow" | "red";
  weight?: number;
  tasks?: Task[];
}

interface MilestoneListProps {
  milestones: Milestone[];
  onMilestonesChange: (milestones: Milestone[]) => void;
  onUpdate: (index: number, values: Partial<Milestone>) => void;
  onDelete: (index: number) => void;
  setIsDragging?: (dragging: boolean) => void;
  ProgressPillComponent?: React.ComponentType<{
    completion: number;
    status: string;
    onChange: (value: number) => void;
  }>;
  projectId?: string;
}

export function MilestoneList({
  milestones,
  onMilestonesChange,
  onUpdate,
  onDelete,
  ProgressPillComponent,
  projectId,
}: MilestoneListProps) {
  // Create a sorted view of milestones for display purposes only
  // This doesn't modify the original array, just creates a sorted reference to it
  const sortedMilestonesWithIndices = useMemo(() => {
    return milestones
      .map((milestone, originalIndex) => ({ milestone, originalIndex }))
      .sort((a, b) => {
        // Convert dates to timestamps for comparison
        const dateA = new Date(a.milestone.date).getTime();
        const dateB = new Date(b.milestone.date).getTime();
        return dateA - dateB; // Sort earliest to latest
      });
  }, [milestones]);

  // Calculate weighted completion percentage
  const calculateWeightedCompletion = (milestones: Milestone[]) => {
    if (!milestones.length) return 0;

    // Calculate the weighted sum of completion percentages
    const weightedSum = milestones.reduce((sum, m) => {
      const weight = m.weight || 3;
      // Multiply completion by weight directly
      return sum + m.completion * weight;
    }, 0);

    // Calculate total possible weighted completion (sum of weights * 100)
    const totalPossibleWeighted = milestones.reduce(
      (sum, m) => sum + (m.weight || 3) * 100,
      0,
    );

    // Return the weighted percentage
    return Math.round((weightedSum / totalPossibleWeighted) * 100);
  };

  return (
    <div className="space-y-1">
      {/* Map over the sorted milestones for display, but keep original indices for updates */}
      {sortedMilestonesWithIndices.map(({ milestone, originalIndex }) => (
        <MilestoneItem
          key={`milestone-${originalIndex}`}
          milestone={milestone}
          onUpdate={(values) => onUpdate(originalIndex, values)}
          onDelete={() => onDelete(originalIndex)}
          ProgressPillComponent={ProgressPillComponent}
          projectId={projectId}
        />
      ))}
    </div>
  );
}
