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
  };
  onUpdate: (values: any) => void;
  onDelete: () => void;
}

export function MilestoneSortableItem({
  id,
  milestone,
  onUpdate,
  onDelete,
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
      className={`${isDragging ? "opacity-50" : ""}`}
    >
      <div className="grid grid-cols-[30px_1fr] gap-2">
        <button
          className="flex items-center justify-center h-10 w-6 touch-none text-gray-400 hover:text-gray-600 transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="grid grid-cols-[140px_1fr_150px_220px] gap-2 pr-2">
          <Input
            placeholder="Date"
            type="date"
            value={milestone.date}
            onChange={(e) => onUpdate({ date: e.target.value })}
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
              />
              {milestone.tasks && milestone.tasks.length > 0 && (
                <div
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500"
                  title={`${milestone.tasks.length} task${milestone.tasks.length > 1 ? "s" : ""}`}
                >
                  <ListChecks className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
          <Input
            placeholder="Owner"
            value={milestone.owner}
            onChange={(e) => onUpdate({ owner: e.target.value })}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Completion %"
              type="number"
              min="0"
              max="100"
              value={milestone.completion}
              onChange={(e) => onUpdate({ completion: Number(e.target.value) })}
              className="w-24"
            />
            <select
              value={milestone.status}
              onChange={(e) =>
                onUpdate({
                  status: e.target.value as "green" | "yellow" | "red",
                })
              }
              className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
