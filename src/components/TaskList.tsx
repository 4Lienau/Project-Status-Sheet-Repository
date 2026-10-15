/**
 * File: TaskList.tsx
 * Purpose: Component for managing tasks associated with milestones
 * Description: This component provides a UI for adding, editing, and removing tasks associated
 * with project milestones. It includes fields for task description, assignee, date, and completion
 * percentage. The component maintains its own state and communicates changes back to the parent
 * component.
 *
 * Imports from:
 * - React core libraries
 * - UI components from shadcn/ui
 * - Lucide icons
 *
 * Called by: src/components/MilestoneSortableItem.tsx
 */

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUpCircle, Calendar as CalendarIcon } from "lucide-react";
import UserSelectionInput from "@/components/ui/user-selection-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  getTaskEndDate,
  getTaskDurationDays,
  getTaskRisk,
} from "@/lib/services/taskSchedule";

const RISK_DOT_CLASS = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

interface Task {
  id?: string;
  description: string;
  assignee: string;
  date: string;
  completion: number;
  duration_days?: number;
}

interface TaskListProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onPromoteTask?: (taskIndex: number) => void;
  defaultAssignee: string;
  defaultDate: string;
}

function TaskDatePicker({
  date,
  onDateChange,
  minDate,
  disabled,
  placeholder = "Select date",
}: {
  date: string;
  onDateChange: (value: string) => void;
  minDate?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const parsedDate = date
    ? (() => {
        const [year, month, day] = date.split("-");
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      })()
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="w-full justify-start text-left font-normal h-10 px-2 bg-card/50 backdrop-blur-sm border-border text-foreground"
        >
          <CalendarIcon className="mr-1.5 h-4 w-4 shrink-0" />
          {date ? (
            (() => {
              const [year, month, day] = date.split("-");
              return `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year}`;
            })()
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parsedDate}
          defaultMonth={parsedDate}
          disabled={
            minDate ? { before: new Date(`${minDate}T00:00:00`) } : undefined
          }
          onSelect={(selectedDate) => {
            if (selectedDate) {
              const formattedDate = format(selectedDate, "yyyy-MM-dd");
              onDateChange(formattedDate);
              setOpen(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function TaskList({
  tasks,
  onTasksChange,
  onPromoteTask,
  defaultAssignee,
  defaultDate,
}: TaskListProps) {
  const generateId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  const handleAddTask = () => {
    const newTasks = [
      ...tasks,
      {
        id: generateId(),
        description: "",
        assignee: defaultAssignee,
        date: "",
        completion: 0,
        duration_days: 1,
      },
    ];
    console.log("[DEBUG] TaskList - Adding new task, tasks now:", newTasks);
    onTasksChange(newTasks);
  };

  const handleUpdateTask = (
    originalIndex: number,
    field: keyof Task,
    value: any,
  ) => {
    const updatedTasks = tasks.map((task, i) =>
      i === originalIndex ? { ...task, [field]: value } : task,
    );
    console.log(
      `[DEBUG] TaskList - Updating task ${originalIndex}, field ${String(field)}:`,
      updatedTasks,
    );
    onTasksChange(updatedTasks);
  };

  const handleDeleteTask = (originalIndex: number) => {
    const filteredTasks = tasks.filter((_, i) => i !== originalIndex);
    console.log(
      `[DEBUG] TaskList - Deleting task ${originalIndex}, tasks now:`,
      filteredTasks,
    );
    onTasksChange(filteredTasks);
  };

  // Build a stable mapping of tasks to their original indices, then sort by date for display
  const tasksWithIndices = tasks.map((task, originalIndex) => ({
    task,
    originalIndex,
  }));

  const sortedTasks = [...tasksWithIndices].sort((a, b) => {
    const aDate = a.task.date;
    const bDate = b.task.date;

    // Handle empty or invalid dates by putting them at the end
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;

    // Sort by date string comparison (YYYY-MM-DD format)
    return aDate.localeCompare(bDate);
  });

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-3 mt-2">
      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_150px_120px_120px_64px_100px_auto] gap-2 items-start">
        <div className="font-medium text-sm text-primary pl-[18px]">Task</div>
        <div className="font-medium text-sm text-primary -ml-16">Assignee</div>
        <div className="font-medium text-sm text-primary -ml-16">Start Date</div>
        <div className="font-medium text-sm text-primary -ml-16">End Date</div>
        <div className="font-medium text-sm text-primary -ml-16">Days</div>
        <div className="font-medium text-sm text-primary whitespace-nowrap -ml-16">Completion %</div>
        <div></div>
      </div>

      {sortedTasks.map(({ task, originalIndex }) => {
        const risk = getTaskRisk(task, today);
        return (
        <div
          key={task.id ?? `task-${originalIndex}`}
          className="grid grid-cols-[1fr_150px_120px_120px_64px_100px_auto] gap-2 items-start"
        >
          <div className="flex items-center gap-2 h-10">
            {/* Schedule risk: actual % vs. % of days elapsed (see getTaskRisk) */}
            <span
              role={risk ? "img" : undefined}
              aria-label={risk ? `Schedule ${risk.color}: ${risk.reason}` : undefined}
              title={risk?.reason}
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${risk ? RISK_DOT_CLASS[risk.color] : ""}`}
            />
            <Input
              value={task.description}
              onChange={(e) =>
                handleUpdateTask(originalIndex, "description", e.target.value)
              }
              placeholder="Enter task description"
              className="bg-card/50 backdrop-blur-sm border-border text-foreground"
            />
          </div>
          <UserSelectionInput
            value={task.assignee}
            onChange={(value) =>
              handleUpdateTask(originalIndex, "assignee", value)
            }
            placeholder="Click to select assignee..."
            multiSelect={false}
            className="bg-card/50 backdrop-blur-sm border-border"
          />
          <TaskDatePicker
            date={task.date || ""}
            onDateChange={(value) =>
              handleUpdateTask(originalIndex, "date", value)
            }
          />
          {/* End date is derived from start + days; picking one recalculates days */}
          <TaskDatePicker
            date={getTaskEndDate(task.date, task.duration_days)}
            minDate={task.date}
            disabled={!task.date}
            placeholder={task.date ? "Select date" : "Set start"}
            onDateChange={(value) =>
              handleUpdateTask(
                originalIndex,
                "duration_days",
                getTaskDurationDays(task.date, value),
              )
            }
          />
          <Input
            type="number"
            min="1"
            max="365"
            value={task.duration_days || 1}
            onChange={(e) =>
              handleUpdateTask(
                originalIndex,
                "duration_days",
                Math.max(1, Number(e.target.value)),
              )
            }
            placeholder="Days"
            title="Duration in days"
            className="bg-card/50 backdrop-blur-sm border-border text-foreground"
          />
          <Input
            type="number"
            min="0"
            max="100"
            value={task.completion}
            onChange={(e) =>
              handleUpdateTask(
                originalIndex,
                "completion",
                Number(e.target.value),
              )
            }
            className="bg-card/50 backdrop-blur-sm border-border text-foreground"
          />
          <div className="flex gap-1">
            {onPromoteTask && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onPromoteTask(originalIndex)}
                className="text-primary hover:text-primary hover:bg-primary/10"
                title="Promote to Milestone"
              >
                <ArrowUpCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteTask(originalIndex)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        onClick={handleAddTask}
        className="bg-card/50 backdrop-blur-sm border-border text-foreground text-sm"
      >
        Add Task
      </Button>
    </div>
  );
}