import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface MilestoneSortableItemProps {
  id: string;
  milestone: {
    date: string;
    milestone: string;
    owner: string;
    completion: number;
    status: "green" | "yellow" | "red";
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-[30px_1fr] gap-2 ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        className="flex items-center justify-center h-10 w-6 touch-none text-gray-400 hover:text-gray-600 transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="grid grid-cols-4 gap-2">
        <Input
          placeholder="Date"
          type="date"
          value={milestone.date}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
          onChange={(e) => onUpdate({ date: e.target.value })}
        />
        <Input
          placeholder="Milestone"
          value={milestone.milestone}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
          onChange={(e) => onUpdate({ milestone: e.target.value })}
        />
        <Input
          placeholder="Owner"
          value={milestone.owner}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
          onChange={(e) => onUpdate({ owner: e.target.value })}
        />
        <div className="flex gap-2">
          <Input
            placeholder="Completion %"
            type="number"
            min="0"
            max="100"
            value={milestone.completion}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
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
            className="hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
