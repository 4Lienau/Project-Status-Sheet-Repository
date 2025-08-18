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

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import UserSelectionInput from "@/components/ui/user-selection-input";

interface Task {
  id?: string;
  description: string;
  assignee: string;
  date: string;
  completion: number;
}

interface TaskListProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  defaultAssignee: string;
  defaultDate: string;
}

export function TaskList({
  tasks,
  onTasksChange,
  defaultAssignee,
  defaultDate,
}: TaskListProps) {
  const handleAddTask = () => {
    const newTasks = [
      ...tasks,
      {
        description: "",
        assignee: defaultAssignee,
        date: defaultDate,
        completion: 0,
      },
    ];
    console.log("[DEBUG] TaskList - Adding new task, tasks now:", newTasks);
    onTasksChange(newTasks);
  };

  const handleUpdateTask = (index: number, field: keyof Task, value: any) => {
    const updatedTasks = tasks.map((task, i) =>
      i === index ? { ...task, [field]: value } : task,
    );
    console.log(
      `[DEBUG] TaskList - Updating task ${index}, field ${field}:`,
      updatedTasks,
    );
    onTasksChange(updatedTasks);
  };

  const handleDeleteTask = (index: number) => {
    const filteredTasks = tasks.filter((_, i) => i !== index);
    console.log(
      `[DEBUG] TaskList - Deleting task ${index}, tasks now:`,
      filteredTasks,
    );
    onTasksChange(filteredTasks);
  };

  // Sort tasks by date before rendering
  const sortedTasks = [...tasks].sort((a, b) => {
    // Handle empty or invalid dates by putting them at the end
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;

    // Sort by date string comparison (YYYY-MM-DD format)
    return a.date.localeCompare(b.date);
  });

  // Create a mapping from sorted index to original index for updates/deletes
  const getOriginalIndex = (sortedIndex: number) => {
    const sortedTask = sortedTasks[sortedIndex];
    return tasks.findIndex(
      (task) =>
        task.description === sortedTask.description &&
        task.assignee === sortedTask.assignee &&
        task.date === sortedTask.date &&
        task.completion === sortedTask.completion,
    );
  };

  return (
    <div className="pl-8 space-y-3 mt-2">
      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_150px_140px_100px_auto] gap-2 items-start">
        <div className="font-medium text-sm text-blue-800">Task</div>
        <div className="font-medium text-sm text-blue-800">Assignee</div>
        <div className="font-medium text-sm text-blue-800">Date</div>
        <div className="font-medium text-sm text-blue-800">Completion %</div>
        <div></div>
      </div>

      {sortedTasks.map((task, sortedIndex) => {
        const originalIndex = getOriginalIndex(sortedIndex);
        return (
          <div
            key={`${originalIndex}-${task.date}-${task.description}`}
            className="grid grid-cols-[1fr_150px_140px_100px_auto] gap-2 items-start"
          >
            <Input
              value={task.description}
              onChange={(e) =>
                handleUpdateTask(originalIndex, "description", e.target.value)
              }
              placeholder="Enter task description"
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
            <UserSelectionInput
              value={task.assignee}
              onChange={(value) =>
                handleUpdateTask(originalIndex, "assignee", value)
              }
              placeholder="Click to select assignee..."
              multiSelect={false}
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
            <Input
              type="date"
              value={task.date}
              onChange={(e) =>
                handleUpdateTask(originalIndex, "date", e.target.value)
              }
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
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
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteTask(originalIndex)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        onClick={handleAddTask}
        className="bg-white/50 backdrop-blur-sm border-gray-200/50 text-sm"
      >
        Add Task
      </Button>
    </div>
  );
}
