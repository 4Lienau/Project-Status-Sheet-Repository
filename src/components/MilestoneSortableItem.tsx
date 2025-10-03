/**
 * File: MilestoneSortableItem.tsx
 * Purpose: Component for a draggable milestone item with task management
 * Description: This component renders a single milestone item that can be dragged and reordered
 * using dnd-kit. It includes fields for milestone date, description, owner, completion percentage,
 * weight, and status. The component also provides an expandable section for managing tasks associated
 * with the milestone and calculates milestone completion based on task progress.
 *
 * Imports from:
 * - React core libraries
 * - dnd-kit for drag and drop functionality
 * - UI components from shadcn/ui
 * - TaskList component for managing milestone tasks
 * - Lucide icons
 *
 * Called by: src/components/MilestoneList.tsx
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  ListChecks,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { TaskList } from "./TaskList";
import UserSelectionInput from "./ui/user-selection-input";
import { projectService } from "@/lib/services/project";
import { projectDurationService } from "@/lib/services/projectDurationService";

interface Task {
  id?: string;
  description: string;
  assignee: string;
  date: string;
  completion: number;
}

interface MilestoneSortableItemProps {
  id: string;
  milestone: {
    date: string;
    milestone: string;
    owner: string;
    completion: number;
    status: "green" | "yellow" | "red";
    tasks?: Task[];
    weight?: number;
  };
  onUpdate: (values: any) => void;
  onDelete: () => void;
  projectId?: string;
}

export function MilestoneSortableItem({
  id,
  milestone,
  onUpdate,
  onDelete,
  projectId,
}: MilestoneSortableItemProps) {
  const [showTasks, setShowTasks] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: "relative" as const,
  };

  const handleTasksChange = (tasks: Task[]) => {
    console.log("[DEBUG] MilestoneSortableItem - Tasks changed:", tasks);

    // Calculate milestone completion based on tasks
    if (tasks && tasks.length > 0) {
      const totalTaskCompletion = tasks.reduce(
        (sum, task) => sum + task.completion,
        0,
      );
      const avgTaskCompletion = Math.round(totalTaskCompletion / tasks.length);

      // Apply weight factor to the completion percentage
      const weight = milestone.weight || 3; // Default to 3 if not set

      // Update both tasks and completion percentage
      onUpdate({
        tasks,
        completion: avgTaskCompletion,
      });
    } else {
      // If no tasks, just update the tasks array
      onUpdate({ tasks });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card rounded-md mb-2 p-2 ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="grid grid-cols-[30px_1fr] gap-2">
        <button
          className="flex items-center justify-center h-10 w-6 touch-none text-muted-foreground hover:text-foreground transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="grid grid-cols-[140px_1fr_150px_auto] gap-2">
          <Input
            placeholder="Date"
            type="date"
            value={milestone.date}
            onChange={(e) => {
              onUpdate({ date: e.target.value });

              // Update project duration if projectId is provided
              if (projectId) {
                console.log(
                  "[MILESTONE_SORTABLE] Date changed, updating project duration for:",
                  projectId,
                );
                // Use a longer timeout to ensure the milestone is saved first
                setTimeout(async () => {
                  try {
                    console.log(
                      "[MILESTONE_SORTABLE] Starting duration update after milestone date change",
                    );
                    const success =
                      await projectDurationService.updateProjectDuration(
                        projectId,
                      );
                    if (success) {
                      console.log(
                        "[MILESTONE_SORTABLE] ✓ Successfully updated project duration after date change",
                      );
                    } else {
                      console.error(
                        "[MILESTONE_SORTABLE] ✗ Failed to update project duration after date change",
                      );
                    }
                  } catch (error) {
                    console.error(
                      "[MILESTONE_SORTABLE] ✗ Error updating project duration after date change:",
                      error,
                    );
                  }
                }, 500); // Increased timeout to ensure milestone is saved
              }
            }}
            className="bg-card border-border text-foreground"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              onClick={() => setShowTasks(!showTasks)}
            >
              {showTasks ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <div className="relative flex-1">
              <Input
                placeholder="Milestone"
                value={milestone.milestone}
                onChange={(e) => onUpdate({ milestone: e.target.value })}
                className="bg-card border-border text-foreground"
              />
              {milestone.tasks && milestone.tasks.length > 0 && (
                <div
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary"
                  title={`${milestone.tasks.length} task${milestone.tasks.length > 1 ? "s" : ""}`}
                >
                  <ListChecks className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
          <UserSelectionInput
            value={milestone.owner}
            onChange={(value) => onUpdate({ owner: value })}
            placeholder="Click to select owner..."
            multiSelect={false}
            className="bg-card/50 backdrop-blur-sm border-border"
          />
          <div className="grid grid-cols-[80px_70px_120px_40px] gap-2">
            <Input
              placeholder="Completion %"
              type="number"
              min="0"
              max="100"
              value={milestone.completion}
              onChange={(e) => onUpdate({ completion: Number(e.target.value) })}
              className="bg-card border-border text-foreground"
            />
            <div className="relative">
              <select
                value={milestone.weight !== undefined ? milestone.weight : 3}
                onChange={(e) => {
                  const newWeight = Number(e.target.value);
                  console.log("Setting milestone weight to:", newWeight);
                  onUpdate({
                    weight: newWeight,
                  });
                }}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${(milestone.weight || 3) >= 4 ? "font-semibold text-primary" : ""}`}
                title="Milestone Weight (1-5)"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
              {(milestone.weight !== undefined ? milestone.weight : 3) >= 4 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
              )}
            </div>
            <select
              value={milestone.status}
              onChange={(e) =>
                onUpdate({
                  status: e.target.value as "green" | "yellow" | "red",
                })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="green">On Track</option>
              <option value="yellow">At Risk</option>
              <option value="red">Behind</option>
            </select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`hover:opacity-80 ${
                milestone.status === "green"
                  ? "text-green-600"
                  : milestone.status === "yellow"
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {showTasks && (
        <TaskList
          tasks={milestone.tasks || []}
          onTasksChange={handleTasksChange}
          defaultAssignee={milestone.owner}
          defaultDate={milestone.date}
        />
      )}
    </div>
  );
}