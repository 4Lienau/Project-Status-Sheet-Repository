import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import UserSelectionInput from "@/components/ui/user-selection-input";

export interface SubActivity {
  description: string;
  date: string;
  assignee: string;
  completion: number;
}

interface SubActivityListProps {
  subActivities: SubActivity[];
  defaultDate: string;
  defaultAssignee: string;
  onChange: (subActivities: SubActivity[]) => void;
}

export const SubActivityList: React.FC<SubActivityListProps> = ({
  subActivities,
  defaultDate,
  defaultAssignee,
  onChange,
}) => {
  const sorted = subActivities
    .map((sa, i) => ({ sa, i }))
    .sort((a, b) => (a.sa.date || "").localeCompare(b.sa.date || ""));

  const handleUpdate = (originalIndex: number, field: keyof SubActivity, value: string | number) => {
    const updated = subActivities.map((sa, i) =>
      i === originalIndex ? { ...sa, [field]: value } : sa,
    );
    onChange(updated);
  };

  const handleDelete = (originalIndex: number) => {
    onChange(subActivities.filter((_, i) => i !== originalIndex));
  };

  const handleAdd = () => {
    onChange([
      ...subActivities,
      { description: "", date: defaultDate, assignee: defaultAssignee, completion: 0 },
    ]);
  };

  return (
    <div className="mt-2 ml-6 space-y-2 border-l-2 border-primary/20 pl-4">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_150px_150px_80px_36px] gap-2 items-center">
        <div className="font-medium text-xs text-primary">Sub-Activity</div>
        <div className="font-medium text-xs text-primary">Date</div>
        <div className="font-medium text-xs text-primary">Assignee</div>
        <div className="font-medium text-xs text-primary">% Done</div>
        <div />
      </div>

      {sorted.map(({ sa, i: originalIndex }) => (
        <div
          key={originalIndex}
          className="grid grid-cols-[1fr_150px_150px_80px_36px] gap-2 items-center"
        >
          <Input
            value={sa.description}
            onChange={(e) => handleUpdate(originalIndex, "description", e.target.value)}
            placeholder="Sub-activity description"
            className="bg-card/50 backdrop-blur-sm border-border text-foreground h-8 text-sm"
          />
          <Input
            type="date"
            value={sa.date}
            onChange={(e) => handleUpdate(originalIndex, "date", e.target.value)}
            className="bg-card/50 backdrop-blur-sm border-border text-foreground h-8 text-sm dark:[color-scheme:dark]"
          />
          <UserSelectionInput
            value={sa.assignee}
            onChange={(value) => handleUpdate(originalIndex, "assignee", value)}
            placeholder="Select assignee..."
            multiSelect={false}
            className="bg-card/50 backdrop-blur-sm border-border h-8 text-sm"
          />
          <Input
            type="number"
            min={0}
            max={100}
            value={sa.completion}
            onChange={(e) =>
              handleUpdate(originalIndex, "completion", Math.min(100, Math.max(0, Number(e.target.value))))
            }
            className="bg-card/50 backdrop-blur-sm border-border text-foreground h-8 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(originalIndex)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={handleAdd}
        className="h-7 text-xs px-3 bg-card/50 backdrop-blur-sm border-border text-foreground"
      >
        Add Sub-Activity
      </Button>
    </div>
  );
};

export default SubActivityList;
