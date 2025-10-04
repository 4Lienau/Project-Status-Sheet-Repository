import React from "react";
import { Button } from "@/components/ui/button";
import { Info, TextCursorInput } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useTruncatePreference } from "@/lib/hooks/useTruncatePreference";
import { sortActivitiesByDate } from "@/lib/utils/activitySorting";
import { ActivityRow } from "./ActivityRow";
import { useListManagement } from "./hooks/useListManagement";
import { SectionHeader } from "./SectionHeader";

interface NextPeriodActivitiesSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const NextPeriodActivitiesSection: React.FC<
  NextPeriodActivitiesSectionProps
> = ({ formData, setFormData }) => {
  const { truncateActivities, updateTruncatePreference } =
    useTruncatePreference();

  // Use the list management hook for activities
  const { updateItemByField, deleteItem, addItem } = useListManagement(
    formData.nextPeriodActivities,
    (updater) =>
      setFormData((prev) => ({
        ...prev,
        nextPeriodActivities: updater(prev.nextPeriodActivities),
      })),
  );

  // Handle updating individual activity fields
  const handleActivityUpdate = (
    originalIndex: number,
    field: string,
    value: string | number,
  ) => {
    updateItemByField(originalIndex, field as any, value);
  };

  // Handle deleting an activity
  const handleActivityDelete = (originalIndex: number) => {
    deleteItem(originalIndex);
  };

  // Handle adding a new activity
  const handleAddActivity = () => {
    addItem({
      description: "",
      date: new Date().toISOString().split("T")[0],
      completion: 0,
      assignee: "",
    });
  };

  // Sort activities by date while preserving original indices
  const sortedActivities = sortActivitiesByDate(formData.nextPeriodActivities);

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between mb-2 -mt-2">
        <div className="flex items-center gap-1">
          <h3 className="text-2xl font-bold text-foreground">
            Next Period Activities
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                List activities planned for the next reporting period, including
                dates, completion percentages, and assignees.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <TextCursorInput className="h-4 w-4 text-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Toggle whether activity descriptions should be truncated in the
                status sheet view.
              </p>
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center space-x-2">
            <Switch
              id="truncate-activities"
              checked={truncateActivities}
              onCheckedChange={updateTruncatePreference}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
            />
            <Label htmlFor="truncate-activities" className="text-sm text-foreground">
              Truncate activities in status sheet
            </Label>
          </div>
        </div>
      </div>
      <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border-4 border-border shadow-lg">
        {/* Column Headers */}
        <div className="grid grid-cols-[140px_1fr_80px_150px_auto] gap-2 items-start">
          <div className="font-medium text-sm text-primary">Date</div>
          <div className="font-medium text-sm text-primary">Activity</div>
          <div className="font-medium text-sm text-primary flex items-center gap-1 -ml-4">
            <span>% Complete</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">Color Status Guide:</p>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-100"></div>
                    <span>Blue: 100% complete</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-100"></div>
                    <span>Green: On track</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-100"></div>
                    <span>Yellow: Due within 5 days</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-100"></div>
                    <span>
                      Red: At risk - Past due, due within 1 day with &lt;80%
                      completion, or due within 2 days with &lt;40% completion
                    </span>
                  </li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="font-medium text-sm text-primary">Assignee</div>
          <div></div>
        </div>

        {/* Activity Rows */}
        {sortedActivities.map(({ item, originalIndex }) => (
          <ActivityRow
            key={originalIndex}
            item={item}
            originalIndex={originalIndex}
            onUpdate={(field, value) =>
              handleActivityUpdate(originalIndex, field, value)
            }
            onDelete={() => handleActivityDelete(originalIndex)}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddActivity}
          className="bg-card/50 backdrop-blur-sm border-border"
        >
          Add Activity
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default NextPeriodActivitiesSection;