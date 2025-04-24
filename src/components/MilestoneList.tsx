/**
 * File: MilestoneList.tsx
 * Purpose: Component for managing a list of milestone items sorted by date
 * Description: This component renders a list of milestone items sorted by date (earliest to latest).
 * The component calculates weighted completion percentages based on milestone weights and ensures
 * milestones are always displayed in chronological order.
 *
 * Imports from:
 * - React core libraries
 * - MilestoneItem component for individual milestone items
 *
 * Called by: src/components/ProjectForm.tsx
 */

import React, { useEffect } from "react";
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
}

export function MilestoneList({
  milestones,
  onMilestonesChange,
  onUpdate,
  onDelete,
  ProgressPillComponent,
}: MilestoneListProps) {
  // Sort milestones by date whenever they change
  useEffect(() => {
    // Only sort if there are milestones to sort
    if (milestones.length > 1) {
      const sortedMilestones = [...milestones].sort((a, b) => {
        // Convert dates to timestamps for comparison
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB; // Sort earliest to latest
      });

      // Check if the order has changed
      const hasOrderChanged = sortedMilestones.some((milestone, index) => {
        return milestone !== milestones[index];
      });

      // Only update if the order has changed
      if (hasOrderChanged) {
        console.log("Sorting milestones by date");
        onMilestonesChange(sortedMilestones);
      }
    }
  }, [milestones, onMilestonesChange]);

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
      {milestones.map((milestone, index) => (
        <MilestoneItem
          key={`milestone-${index}`}
          milestone={milestone}
          onUpdate={(values) => onUpdate(index, values)}
          onDelete={() => onDelete(index)}
          ProgressPillComponent={ProgressPillComponent}
        />
      ))}
    </div>
  );
}
