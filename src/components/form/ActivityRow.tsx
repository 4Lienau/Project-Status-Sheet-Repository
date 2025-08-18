import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import UserSelectionInput from "@/components/ui/user-selection-input";
import { ProgressPill } from "@/components/ui/progress-pill";

interface ActivityRowProps {
  item: {
    date: string;
    description: string;
    completion: number;
    assignee: string;
  };
  originalIndex: number;
  onUpdate: (field: string, value: string | number) => void;
  onDelete: () => void;
}

/**
 * Individual activity row component for the NextPeriodActivitiesSection
 */
export const ActivityRow: React.FC<ActivityRowProps> = ({
  item,
  originalIndex,
  onUpdate,
  onDelete,
}) => {
  return (
    <div
      key={originalIndex}
      className="grid grid-cols-[140px_1fr_80px_150px_auto] gap-2 items-start"
    >
      <Input
        type="date"
        value={item.date}
        onChange={(e) => onUpdate("date", e.target.value)}
        className="bg-white/50 backdrop-blur-sm border-gray-200/50"
      />
      <Input
        value={item.description}
        onChange={(e) => onUpdate("description", e.target.value)}
        placeholder="Enter activity"
        className="bg-white/50 backdrop-blur-sm border-gray-200/50"
      />
      <div className="flex flex-row items-center">
        <div className="flex-1">
          <ProgressPill
            completion={item.completion}
            dueDate={item.date}
            onChange={(value) => onUpdate("completion", value)}
          />
        </div>
      </div>
      <UserSelectionInput
        value={item.assignee}
        onChange={(value) => onUpdate("assignee", value)}
        placeholder="Click to select assignee..."
        multiSelect={false}
        className="bg-white/50 backdrop-blur-sm border-gray-200/50"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="h-9 w-9 p-0"
      >
        <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
      </Button>
    </div>
  );
};

export default ActivityRow;
