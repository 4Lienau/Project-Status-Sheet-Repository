/**
 * File: MilestoneItem.tsx
 * Purpose: Component for a milestone item with task management
 * Description: This component renders a single milestone item. It includes fields for milestone date,
 * description, owner, completion percentage, weight, and status. The component also provides an
 * expandable section for managing tasks associated with the milestone and calculates milestone
 * completion based on task progress.
 *
 * Imports from:
 * - React core libraries
 * - UI components from shadcn/ui
 * - TaskList component for managing milestone tasks
 * - Lucide icons
 *
 * Called by: src/components/MilestoneList.tsx
 */

import {
  Trash2,
  ChevronDown,
  ChevronRight,
  ListChecks,
  CalendarIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { TaskList } from "./TaskList";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";
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

interface MilestoneItemProps {
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
  ProgressPillComponent?: React.ComponentType<{
    completion: number;
    status: string;
    onChange: (value: number) => void;
  }>;
}

export function MilestoneItem({
  milestone,
  onUpdate,
  onDelete,
  projectId,
  ProgressPillComponent,
}: MilestoneItemProps) {
  const [showTasks, setShowTasks] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleTasksChange = (tasks: Task[]) => {
    console.log("[DEBUG] MilestoneItem - Tasks changed:", tasks);

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
    <div className="border-b border-border py-1 bg-card rounded-md mb-2">
      <div className="grid grid-cols-[1fr] gap-2">
        <div className="grid grid-cols-[140px_1fr_150px_auto] gap-2">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal h-10 bg-card border-border text-foreground"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {milestone.date ? (
                  (() => {
                    // Parse date string directly as YYYY-MM-DD without timezone conversion
                    const [year, month, day] = milestone.date.split("-");
                    return `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year}`;
                  })()
                ) : (
                  <span className="text-muted-foreground">Select date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  milestone.date
                    ? (() => {
                        // Parse YYYY-MM-DD string and create date in local timezone
                        const [year, month, day] = milestone.date.split("-");
                        return new Date(
                          parseInt(year),
                          parseInt(month) - 1,
                          parseInt(day),
                        );
                      })()
                    : undefined
                }
                defaultMonth={
                  milestone.date
                    ? (() => {
                        // Parse YYYY-MM-DD string and create date in local timezone
                        const [year, month, day] = milestone.date.split("-");
                        return new Date(
                          parseInt(year),
                          parseInt(month) - 1,
                          parseInt(day),
                        );
                      })()
                    : undefined
                }
                onSelect={(date) => {
                  if (date) {
                    // Simply format the date as YYYY-MM-DD without timezone adjustments
                    const formattedDate = format(date, "yyyy-MM-dd");

                    onUpdate({ date: formattedDate });

                    // Update project duration if projectId is provided
                    if (projectId) {
                      console.log(
                        "[MILESTONE_ITEM] Date changed, updating project duration for:",
                        projectId,
                      );
                      setTimeout(async () => {
                        try {
                          const success =
                            await projectDurationService.updateProjectDuration(
                              projectId,
                            );
                          if (success) {
                            console.log(
                              "[MILESTONE_ITEM] Successfully updated project duration",
                            );
                          } else {
                            console.error(
                              "[MILESTONE_ITEM] Failed to update project duration",
                            );
                          }
                        } catch (error) {
                          console.error(
                            "[MILESTONE_ITEM] Error updating project duration:",
                            error,
                          );
                        }
                      }, 100);
                    }

                    // Close the popover after selection
                    setIsCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
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
            {ProgressPillComponent ? (
              <ProgressPillComponent
                completion={milestone.completion}
                status={milestone.status}
                onChange={(value) => onUpdate({ completion: value })}
              />
            ) : (
              <Input
                placeholder="Completion %"
                type="number"
                min="0"
                max="100"
                value={milestone.completion}
                onChange={(e) =>
                  onUpdate({ completion: Number(e.target.value) })
                }
                className="bg-card border-border text-foreground"
              />
            )}
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