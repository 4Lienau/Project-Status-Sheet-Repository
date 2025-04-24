import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface NextPeriodActivitiesSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const ProgressPill: React.FC<{ completion: number; dueDate?: string }> = ({
  completion,
  dueDate,
}) => {
  // Determine color based on completion percentage and due date
  const getBackgroundColor = () => {
    // If task is complete, use green (not blue)
    if (completion === 100) return "bg-green-100 text-green-800";

    // If no due date, base on completion only
    if (!dueDate) {
      if (completion >= 50) return "bg-green-100 text-green-800";
      return "bg-yellow-100 text-yellow-800";
    }

    // Check if task is past due or due within 14 days
    const today = new Date();
    const dueDateTime = new Date(dueDate);
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);

    // If past due and not complete, use red
    if (dueDateTime < today && completion < 100) {
      return "bg-red-100 text-red-800";
    }

    // Check if task is at risk (due within 5 days)
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(today.getDate() + 5);

    if (dueDateTime <= fiveDaysFromNow && completion < 100) {
      return "bg-yellow-100 text-yellow-800";
    }

    // Otherwise, task is on track
    return "bg-green-100 text-green-800";
  };

  // Get the background and text color classes
  const colorClasses = getBackgroundColor();
  const bgColorClass = colorClasses.split(" ")[0];
  const textColorClass = colorClasses.split(" ")[1] || "";

  return (
    <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden relative">
      <div
        className={`h-full ${bgColorClass}`}
        style={{ width: `${completion}%` }}
      ></div>
      <div
        className={`absolute inset-0 flex items-center justify-center text-xs font-medium ${textColorClass}`}
      >
        {completion}%
      </div>
    </div>
  );
};

const NextPeriodActivitiesSection: React.FC<
  NextPeriodActivitiesSectionProps
> = ({ formData, setFormData }) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 mb-2 -mt-2">
        <h3 className="text-2xl font-bold text-blue-800">
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
      <div className="space-y-2 bg-white/80 backdrop-blur-sm rounded-md p-4 border border-gray-100 shadow-sm mt-0">
        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_140px_180px_150px_auto] gap-2 items-start">
          <div className="font-medium text-sm text-blue-800">Activity</div>
          <div className="font-medium text-sm text-blue-800">Date</div>
          <div className="font-medium text-sm text-blue-800">Completion %</div>
          <div className="font-medium text-sm text-blue-800">Assignee</div>
          <div></div>
        </div>
        {/* Create a sorted array with original indices */}
        {(() => {
          // Create array of [item, originalIndex] pairs
          const itemsWithIndices = formData.nextPeriodActivities.map(
            (item, index) => ({
              item,
              originalIndex: index,
            }),
          );

          // Sort by date
          const sortedItems = [...itemsWithIndices].sort((a, b) =>
            a.item.date.localeCompare(b.item.date),
          );

          // Render the sorted items
          return sortedItems.map(({ item, originalIndex }) => (
            <div
              key={originalIndex}
              className="grid grid-cols-[1fr_140px_180px_150px_auto] gap-2 items-start"
            >
              <Input
                value={item.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.map(
                      (a, i) =>
                        i === originalIndex
                          ? { ...a, description: e.target.value }
                          : a,
                    ),
                  }))
                }
                placeholder="Enter activity"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
              <Input
                type="date"
                value={item.date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.map(
                      (a, i) =>
                        i === originalIndex
                          ? { ...a, date: e.target.value }
                          : a,
                    ),
                  }))
                }
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
              <div className="flex flex-row items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={item.completion}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nextPeriodActivities: prev.nextPeriodActivities.map(
                        (a, i) =>
                          i === originalIndex
                            ? { ...a, completion: Number(e.target.value) }
                            : a,
                      ),
                    }))
                  }
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50 w-16 text-xs"
                />
                <div className="flex-1">
                  <ProgressPill
                    completion={item.completion}
                    dueDate={item.date}
                  />
                </div>
              </div>
              <Input
                value={item.assignee}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.map(
                      (a, i) =>
                        i === originalIndex
                          ? { ...a, assignee: e.target.value }
                          : a,
                    ),
                  }))
                }
                placeholder="Enter assignee"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.filter(
                      (_, i) => i !== originalIndex,
                    ),
                  }))
                }
                className="h-9 w-9 p-0"
              >
                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
              </Button>
            </div>
          ));
        })()}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              nextPeriodActivities: [
                ...prev.nextPeriodActivities,
                {
                  description: "",
                  date: new Date().toISOString().split("T")[0],
                  completion: 0,
                  assignee: "",
                },
              ],
            }))
          }
          className="bg-white/50 backdrop-blur-sm border-gray-200/50"
        >
          Add Activity
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default NextPeriodActivitiesSection;
