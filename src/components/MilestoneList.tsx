/**
 * File: MilestoneList.tsx
 * Purpose: Component for managing a list of draggable milestone items
 * Description: This component renders a list of milestone items that can be reordered via drag
 * and drop. It uses dnd-kit for the drag and drop functionality and manages the state of the
 * milestones list. The component also calculates weighted completion percentages based on milestone
 * weights and handles drag events with proper state updates.
 *
 * Imports from:
 * - React core libraries
 * - dnd-kit for drag and drop functionality
 * - MilestoneSortableItem component for individual milestone items
 *
 * Called by: src/components/ProjectForm.tsx
 */

import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MilestoneSortableItem } from "./MilestoneSortableItem";

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
}

export function MilestoneList({
  milestones,
  onMilestonesChange,
  onUpdate,
  onDelete,
  setIsDragging,
}: MilestoneListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  const handleDragStart = () => {
    console.log("Drag operation started");
    if (setIsDragging) {
      setIsDragging(true);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = milestones.findIndex(
        (_, index) => `milestone-${index}` === active.id,
      );
      const newIndex = milestones.findIndex(
        (_, index) => `milestone-${index}` === over.id,
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        // Create a deep copy of milestones to ensure all properties are preserved
        const milestonesToMove = JSON.parse(JSON.stringify(milestones));
        const newMilestones = arrayMove(milestonesToMove, oldIndex, newIndex);

        // Log the weights before and after to verify they're preserved
        console.log(
          "Weights before reordering:",
          milestones.map((m) => m.weight || 3),
        );
        console.log(
          "Weights after reordering:",
          newMilestones.map((m) => m.weight || 3),
        );

        onMilestonesChange(newMilestones);
      }
    }

    // Important: Set a small delay before turning off the dragging flag
    // This prevents the loading screen from appearing during state updates
    setTimeout(() => {
      console.log("Drag operation ended");
      if (setIsDragging) {
        setIsDragging(false);
      }
    }, 300); // Increased delay to ensure state updates complete
  };

  const items = milestones.map((_, index) => `milestone-${index}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Column headers removed as requested */}
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <MilestoneSortableItem
              key={`milestone-${index}`}
              id={`milestone-${index}`}
              milestone={milestone}
              onUpdate={(values) => onUpdate(index, values)}
              onDelete={() => onDelete(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
