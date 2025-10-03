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
        className="bg-card/50 backdrop-blur-sm border-border text-foreground"
      />
      <Input
        value={item.description}
        onChange={(e) => onUpdate("description", e.target.value)}
        placeholder="Enter activity"
        className="bg-card/50 backdrop-blur-sm border-border text-foreground"
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
        className="bg-card/50 backdrop-blur-sm border-border"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ActivityRow;