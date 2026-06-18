import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronRight, ListChecks } from "lucide-react";
import UserSelectionInput from "@/components/ui/user-selection-input";
import { ProgressPill } from "@/components/ui/progress-pill";
import { Input } from "@/components/ui/input";
import { SubActivityList, SubActivity } from "./SubActivityList";

interface ActivityRowProps {
  item: {
    date: string;
    description: string;
    completion: number;
    assignee: string;
    sub_activities?: SubActivity[];
  };
  originalIndex: number;
  onUpdate: (field: string, value: string | number | SubActivity[]) => void;
  onDelete: () => void;
}

export const ActivityRow: React.FC<ActivityRowProps> = ({
  item,
  originalIndex,
  onUpdate,
  onDelete,
}) => {
  const [showSubActivities, setShowSubActivities] = useState(false);

  const subActivities: SubActivity[] = item.sub_activities || [];
  const hasSubActivities = subActivities.length > 0;

  const computedCompletion = hasSubActivities
    ? Math.round(
        subActivities.reduce((sum, sa) => sum + sa.completion, 0) /
          subActivities.length,
      )
    : item.completion;

  const handleSubActivitiesChange = (updated: SubActivity[]) => {
    const avg =
      updated.length > 0
        ? Math.round(updated.reduce((sum, sa) => sum + sa.completion, 0) / updated.length)
        : 0;
    onUpdate("sub_activities", updated);
    onUpdate("completion", avg);
  };

  return (
    <div>
      <div className="grid grid-cols-[140px_1fr_80px_150px_auto] gap-2 items-start">
        <Input
          type="date"
          value={item.date}
          onChange={(e) => onUpdate("date", e.target.value)}
          className="bg-card/50 backdrop-blur-sm border-border text-foreground dark:[color-scheme:dark]"
        />

        {/* Description + chevron + sub-activity indicator */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 shrink-0"
            onClick={() => setShowSubActivities((v) => !v)}
            title={showSubActivities ? "Collapse sub-activities" : "Expand sub-activities"}
          >
            {showSubActivities ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <div className="relative flex-1">
            <Input
              value={item.description}
              onChange={(e) => onUpdate("description", e.target.value)}
              placeholder="Enter activity"
              className="bg-card/50 backdrop-blur-sm border-border text-foreground"
            />
            {hasSubActivities && (
              <div
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary"
                title={`${subActivities.length} sub-activit${subActivities.length === 1 ? "y" : "ies"}`}
              >
                <ListChecks className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>

        {/* % Complete — read-only avg when sub-activities exist, editable otherwise */}
        <div className="flex flex-row items-center">
          {hasSubActivities ? (
            <div
              className="flex-1 h-9 flex items-center justify-center rounded-md border border-border bg-muted text-sm font-medium text-foreground cursor-default"
              title="Computed from sub-activities"
            >
              {computedCompletion}%
            </div>
          ) : (
            <div className="flex-1">
              <ProgressPill
                completion={item.completion}
                dueDate={item.date}
                onChange={(value) => onUpdate("completion", value)}
              />
            </div>
          )}
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

      {showSubActivities && (
        <SubActivityList
          subActivities={subActivities}
          defaultDate={item.date}
          defaultAssignee={item.assignee}
          onChange={handleSubActivitiesChange}
        />
      )}
    </div>
  );
};

export default ActivityRow;
